-- AlterEnum
ALTER TYPE "ProspectStatus" ADD VALUE 'REAL_LOSS';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "link" TEXT;

-- AlterTable
ALTER TABLE "Subtask" ADD COLUMN     "link" TEXT;
