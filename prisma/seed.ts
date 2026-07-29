import { prisma } from "@/lib/prisma";
import { ORGA_PLAN } from "@/lib/orgaPlan";
import { parseDueDate } from "@/lib/dueDate";

// Idempotent: Kategorien und Aufgaben werden über ihren Namen wiedererkannt.
// Ein zweiter Lauf legt nichts doppelt an und fasst bestehende Einträge (Status,
// Zuweisung, Kosten) nicht an — der Seed lässt sich also gefahrlos wiederholen,
// wenn der Plan wächst.
async function main() {
  const highest = await prisma.budgetCategory.aggregate({ _max: { sortOrder: true } });
  let nextSortOrder = (highest._max.sortOrder ?? -1) + 1;

  let createdCategories = 0;
  let createdTasks = 0;

  for (const planCategory of ORGA_PLAN) {
    let category = await prisma.budgetCategory.findFirst({
      where: { name: planCategory.name },
    });

    if (!category) {
      category = await prisma.budgetCategory.create({
        data: { name: planCategory.name, sortOrder: nextSortOrder },
      });
      nextSortOrder += 1;
      createdCategories += 1;
    }

    for (const task of planCategory.tasks) {
      const existing = await prisma.task.findFirst({
        where: { categoryId: category.id, title: task.title },
      });
      if (existing) continue;

      await prisma.task.create({
        data: {
          categoryId: category.id,
          title: task.title,
          dueDate: parseDueDate(task.dueDate),
        },
      });
      createdTasks += 1;
    }
  }

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
