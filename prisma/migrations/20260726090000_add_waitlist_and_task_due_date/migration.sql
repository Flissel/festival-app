-- AlterTable
ALTER TABLE "Guest" ADD COLUMN "waitlisted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "dueDate" TIMESTAMP(3);
