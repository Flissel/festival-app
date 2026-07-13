import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = ["Bar & Cocktails", "Sound/Technik", "Live-Acts", "Deko & Sonstiges"];

async function main() {
  const existing = await prisma.budgetCategory.count();
  if (existing > 0) {
    console.log("Kategorien bereits vorhanden, überspringe Seed.");
    return;
  }

  for (const [index, name] of DEFAULT_CATEGORIES.entries()) {
    await prisma.budgetCategory.create({ data: { name, sortOrder: index } });
  }
  console.log("Standard-Kategorien angelegt:", DEFAULT_CATEGORIES.join(", "));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
