import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { VENUE } from "@/lib/venue";
import { formatEventDate, getEvent } from "@/lib/event";
import { parseDueDate } from "@/lib/dueDate";
import { recordAudit } from "@/lib/audit";
import { isUniqueViolation, isRecordNotFound } from "@/lib/prismaError";
import { importOrgaPlan } from "@/lib/orgaPlan";
import { sendToPhone } from "@/lib/openclaw";
import { formatSlotRange, formatTime, groupByStage, parseSlotTime } from "@/lib/timetable";

const statusLabels: Record<string, string> = {
  open: "offen",
  in_progress: "in Arbeit",
  done: "erledigt",
};

function text(value: string) {
  return { content: [{ type: "text" as const, text: value }] };
}

async function findMemberByPhone(phone: string) {
  const target = normalizePhone(phone);
  const members = await prisma.member.findMany({ where: { phone: { not: null } } });
  return members.find((member) => normalizePhone(member.phone!) === target) ?? null;
}

type TaskWithRelations = {
  id: string;
  title: string;
  description?: string | null;
  imagePath?: string | null;
  status: string;
  dueDate: Date | null;
  estimatedCost: unknown;
  actualCost: unknown;
  category: { name: string };
  member: { name: string } | null;
  team: { name: string } | null;
};

function formatTask(task: TaskWithRelations): string {
  const parts = [
    `[${task.id}] „${task.title}"`,
    `Kategorie: ${task.category.name}`,
    `Status: ${statusLabels[task.status] ?? task.status}`,
  ];
  if (task.dueDate) parts.push(`fällig ${task.dueDate.toISOString().slice(0, 10)}`);
  if (task.member) parts.push(`zugewiesen an ${task.member.name}`);
  else if (task.team) parts.push(`Team ${task.team.name}`);
  if (task.estimatedCost !== null) parts.push(`geplant ${Number(task.estimatedCost).toFixed(2)} €`);
  if (task.actualCost !== null) parts.push(`ausgegeben ${Number(task.actualCost).toFixed(2)} €`);
  if (task.imagePath) parts.push("mit Foto");
  const head = "- " + parts.join(" · ");
  // Die Beschreibung kommt auf eine eigene Zeile: In der Kopfzeile stehen die
  // Merkmale, mit denen man filtert und entscheidet. Ein Fließtext dazwischen
  // macht eine Liste aus zwanzig Aufgaben unlesbar.
  return task.description ? `${head}\n    ${task.description}` : head;
}

// Wer eine Änderung ausgelöst hat, meldet OpenClaw mit. Das ist ein Protokoll,
// keine Zugangskontrolle — die ist der MCP-Token. Genau deshalb steht hier auch
// keine Rechteprüfung: In der Orga-Gruppe darf jede Person Aufgaben pflegen,
// nachvollziehbar bleibt es über das Protokoll.
const actorSchema = z
  .string()
  .min(1)
  .max(120)
  .describe("Wer die Änderung angestoßen hat, z. B. der Telegram-Anzeigename");

// Zuweisung per Name auflösen: erst Member, dann Team. Eine Aufgabe hängt
// entweder an einer Person oder an einem Team, nie an beidem.
async function resolveAssignee(
  name: string
): Promise<{ memberId: string | null; teamId: string | null; label: string } | null> {
  const member = await prisma.member.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (member) return { memberId: member.id, teamId: null, label: member.name };

  const team = await prisma.team.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (team) return { memberId: null, teamId: team.id, label: `Team ${team.name}` };

  return null;
}

