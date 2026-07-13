import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/openclaw";

function assignmentMessage(name: string, taskTitle: string, categoryName: string): string {
  return `Hi ${name}, du bist für "${taskTitle}" (${categoryName}) eingeteilt. Danke!`;
}

export async function notifyTaskAssignment(params: {
  memberId: string | null;
  teamId: string | null;
  taskTitle: string;
  categoryName: string;
}) {
  const { memberId, teamId, taskTitle, categoryName } = params;

  if (memberId) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (member) {
      await sendWhatsAppMessage(member.phone, assignmentMessage(member.name, taskTitle, categoryName));
    }
    return;
  }

  if (teamId) {
    const team = await prisma.team.findUnique({ where: { id: teamId }, include: { members: true } });
    if (team) {
      await Promise.all(
        team.members.map((member) =>
          sendWhatsAppMessage(member.phone, assignmentMessage(member.name, taskTitle, categoryName))
        )
      );
    }
  }
}
