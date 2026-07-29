import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { VENUE } from "@/lib/venue";
import { EVENT, formatEventDate } from "@/lib/event";
import { parseDueDate } from "@/lib/dueDate";
import { recordAudit } from "@/lib/audit";
import { isUniqueViolation, isRecordNotFound } from "@/lib/prismaError";
import { importOrgaPlan } from "@/lib/orgaPlan";

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
  const members = await prisma.member.findMany();
  return members.find((member) => normalizePhone(member.phone) === target) ?? null;
}

type TaskWithRelations = {
  id: string;
  title: string;
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
  return "- " + parts.join(" · ");
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
    async () =>
      text(
        [
          `Festival: ${EVENT.name}`,
          `Termin: ${formatEventDate()}`,
          EVENT.lineupNote ? `Line-up: ${EVENT.lineupNote}` : null,
          `Location: ${VENUE.label}`,
          `Koordinaten: ${VENUE.latitude}, ${VENUE.longitude}`,
          `Karte: ${VENUE.googleMapsUrl}`,
        ]
          .filter(Boolean)
          .join("\n")
      )
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
        dueDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .describe("Fälligkeit als JJJJ-MM-TT"),
        estimatedCost: z.number().nonnegative().max(1000000).optional(),
        assignTo: z.string().optional().describe("Name eines Members oder Teams"),
      },
    },
    async ({ actor, title, category, dueDate, estimatedCost, assignTo }) => {
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

  return server;
}
