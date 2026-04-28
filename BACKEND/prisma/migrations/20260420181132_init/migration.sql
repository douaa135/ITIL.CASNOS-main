/*
  Warnings:

  - Added the required column `id_user` to the `commentaire` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "entite_id" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "commentaire" ADD COLUMN     "id_user" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
