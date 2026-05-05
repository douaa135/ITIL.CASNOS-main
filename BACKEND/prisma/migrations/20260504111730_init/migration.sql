-- DropForeignKey
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_id_user_fkey";

-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "id_user" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;
