import { prisma } from "@/lib/prisma";
import { TaskCard } from "@/components/admin/TaskCard";
import { NewTaskForm } from "@/components/admin/NewTaskForm";
import { NewCategoryForm } from "@/components/admin/NewCategoryForm";
import { CategoryHeader } from "@/components/admin/CategoryHeader";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { status: "open" as const, label: "Offen" },
  { status: "in_progress" as const, label: "In Arbeit" },
  { status: "done" as const, label: "Erledigt" },
];

export default async function AdminTasksPage() {
  const [categories, members] = await Promise.all([
    prisma.budgetCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { tasks: { include: { member: true }, orderBy: { createdAt: "asc" } } },
    }),
    prisma.member.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Aufgaben</h1>
        <NewCategoryForm />
      </div>

      {categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <CategoryHeader
              categoryId={category.id}
              name={category.name}
              taskCount={category.tasks.length}
            />
            <NewTaskForm categoryId={category.id} members={members} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.status} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-white/40">{column.label}</p>
                <div className="space-y-2">
                  {category.tasks
                    .filter((task) => task.status === column.status)
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        members={members}
                        task={{
                          id: task.id,
                          title: task.title,
                          status: task.status,
                          categoryName: category.name,
                          member: task.member
                            ? { id: task.member.id, name: task.member.name, phone: task.member.phone }
                            : null,
                          estimatedCost: task.estimatedCost?.toString() ?? null,
                          actualCost: task.actualCost?.toString() ?? null,
                        }}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {categories.length === 0 && (
        <p className="text-white/40">Noch keine Kategorien angelegt.</p>
      )}
    </div>
  );
}
