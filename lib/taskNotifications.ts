import { prisma } from "@/lib/prisma";
import { sendToPhone } from "@/lib/openclaw";

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
      await sendToPhone(member.phone, assignmentMessage(member.name, taskTitle, categoryName));
    }
    return;
  }

  if (teamId) {
    const team = await prisma.team.findUnique({ where: { id: teamId }, include: { members: true } });
    if (team) {
      await Promise.all(
        team.members.map((member) =>
          sendToPhone(member.phone, assignmentMessage(member.name, taskTitle, categoryName))
        )
      );
    }
  }
}
