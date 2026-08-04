import { prisma } from "@/lib/prisma";
import { importOrgaPlan } from "@/lib/orgaPlan";

// Dasselbe, was der Button "Orga-Plan einspielen" im Admin auslöst — hier für
// den Fall, dass man die Datenbank direkt von der Kommandozeile befüllen will.
async function main() {
  const { createdCategories, createdTasks } = await importOrgaPlan(prisma);
  console.log(
    `Orga-Plan eingespielt: ${createdCategories} neue Kategorien, ${createdTasks} neue Aufgaben.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