export function createMcpServer() {
  const server = new McpServer({ name: "festival-orga", version: "2.0.0" });

  // ----------------------------------------------------------------- Lesen ---

  server.registerTool(
    "get_festival_info",
    {
      title: "Festival-Infos abrufen",
      description: "Name, Termin, Line-up-Hinweis, Location und Kartenlink.",
      inputSchema: {},
    },
    async () => {
      const event = await getEvent();
      return text(
        [
          `Festival: ${event.name}`,
          `Termin: ${formatEventDate(event.startsAt)}`,
          event.lineupNote ? `Line-up: ${event.lineupNote}` : null,
          `Location: ${VENUE.label}`,
          `Koordinaten: ${VENUE.latitude}, ${VENUE.longitude}`,
          `Karte: ${VENUE.googleMapsUrl}`,
        ]
          .filter(Boolean)
          .join("\n")
      );
    }
  );

  server.registerTool(
    "list_categories",
    {
      title: "Kategorien auflisten",
      description:
        "Alle Aufgaben-Kategorien mit Anzahl der Aufgaben sowie geplanten und tatsächlichen Kosten.",
      inputSchema: {},
    },
    async () => {
      const categories = await prisma.budgetCategory.findMany({
        orderBy: { sortOrder: "asc" },
        include: { tasks: true },
      });

      if (categories.length === 0) return text("Noch keine Kategorien angelegt.");

      const lines = categories.map((category) => {
        const planned = category.tasks.reduce(
          (sum, task) => sum + Number(task.estimatedCost ?? 0),
          0
        );
        const spent = category.tasks.reduce((sum, task) => sum + Number(task.actualCost ?? 0), 0);
        const open = category.tasks.filter((task) => task.status !== "done").length;
        return `- ${category.name}: ${category.tasks.length} Aufgaben (${open} offen), geplant ${planned.toFixed(2)} €, ausgegeben ${spent.toFixed(2)} €`;
      });

      return text(lines.join("\n"));
    }
  );

  server.registerTool(
    "list_tasks",
    {
      title: "Aufgaben auflisten",
      description:
        "Aufgaben mit Filtern. Ohne Filter kommen alle. Die ID aus der Ausgabe wird für Änderungen gebraucht.",
      inputSchema: {
        category: z.string().optional().describe("Kategoriename, exakt oder Teilstring"),
        status: z.enum(["open", "in_progress", "done"]).optional(),
        assignee: z.string().optional().describe("Name eines Members oder Teams"),
        overdueOnly: z
          .boolean()
          .optional()
          .describe("Nur Aufgaben, deren Fälligkeit überschritten ist und die nicht erledigt sind"),
      },
    },
    async ({ category, status, assignee, overdueOnly }) => {
      const tasks = await prisma.task.findMany({
        where: {
          ...(status ? { status } : {}),
          ...(category ? { category: { name: { contains: category, mode: "insensitive" } } } : {}),
          ...(assignee
            ? {
                OR: [
                  { member: { name: { contains: assignee, mode: "insensitive" } } },
                  { team: { name: { contains: assignee, mode: "insensitive" } } },
                ],
              }
            : {}),
          ...(overdueOnly ? { dueDate: { lt: new Date() }, status: { not: "done" } } : {}),
        },
        include: { category: true, member: true, team: true },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
        take: 200,
      });

      if (tasks.length === 0) return text("Keine Aufgaben gefunden.");
      return text(tasks.map(formatTask).join("\n"));
    }
  );

  server.registerTool(
    "get_my_tasks",
    {
      title: "Eigene Aufgaben abrufen",
      description:
        "Aufgaben, die einem Member direkt oder über sein Team zugewiesen sind. Identifiziert per Telefonnummer.",
      inputSchema: { phone: z.string().describe("Telefonnummer des Members, E.164") },
    },
    async ({ phone }) => {
      const member = await findMemberByPhone(phone);
      if (!member) return text("Diese Nummer ist keinem Member zugeordnet.");

      const tasks = await prisma.task.findMany({
        where: {
          OR: [{ memberId: member.id }, ...(member.teamId ? [{ teamId: member.teamId }] : [])],
        },
        include: { category: true, member: true, team: true },
        orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
      });

      if (tasks.length === 0) return text(`${member.name} hat aktuell keine Aufgaben.`);
      return text(tasks.map(formatTask).join("\n"));
    }
  );

  server.registerTool(
    "list_members",
    {
      title: "Members und Teams auflisten",
      description: "Wer gehört zur Orga und in welchem Team. Ohne Telefonnummern.",
      inputSchema: {},
    },
    async () => {
      const members = await prisma.member.findMany({
        orderBy: { name: "asc" },
        include: { team: true },
      });
      if (members.length === 0) return text("Noch keine Members angelegt.");
      return text(
        members
          .map((member) => `- ${member.name}${member.team ? ` (Team ${member.team.name})` : ""}`)
          .join("\n")
      );
    }
  );

  server.registerTool(
    "get_budget",
    {
      title: "Budget abrufen",
      description: "Eingegangene Unterstützung, geplante und tatsächliche Ausgaben, Kassenstand.",
      inputSchema: {},
    },
    async () => {
      const [payments, categories] = await Promise.all([
        prisma.payment.findMany({ where: { status: "completed" } }),
        prisma.budgetCategory.findMany({ include: { tasks: true } }),
      ]);

      const income = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const planned = categories.reduce(
        (sum, category) =>
          sum + category.tasks.reduce((s, task) => s + Number(task.estimatedCost ?? 0), 0),
        0
      );
      const spent = categories.reduce(
        (sum, category) =>
          sum + category.tasks.reduce((s, task) => s + Number(task.actualCost ?? 0), 0),
        0
      );

      return text(
        [
          `Eingegangen: ${income.toFixed(2)} € aus ${payments.length} Beiträgen`,
          `Geplante Ausgaben: ${planned.toFixed(2)} €`,
          `Tatsächliche Ausgaben: ${spent.toFixed(2)} €`,
          `Kassenstand: ${(income - spent).toFixed(2)} €`,
        ].join("\n")
      );
    }
  );

  // Bewusst nur Zahlen. Namen und E-Mail-Adressen von Gästen gehören nicht in
  // einen Gruppenchat — was dort einmal steht, ist nicht mehr einzufangen.
  // Die Liste mit Namen gibt es im Admin und als CSV-Export.
  server.registerTool(
    "get_guest_stats",
    {
      title: "Gästezahlen abrufen",
      description:
        "Anzahl Zusagen, Gesamtpersonen inklusive Begleitung und Warteliste. Enthält bewusst keine Namen und keine E-Mail-Adressen — die stehen nur im Admin.",
      inputSchema: {},
    },
    async () => {
      const guests = await prisma.guest.findMany({
        select: { plusOnes: true, waitlisted: true, paymentStatus: true },
      });

      const confirmed = guests.filter((guest) => !guest.waitlisted);
      const waitlist = guests.filter((guest) => guest.waitlisted);
      const heads = (list: typeof guests) =>
        list.reduce((sum, guest) => sum + 1 + guest.plusOnes, 0);
      const supporters = confirmed.filter(
        (guest) => guest.paymentStatus === "paid" || guest.paymentStatus === "cash_pending"
      ).length;

      return text(
        [
          `Zusagen: ${confirmed.length} Anmeldungen, ${heads(confirmed)} Personen inklusive Begleitung`,
          `Warteliste: ${waitlist.length} Anmeldungen, ${heads(waitlist)} Personen`,
          `Davon haben ${supporters} etwas beigesteuert oder Bar zugesagt`,
        ].join("\n")
      );
    }
  );

  server.registerTool(
    "list_recent_changes",
    {
      title: "Letzte Änderungen abrufen",
      description:
        "Wer hat zuletzt was geändert — aus Admin und Chat zusammen. Hilfreich, wenn sich jemand wundert, warum ein Eintrag anders aussieht.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Wie viele Einträge, Standard 15"),
      },
    },
    async ({ limit }) => {
      const entries = await prisma.auditEntry.findMany({
        orderBy: { at: "desc" },
        take: limit ?? 15,
      });
      if (entries.length === 0) return text("Noch keine Änderungen protokolliert.");
      return text(
        entries
          .map(
            (entry) =>
              `- ${entry.at.toISOString().slice(0, 16).replace("T", " ")} · ${entry.actor} (${entry.source}): ${entry.summary}`
          )
          .join("\n")
      );
    }
  );

  // ------------------------------------------------------------- Schreiben ---

  server.registerTool(
    "create_task",
    {
      title: "Aufgabe anlegen",
      description:
        "Legt eine Aufgabe an. Die Kategorie wird am Namen gesucht und bei Bedarf neu angelegt. Titel sind je Kategorie eindeutig.",
      inputSchema: {
        actor: actorSchema,
        title: z.string().trim().min(1).max(200),
        category: z.string().trim().min(1).max(100).describe("Name der Kategorie"),
        description: z
          .string()
          .trim()
          .max(2000)
          .optional()
          .describe(
            "Was zur Aufgabe sonst noch wichtig ist — Maße, Ansprechpartner, Fundort. Der Titel bleibt kurz."
          ),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Fälligkeit als JJJJ-MM-TT"),
        estimatedCost: z.number().nonnegative().max(1000000).optional(),
        assignTo: z.string().optional().describe("Name eines Members oder Teams"),
      },
    },
    async ({ actor, title, category, description, dueDate, estimatedCost, assignTo }) => {
      let categoryRecord = await prisma.budgetCategory.findFirst({
        where: { name: { equals: category, mode: "insensitive" } },
      });

      if (!categoryRecord) {
        const count = await prisma.budgetCategory.count();
        try {
          categoryRecord = await prisma.budgetCategory.create({
            data: { name: category, sortOrder: count },
          });
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          categoryRecord = await prisma.budgetCategory.findFirstOrThrow({
            where: { name: { equals: category, mode: "insensitive" } },
          });
        }
      }

      const assignment = assignTo ? await resolveAssignee(assignTo) : null;
      if (assignTo && !assignment) {
        return text(`„${assignTo}" ist weder ein Member noch ein Team. Aufgabe nicht angelegt.`);
      }

      try {
        const task = await prisma.task.create({
          data: {
            categoryId: categoryRecord.id,
            title,
            description: description || null,
            dueDate: parseDueDate(dueDate),
            estimatedCost: estimatedCost ?? null,
            memberId: assignment?.memberId ?? null,
            teamId: assignment?.teamId ?? null,
          },
        });

        await recordAudit({
          source: "chat",
          actor,
          action: "task.create",
          entity: "Task",
          entityId: task.id,
          summary: `„${title}" in „${categoryRecord.name}" angelegt`,
        });

        return text(
          `Angelegt: „${title}" in „${categoryRecord.name}" (ID ${task.id}).${
            assignment ? ` Zugewiesen an ${assignment.label}.` : ""
          }`
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          return text(
            `In „${categoryRecord.name}" gibt es „${title}" schon. Ich habe nichts angelegt — nutze update_task, wenn du sie ändern willst.`
          );
        }
        throw error;
      }
    }
  );

  server.registerTool(
    "update_task",
    {
      title: "Aufgabe ändern",
      description:
        "Ändert Status, Fälligkeit, Kosten oder Zuweisung einer Aufgabe. Nur die angegebenen Felder werden angefasst.",
      inputSchema: {
        actor: actorSchema,
        taskId: z.string().describe("ID aus list_tasks"),
        status: z.enum(["open", "in_progress", "done"]).optional(),
        description: z
          .string()
          .trim()
          .max(2000)
          .optional()
          .describe("Neue Beschreibung. Leerer Text entfernt die vorhandene."),
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Fälligkeit als JJJJ-MM-TT"),
        clearDueDate: z.boolean().optional().describe("Setzt die Fälligkeit zurück"),
        estimatedCost: z.number().nonnegative().max(1000000).optional(),
        actualCost: z.number().nonnegative().max(1000000).optional(),
        assignTo: z.string().optional().describe("Name eines Members oder Teams"),
      },
    },
    async ({
      actor,
      taskId,
      status,
      description,
      dueDate,
      clearDueDate,
      estimatedCost,
      actualCost,
      assignTo,
    }) => {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return text("Aufgabe nicht gefunden. Hol dir die aktuelle Liste mit list_tasks.");

      const assignment = assignTo ? await resolveAssignee(assignTo) : null;
      if (assignTo && !assignment) {
        return text(`„${assignTo}" ist weder ein Member noch ein Team. Nichts geändert.`);
      }

      const changes: string[] = [];
      if (status !== undefined && status !== task.status) {
        changes.push(`Status → ${statusLabels[status]}`);
      }
      if (description !== undefined) {
        changes.push(description ? "Beschreibung geändert" : "Beschreibung entfernt");
      }
      if (clearDueDate) changes.push("Fälligkeit entfernt");
      else if (dueDate !== undefined) changes.push(`fällig → ${dueDate}`);
      if (estimatedCost !== undefined) changes.push(`geplant → ${estimatedCost.toFixed(2)} €`);
      if (actualCost !== undefined) changes.push(`ausgegeben → ${actualCost.toFixed(2)} €`);
      if (assignment) changes.push(`zugewiesen an ${assignment.label}`);

      if (changes.length === 0) return text("Nichts zu ändern — es war kein Feld angegeben.");

      await prisma.task.update({
        where: { id: taskId },
        data: {
          ...(status !== undefined ? { status } : {}),
          ...(description !== undefined ? { description: description || null } : {}),
          ...(clearDueDate
            ? { dueDate: null }
            : dueDate !== undefined
              ? { dueDate: parseDueDate(dueDate) }
              : {}),
          ...(estimatedCost !== undefined ? { estimatedCost } : {}),
          ...(actualCost !== undefined ? { actualCost } : {}),
          ...(assignment ? { memberId: assignment.memberId, teamId: assignment.teamId } : {}),
        },
      });

      await recordAudit({
        source: "chat",
        actor,
        action: "task.update",
        entity: "Task",
        entityId: taskId,
        summary: `„${task.title}": ${changes.join(", ")}`,
      });

      return text(`„${task.title}" aktualisiert: ${changes.join(", ")}.`);
    }
  );

  server.registerTool(
    "delete_task",
    {
      title: "Aufgabe löschen",
      description:
        "Löscht eine Aufgabe endgültig. Zur Sicherheit muss der exakte Titel mitgegeben werden — so löscht eine falsch verstandene ID nicht den falschen Eintrag. Für erledigte Aufgaben ist update_task mit status=done fast immer das Richtige.",
      inputSchema: {
        actor: actorSchema,
        taskId: z.string(),
        confirmTitle: z.string().describe("Exakter Titel der Aufgabe, wie in list_tasks"),
      },
    },
    async ({ actor, taskId, confirmTitle }) => {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) return text("Aufgabe nicht gefunden.");

      if (task.title.trim() !== confirmTitle.trim()) {
        return text(
          `Titel stimmt nicht überein: Aufgabe ${taskId} heißt „${task.title}", bestätigt wurde „${confirmTitle}". Nichts gelöscht.`
        );
      }

      try {
        await prisma.task.delete({ where: { id: taskId } });
      } catch (error) {
        if (isRecordNotFound(error)) return text("Aufgabe war schon gelöscht.");
        throw error;
      }

      await recordAudit({
        source: "chat",
        actor,
        action: "task.delete",
        entity: "Task",
        entityId: taskId,
        summary: `„${task.title}" gelöscht`,
      });

      return text(`„${task.title}" ist gelöscht.`);
    }
  );

  server.registerTool(
    "import_orga_plan",
    {
      title: "Orga-Plan einspielen",
      description:
        "Legt den abgestimmten Orga-Plan als Kategorien und Aufgaben an. Wiederholbar — ergänzt nur, was fehlt.",
      inputSchema: { actor: actorSchema },
    },
    async ({ actor }) => {
      const result = await importOrgaPlan(prisma);

      if (result.createdCategories === 0 && result.createdTasks === 0) {
        return text("Der Plan steht schon vollständig drin — nichts hinzugefügt.");
      }

      await recordAudit({
        source: "chat",
        actor,
        action: "plan.import",
        entity: "BudgetCategory",
        summary: `Orga-Plan eingespielt: ${result.createdCategories} Kategorien, ${result.createdTasks} Aufgaben`,
      });

      return text(
        `Eingespielt: ${result.createdCategories} Kategorien und ${result.createdTasks} Aufgaben.`
      );
    }
  );

  server.registerTool(
    "create_team",
    {
      title: "Team anlegen",
      description:
        "Legt ein Team an, z. B. Bar oder Aufbau. Gibt es das Team schon, wird nichts angelegt und das vorhandene gemeldet.",
      inputSchema: {
        actor: actorSchema,
        name: z.string().min(1).max(100).describe("Name des Teams"),
      },
    },
    async ({ actor, name }) => {
      const trimmed = name.trim();
      if (!trimmed) return text("Ein Team braucht einen Namen.");

      const existing = await prisma.team.findFirst({
        where: { name: { equals: trimmed, mode: "insensitive" } },
      });
      if (existing) return text(`Team „${existing.name}" gibt es schon.`);

      const team = await prisma.team.create({ data: { name: trimmed } });

      await recordAudit({
        source: "chat",
        actor,
        action: "team.create",
        entity: "Team",
        entityId: team.id,
        summary: `Team „${team.name}" angelegt`,
      });

      return text(`Team „${team.name}" ist angelegt.`);
    }
  );

  server.registerTool(
    "create_member",
    {
      title: "Member anlegen",
      description:
        "Nimmt eine Person in die Orga auf. Die Telefonnummer ist freiwillig — ohne sie lassen sich Aufgaben zuweisen, aber keine Einzelnachrichten schicken. Ein noch nicht vorhandenes Team wird mit angelegt.",
      inputSchema: {
        actor: actorSchema,
        name: z.string().min(1).max(100).describe("Name der Person"),
        phone: z
          .string()
          .max(30)
          .optional()
          .describe("Telefonnummer, am besten mit Ländervorwahl. Weglassen, wenn unbekannt."),
        team: z.string().max(100).optional().describe("Team, in das die Person kommt"),
      },
    },
    async ({ actor, name, phone, team }) => {
      const trimmed = name.trim();
      if (!trimmed) return text("Ein Member braucht einen Namen.");

      // Namen sind überall die Kennung — beim Zuweisen von Aufgaben, beim
      // Ändern, beim Broadcast. Zwei gleiche Namen machen jede davon
      // mehrdeutig, deshalb hier abbrechen statt raten.
      const existing = await prisma.member.findFirst({
        where: { name: { equals: trimmed, mode: "insensitive" } },
      });
      if (existing) {
        return text(
          `„${existing.name}" ist schon in der Orga. Für eine zweite Person mit gleichem Namen bitte einen unterscheidbaren Namen nehmen, z. B. „${existing.name} K.".`
        );
      }

      let teamId: string | null = null;
      let teamNote = "";
      if (team?.trim()) {
        const wanted = team.trim();
        const found = await prisma.team.findFirst({
          where: { name: { equals: wanted, mode: "insensitive" } },
        });
        if (found) {
          teamId = found.id;
          teamNote = `, Team ${found.name}`;
        } else {
          const created = await prisma.team.create({ data: { name: wanted } });
          teamId = created.id;
          teamNote = `, Team ${created.name} neu angelegt`;
        }
      }

      const member = await prisma.member.create({
        data: { name: trimmed, phone: phone?.trim() || null, teamId },
      });

      await recordAudit({
        source: "chat",
        actor,
        action: "member.create",
        entity: "Member",
        entityId: member.id,
        summary: `Member „${member.name}" angelegt${teamNote}`,
      });

      const missingPhone = member.phone
        ? ""
        : " Ohne Telefonnummer bekommt die Person keine Einzelnachrichten und kann ihre Aufgaben nicht per Nummer abrufen.";
      return text(`„${member.name}" ist in der Orga${teamNote}.${missingPhone}`);
    }
  );

  server.registerTool(
    "update_member",
    {
      title: "Member ändern",
      description:
        "Ändert Name, Telefonnummer oder Team einer Person. Nur die mitgegebenen Felder werden angefasst. Soll die Person aus ihrem Team raus, team auf einen leeren Text setzen.",
      inputSchema: {
        actor: actorSchema,
        name: z.string().min(1).max(100).describe("Aktueller Name der Person"),
        newName: z.string().max(100).optional().describe("Neuer Name"),
        phone: z
          .string()
          .max(30)
          .optional()
          .describe("Neue Telefonnummer. Leerer Text entfernt die vorhandene."),
        team: z
          .string()
          .max(100)
          .optional()
          .describe("Neues Team. Leerer Text nimmt die Person aus ihrem Team."),
      },
    },
    async ({ actor, name, newName, phone, team }) => {
      const members = await prisma.member.findMany({
        where: { name: { equals: name.trim(), mode: "insensitive" } },
      });
      if (members.length === 0) return text(`„${name}" ist nicht in der Orga.`);
      if (members.length > 1) {
        return text(
          `Es gibt ${members.length} Personen namens „${name}". Das lässt sich hier nicht auseinanderhalten — bitte im Admin ändern.`
        );
      }
      const member = members[0];

      const changes: string[] = [];
      const data: { name?: string; phone?: string | null; teamId?: string | null } = {};

      if (newName?.trim() && newName.trim() !== member.name) {
        const clash = await prisma.member.findFirst({
          where: { name: { equals: newName.trim(), mode: "insensitive" } },
        });
        if (clash) return text(`„${clash.name}" gibt es schon. Name nicht geändert.`);
        data.name = newName.trim();
        changes.push(`heißt jetzt „${data.name}"`);
      }

      if (phone !== undefined) {
        data.phone = phone.trim() || null;
        changes.push(data.phone ? `Nummer ${data.phone}` : "Nummer entfernt");
      }

      if (team !== undefined) {
        if (!team.trim()) {
          data.teamId = null;
          changes.push("aus dem Team genommen");
        } else {
          const wanted = team.trim();
          const found = await prisma.team.findFirst({
            where: { name: { equals: wanted, mode: "insensitive" } },
          });
          const target = found ?? (await prisma.team.create({ data: { name: wanted } }));
          data.teamId = target.id;
          changes.push(`Team ${target.name}${found ? "" : " (neu angelegt)"}`);
        }
      }

      if (changes.length === 0) return text("Nichts angegeben, was zu ändern wäre.");

      const updated = await prisma.member.update({ where: { id: member.id }, data });

      await recordAudit({
        source: "chat",
        actor,
        action: "member.update",
        entity: "Member",
        entityId: member.id,
        summary: `„${member.name}": ${changes.join(", ")}`,
      });

      return text(`${updated.name}: ${changes.join(", ")}.`);
    }
  );

  // Die Nummer wird hier aufgelöst und direkt ans Gateway gegeben — sie taucht
  // in keiner Antwort auf. So kann der Chat jemanden einzeln anschreiben, ohne
  // dass Telefonnummern in der Gruppe landen.
  server.registerTool(
    "send_message_to_member",
    {
      title: "Nachricht an eine Person schicken",
      description:
        "Schickt einer Person aus der Orga eine Einzelnachricht über WhatsApp. Die Person wird am Namen gesucht; ihre Telefonnummer bleibt hier unsichtbar.",
      inputSchema: {
        actor: actorSchema,
        name: z.string().min(1).max(100).describe("Name der Person, wie in list_members"),
        message: z.string().trim().min(1).max(2000).describe("Text der Nachricht"),
      },
    },
    async ({ actor, name, message }) => {
      const members = await prisma.member.findMany({
        where: { name: { equals: name.trim(), mode: "insensitive" } },
      });
      if (members.length === 0) return text(`„${name}" ist nicht in der Orga.`);
      if (members.length > 1) {
        return text(
          `Es gibt ${members.length} Personen namens „${name}". Bitte den Namen eindeutiger angeben.`
        );
      }

      const member = members[0];
      if (!member.phone) {
        return text(
          `Für „${member.name}" ist keine Telefonnummer hinterlegt — ohne sie geht keine Einzelnachricht.`
        );
      }

      const result = await sendToPhone(member.phone, message);
      if (!result.ok) {
        return text(`Konnte „${member.name}" nicht erreichen: ${result.error}`);
      }

      await recordAudit({
        source: "chat",
        actor,
        action: "member.message",
        entity: "Member",
        entityId: member.id,
        summary: `Nachricht an „${member.name}" geschickt`,
      });

      return text(`Nachricht an „${member.name}" ist raus.`);
    }
  );

  // ------------------------------------------------------------- Zeitplan ---

  server.registerTool(
    "list_timetable",
    {
      title: "Zeitplan lesen",
      description:
        "Wer spielt wann und wo. Nach Bühne gruppiert, innerhalb einer Bühne der Reihe nach.",
      inputSchema: {
        stage: z.string().max(60).optional().describe("Nur diese Bühne, z. B. DJ"),
      },
    },
    async ({ stage }) => {
      const [slots, event] = await Promise.all([
        prisma.timetableSlot.findMany({
          where: stage ? { stage: { equals: stage.trim(), mode: "insensitive" } } : undefined,
          orderBy: { startsAt: "asc" },
        }),
        getEvent(),
      ]);

      if (slots.length === 0) {
        return text(stage ? `Für „${stage}" steht noch nichts im Plan.` : "Der Zeitplan ist leer.");
      }

      const lines = groupByStage(slots).map((group) => {
        const entries = group.slots.map((slot) => {
          const parts = [`  ${formatSlotRange(slot, event.startsAt)} — ${slot.title}`];
          if (slot.note) parts.push(`(${slot.note})`);
          // Interne Punkte sind im Chat sichtbar, auf der Einladung nicht. Ohne
          // die Kennzeichnung sagt der Bot etwas zu, was kein Gast sieht.
          if (!slot.isPublic) parts.push("[nur intern]");
          return parts.join(" ");
        });
        return `${group.stage}:\n${entries.join("\n")}`;
      });

      return text(lines.join("\n\n"));
    }
  );

  server.registerTool(
    "create_timetable_slot",
    {
      title: "Programmpunkt in den Zeitplan aufnehmen",
      description:
        "Trägt einen Act oder Programmpunkt ein. Die Uhrzeit darf einfach „22:00\" sein — der Tag des Fests wird ergänzt, Zeiten vor 6 Uhr zählen zur Nacht danach.",
      inputSchema: {
        actor: actorSchema,
        title: z.string().trim().min(1).max(120).describe("Act oder Programmpunkt"),
        stage: z.string().trim().min(1).max(60).describe("Bühne oder Area, z. B. DJ"),
        startsAt: z.string().min(1).max(30).describe("Beginn, z. B. 22:00 oder 2026-08-29T22:00"),
        endsAt: z.string().max(30).optional().describe("Ende, gleiche Schreibweise"),
        note: z.string().trim().max(300).optional().describe("Notiz, z. B. braucht CDJs"),
        isPublic: z
          .boolean()
          .optional()
          .describe("Auf der Einladung zeigen. Standard: ja. Aufbau und Abbau auf nein setzen."),
      },
    },
    async ({ actor, title, stage, startsAt, endsAt, note, isPublic }) => {
      const event = await getEvent();

      const start = parseSlotTime(startsAt, event.startsAt);
      if (!start) {
        return text(
          `„${startsAt}" konnte ich nicht als Zeitpunkt lesen. Geht z. B. als „22:00" oder „2026-08-29T22:00".`
        );
      }

      const end = endsAt ? parseSlotTime(endsAt, event.startsAt) : null;
      if (endsAt && !end) {
        return text(`„${endsAt}" konnte ich nicht als Zeitpunkt lesen.`);
      }
      if (end && end <= start) {
        return text("Das Ende liegt vor dem Beginn — bitte nochmal ansehen.");
      }

      try {
        const slot = await prisma.timetableSlot.create({
          data: {
            title,
            stage,
            startsAt: start,
            endsAt: end,
            note: note?.trim() || null,
            isPublic: isPublic ?? true,
          },
        });

        await recordAudit({
          source: "chat",
          actor,
          action: "timetable.create",
          entity: "TimetableSlot",
          entityId: slot.id,
          summary: `„${title}" um ${formatTime(start)} auf ${stage} in den Zeitplan aufgenommen`,
        });

        return text(
          `Eingetragen: „${title}" auf ${stage}, ${formatSlotRange(slot, event.startsAt)}.` +
            (slot.isPublic ? "" : " Steht nur intern, nicht auf der Einladung.")
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          return text(
            `Auf ${stage} steht um ${formatTime(start)} schon etwas im Plan. Mit update_timetable_slot ändern oder eine andere Zeit nehmen.`
          );
        }
        throw error;
      }
    }
  );

  server.registerTool(
    "update_timetable_slot",
    {
      title: "Programmpunkt ändern",
      description:
        "Ändert einen Punkt im Zeitplan. Gesucht wird über Bühne und Beginn — also so, wie er im Plan steht. Nur was angegeben wird, ändert sich.",
      inputSchema: {
        actor: actorSchema,
        stage: z.string().trim().min(1).max(60).describe("Bühne, auf der der Punkt steht"),
        startsAt: z.string().min(1).max(30).describe("Bisheriger Beginn, z. B. 22:00"),
        newTitle: z.string().trim().min(1).max(120).optional(),
        newStage: z.string().trim().min(1).max(60).optional(),
        newStartsAt: z.string().max(30).optional(),
        // Leerer String löscht das Ende — beim letzten Act der Nacht steht es
        // oft erst spät fest und manchmal gar nicht.
        newEndsAt: z.string().max(30).optional().describe("Leerer Text entfernt das Ende"),
        newNote: z.string().max(300).optional().describe("Leerer Text entfernt die Notiz"),
        isPublic: z.boolean().optional(),
      },
    },
    async ({ actor, stage, startsAt, newTitle, newStage, newStartsAt, newEndsAt, newNote, isPublic }) => {
      const event = await getEvent();

      const start = parseSlotTime(startsAt, event.startsAt);
      if (!start) return text(`„${startsAt}" konnte ich nicht als Zeitpunkt lesen.`);

      const existing = await prisma.timetableSlot.findFirst({
        where: { stage: { equals: stage.trim(), mode: "insensitive" }, startsAt: start },
      });
      if (!existing) {
        return text(
          `Auf ${stage} steht um ${formatTime(start)} nichts im Plan. list_timetable zeigt, was da ist.`
        );
      }

      const data: {
        title?: string;
        stage?: string;
        startsAt?: Date;
        endsAt?: Date | null;
        note?: string | null;
        isPublic?: boolean;
      } = {};

      if (newTitle !== undefined) data.title = newTitle;
      if (newStage !== undefined) data.stage = newStage;
      if (newNote !== undefined) data.note = newNote.trim() || null;
      if (isPublic !== undefined) data.isPublic = isPublic;

      if (newStartsAt !== undefined && newStartsAt.trim() !== "") {
        const parsed = parseSlotTime(newStartsAt, event.startsAt);
        if (!parsed) return text(`„${newStartsAt}" konnte ich nicht als Zeitpunkt lesen.`);
        data.startsAt = parsed;
      }

      if (newEndsAt !== undefined) {
        if (newEndsAt.trim() === "") {
          data.endsAt = null;
        } else {
          const parsed = parseSlotTime(newEndsAt, event.startsAt);
          if (!parsed) return text(`„${newEndsAt}" konnte ich nicht als Zeitpunkt lesen.`);
          data.endsAt = parsed;
        }
      }

      // Gegen den Stand nach der Änderung prüfen, nicht gegen die Eingabe: Wer
      // nur den Beginn verschiebt, soll nicht hinter dem alten Ende landen.
      const effectiveStart = data.startsAt ?? existing.startsAt;
      const effectiveEnd = data.endsAt !== undefined ? data.endsAt : existing.endsAt;
      if (effectiveEnd && effectiveEnd <= effectiveStart) {
        return text("Das Ende läge damit vor dem Beginn — bitte nochmal ansehen.");
      }

      try {
        const slot = await prisma.timetableSlot.update({ where: { id: existing.id }, data });

        await recordAudit({
          source: "chat",
          actor,
          action: "timetable.update",
          entity: "TimetableSlot",
          entityId: slot.id,
          summary: `Zeitplan geändert: „${slot.title}" um ${formatTime(slot.startsAt)} auf ${slot.stage}`,
        });

        return text(
          `Geändert: „${slot.title}" auf ${slot.stage}, ${formatSlotRange(slot, event.startsAt)}.`
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          return text("Auf dieser Bühne steht zu der Uhrzeit schon etwas im Plan.");
        }
        throw error;
      }
    }
  );

  server.registerTool(
    "delete_timetable_slot",
    {
      title: "Programmpunkt aus dem Zeitplan nehmen",
      description: "Entfernt einen Punkt. Gesucht wird über Bühne und Beginn.",
      inputSchema: {
        actor: actorSchema,
        stage: z.string().trim().min(1).max(60).describe("Bühne, auf der der Punkt steht"),
        startsAt: z.string().min(1).max(30).describe("Beginn, z. B. 22:00"),
      },
    },
    async ({ actor, stage, startsAt }) => {
      const event = await getEvent();

      const start = parseSlotTime(startsAt, event.startsAt);
      if (!start) return text(`„${startsAt}" konnte ich nicht als Zeitpunkt lesen.`);

      const existing = await prisma.timetableSlot.findFirst({
        where: { stage: { equals: stage.trim(), mode: "insensitive" }, startsAt: start },
      });
      if (!existing) {
        return text(`Auf ${stage} steht um ${formatTime(start)} nichts im Plan.`);
      }

      try {
        await prisma.timetableSlot.delete({ where: { id: existing.id } });
      } catch (error) {
        if (isRecordNotFound(error)) return text("Der Punkt war schon weg.");
        throw error;
      }

      await recordAudit({
        source: "chat",
        actor,
        action: "timetable.delete",
        entity: "TimetableSlot",
        entityId: existing.id,
        summary: `„${existing.title}" um ${formatTime(existing.startsAt)} aus dem Zeitplan entfernt`,
      });

      return text(`„${existing.title}" ist aus dem Zeitplan raus.`);
    }
  );

  return server;
}
