import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { VENUE } from "@/lib/venue";

const statusLabels: Record<string, string> = {
  open: "offen",
  in_progress: "in Arbeit",
  done: "erledigt",
};

async function findMemberByPhone(phone: string) {
  const target = normalizePhone(phone);
  const members = await prisma.member.findMany();
  return members.find((member) => normalizePhone(member.phone) === target) ?? null;
}

export function createMcpServer() {
  const server = new McpServer({ name: "festival-tasks", version: "1.0.0" });

  server.registerTool(
    "get_my_tasks",
    {
      title: "Eigene Aufgaben abrufen",
      description:
        "Gibt die Aufgaben zurück, die dem Anrufer (per Telefonnummer identifiziert) direkt oder über sein Team zugewiesen sind.",
      inputSchema: { phone: z.string().describe("Telefonnummer des anfragenden Members, E.164") },
    },
    async ({ phone }) => {
      const member = await findMemberByPhone(phone);
      if (!member) {
        return {
          content: [{ type: "text", text: "Diese Nummer ist keinem Member zugeordnet." }],
        };
      }

      const tasks = await prisma.task.findMany({
        where: {
          OR: [{ memberId: member.id }, ...(member.teamId ? [{ teamId: member.teamId }] : [])],
        },
        include: { category: true },
        orderBy: { createdAt: "asc" },
      });

      if (tasks.length === 0) {
        return { content: [{ type: "text", text: `${member.name} hat aktuell keine Aufgaben.` }] };
      }

      const lines = tasks.map(
        (task) =>
          `- [${task.id}] "${task.title}" (${task.category.name}) — ${statusLabels[task.status]}${
            task.dueDate ? ` — fällig am ${task.dueDate.toISOString().slice(0, 10)}` : ""
          }`
      );
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.registerTool(
    "update_task_status",
    {
      title: "Aufgaben-Status aktualisieren",
      description:
        "Setzt den Status einer Aufgabe. Nur erlaubt, wenn die Aufgabe dem Anrufer direkt oder seinem Team zugewiesen ist.",
      inputSchema: {
        phone: z.string().describe("Telefonnummer des anfragenden Members, E.164"),
        taskId: z.string().describe("ID der Aufgabe, siehe get_my_tasks"),
        status: z.enum(["open", "in_progress", "done"]),
      },
    },
    async ({ phone, taskId, status }) => {
      const member = await findMemberByPhone(phone);
      if (!member) {
        return {
          content: [{ type: "text", text: "Diese Nummer ist keinem Member zugeordnet." }],
        };
      }

      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return { content: [{ type: "text", text: "Aufgabe nicht gefunden." }] };
      }

      const isOwnTask = task.memberId === member.id;
      const isTeamTask = member.teamId !== null && task.teamId === member.teamId;
      if (!isOwnTask && !isTeamTask) {
        return {
          content: [{ type: "text", text: "Diese Aufgabe gehört nicht zu dir oder deinem Team." }],
        };
      }

      await prisma.task.update({ where: { id: taskId }, data: { status } });
      return {
        content: [{ type: "text", text: `Status von "${task.title}" ist jetzt ${statusLabels[status]}.` }],
      };
    }
  );

  server.registerTool(
    "get_festival_info",
    {
      title: "Festival-Infos abrufen",
      description: "Allgemeine Infos zum Festival: Location und Kartenlink.",
      inputSchema: {},
    },
    async () => {
      return {
        content: [
          {
            type: "text",
            text: `Location: ${VENUE.label}\nKoordinaten: ${VENUE.latitude}, ${VENUE.longitude}\nKarte: ${VENUE.googleMapsUrl}`,
          },
        ],
      };
    }
  );

  return server;
}
