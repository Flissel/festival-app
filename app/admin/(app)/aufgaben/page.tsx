import { prisma } from "@/lib/prisma";
import { TaskCard } from "@/components/admin/TaskCard";
import { NewTaskForm } from "@/components/admin/NewTaskForm";
import { NewCategoryForm } from "@/components/admin/NewCategoryForm";
import { CategoryHeader } from "@/components/admin/CategoryHeader";
import { TaskFilters } from "@/components/admin/TaskFilters";
import { ImportPlanButton } from "@/components/admin/ImportPlanButton";
import { formatDueDate } from "@/lib/dueDate";

export const dynamic = "force-dynamic";

const COLUMNS = [
  { status: "open" as const, label: "Offen" },
  { status: "in_progress" as const, label: "In Arbeit" },
  { status: "done" as const, label: "Erledigt" },
];

const STATUS_VALUES = new Set(COLUMNS.map((column) => column.status as string));

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string }>;
}) {
  const { status, sort } = await searchParams;
  const statusFilter = status && STATUS_VALUES.has(status) ? status : null;
  const sortByDue = sort === "due";

  const [categories, members, teams] = await Promise.all([
    prisma.budgetCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        tasks: {
          include: { member: true, team: true },
          orderBy: sortByDue
            ? [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }]
            : { createdAt: "asc" },
        },
      },
    }),
    prisma.member.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" }, include: { members: true } }),
  ]);

  const columns = statusFilter
    ? COLUMNS.filter((column) => column.status === statusFilter)
    : COLUMNS;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Aufgaben</h1>
        <div className="flex flex-wrap items-center gap-4">
          <TaskFilters />
          <ImportPlanButton />
          <NewCategoryForm />
        </div>
      </div>

      {/* Beim ersten Aufruf ist die Seite leer — dann ist der Import der
          naheliegende erste Schritt und wird entsprechend erklärt. */}
      {categories.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Noch keine Kategorien angelegt. &bdquo;Orga-Plan einspielen&ldquo; legt den
          abgestimmten Plan an — Getränke, Essen, Musik, die vier Areas, Steg und
          die Ideensammlung. Der Import ist wiederholbar: Er ergänzt später nur,
          was neu dazugekommen ist.
        </div>
      )}

      {categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <CategoryHeader
              categoryId={category.id}
              name={category.name}
              taskCount={category.tasks.length}
            />
            <NewTaskForm categoryId={category.id} members={members} teams={teams} />
          </div>
          <div
            className={`grid grid-cols-1 gap-4 ${
              columns.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-1"
            }`}
          >
            {columns.map((column) => (
              <div key={column.status} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-white/40">{column.label}</p>
                <div className="space-y-2">
                  {category.tasks
                    .filter((task) => task.status === column.status)
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        members={members}
                        teams={teams}
                        task={{
                          id: task.id,
                          title: task.title,
                          description: task.description,
                          imageUrl: task.imageUrl,
                          status: task.status,
                          categoryName: category.name,
                          member: task.member
                            ? { id: task.member.id, name: task.member.name, phone: task.member.phone }
                            : null,
                          team: task.team ? { id: task.team.id, name: task.team.name } : null,
                          estimatedCost: task.estimatedCost?.toString() ?? null,
                          actualCost: task.actualCost?.toString() ?? null,
                          dueDate: task.dueDate ? formatDueDate(task.dueDate) : null,
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
