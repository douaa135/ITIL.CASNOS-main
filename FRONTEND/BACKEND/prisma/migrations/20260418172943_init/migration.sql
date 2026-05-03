-- CreateEnum
CREATE TYPE "TypeRFC" AS ENUM ('STANDARD', 'NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "ContexteStatut" AS ENUM ('RFC', 'CHANGEMENT', 'TACHE');

-- CreateEnum
CREATE TYPE "TypeCab" AS ENUM ('STANDARD', 'NORMAL', 'URGENT');

-- CreateEnum
CREATE TYPE "RoleMembreCab" AS ENUM ('PRESIDENT', 'MEMBRE');

-- CreateEnum
CREATE TYPE "ValeurVote" AS ENUM ('APPROUVER', 'REJETER', 'ABSTENTION');

-- CreateEnum
CREATE TYPE "TypeDecision" AS ENUM ('APPROUVER', 'REJETER', 'REPORTER');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('EMAIL', 'SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "ResultatTest" AS ENUM ('REUSSI', 'ECHOUE', 'EN_ATTENTE');

-- CreateTable
CREATE TABLE "permission" (
    "id_permission" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "code_permission" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(50),

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id_permission")
);

-- CreateTable
CREATE TABLE "role" (
    "id_role" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "nom_role" VARCHAR(60) NOT NULL,
    "description" TEXT,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id_role")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "id_role" UUID NOT NULL,
    "id_permission" UUID NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id_role","id_permission")
);

-- CreateTable
CREATE TABLE "user_role" (
    "id_user" UUID NOT NULL,
    "id_role" UUID NOT NULL,
    "date_attribution" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("id_user","id_role")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "id_user" UUID NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "logoutAt" TIMESTAMP(3),
    "jti" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direction_metier" (
    "id_direction" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "nom_direction" VARCHAR(150) NOT NULL,

    CONSTRAINT "direction_metier_pkey" PRIMARY KEY ("id_direction")
);

-- CreateTable
CREATE TABLE "utilisateur" (
    "id_user" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "nom_user" VARCHAR(80) NOT NULL,
    "prenom_user" VARCHAR(80) NOT NULL,
    "date_naissance" DATE NOT NULL,
    "email_user" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "mot_passe" VARCHAR(255) NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "id_direction" UUID,

    CONSTRAINT "utilisateur_pkey" PRIMARY KEY ("id_user")
);

-- CreateTable
CREATE TABLE "cab" (
    "id_cab" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "type_cab" "TypeCab" NOT NULL,
    "date_creation" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cab_pkey" PRIMARY KEY ("id_cab")
);

-- CreateTable
CREATE TABLE "membre_cab" (
    "id_cab" UUID NOT NULL,
    "id_user" UUID NOT NULL,
    "date_adhesion" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "RoleMembreCab" NOT NULL DEFAULT 'MEMBRE',

    CONSTRAINT "membre_cab_pkey" PRIMARY KEY ("id_cab","id_user")
);

-- CreateTable
CREATE TABLE "type_rfc" (
    "id_type" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "type" "TypeRFC" NOT NULL,
    "description" TEXT,

    CONSTRAINT "type_rfc_pkey" PRIMARY KEY ("id_type")
);

-- CreateTable
CREATE TABLE "statut" (
    "id_statut" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "code_statut" VARCHAR(30) NOT NULL,
    "libelle" VARCHAR(60) NOT NULL,
    "description" VARCHAR(200),
    "contexte" "ContexteStatut" NOT NULL,

    CONSTRAINT "statut_pkey" PRIMARY KEY ("id_statut")
);

-- CreateTable
CREATE TABLE "statut_history" (
    "id_history" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "id_statut" UUID NOT NULL,
    "id_rfc" UUID,
    "id_changement" UUID,
    "id_user" UUID,
    "date_changement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commentaire" TEXT,

    CONSTRAINT "statut_history_pkey" PRIMARY KEY ("id_history")
);

-- CreateTable
CREATE TABLE "priorite" (
    "id_priorite" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "code_priorite" TEXT NOT NULL,
    "libelle" VARCHAR(60) NOT NULL,

    CONSTRAINT "priorite_pkey" PRIMARY KEY ("id_priorite")
);

-- CreateTable
CREATE TABLE "environnement" (
    "id_env" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "nom_env" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),

    CONSTRAINT "environnement_pkey" PRIMARY KEY ("id_env")
);

-- CreateTable
CREATE TABLE "configuration_item" (
    "id_ci" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "nom_ci" VARCHAR(150) NOT NULL,
    "type_ci" VARCHAR(80) NOT NULL,
    "version_ci" VARCHAR(30),
    "description" TEXT,

    CONSTRAINT "configuration_item_pkey" PRIMARY KEY ("id_ci")
);

-- CreateTable
CREATE TABLE "ci_env" (
    "id_ci" UUID NOT NULL,
    "id_env" UUID NOT NULL,

    CONSTRAINT "ci_env_pkey" PRIMARY KEY ("id_ci","id_env")
);

-- CreateTable
CREATE TABLE "rfc" (
    "id_rfc" UUID NOT NULL,
    "code_rfc" VARCHAR(40) NOT NULL,
    "titre_rfc" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_souhaitee" DATE,
    "date_modification" TIMESTAMP(3),
    "date_cloture" TIMESTAMP(3),
    "urgence" BOOLEAN NOT NULL DEFAULT false,
    "impacte_estimee" TEXT,
    "id_statut" UUID NOT NULL,
    "id_user" UUID NOT NULL,
    "id_priorite" UUID NOT NULL,
    "id_type" UUID NOT NULL,

    CONSTRAINT "rfc_pkey" PRIMARY KEY ("id_rfc")
);

-- CreateTable
CREATE TABLE "ci_rfc" (
    "id_ci" UUID NOT NULL,
    "id_rfc" UUID NOT NULL,

    CONSTRAINT "ci_rfc_pkey" PRIMARY KEY ("id_ci","id_rfc")
);

-- CreateTable
CREATE TABLE "evaluation_risque" (
    "id_evaluation" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "impacte" INTEGER NOT NULL,
    "probabilite" INTEGER NOT NULL,
    "score_risque" INTEGER NOT NULL,
    "description" TEXT,
    "date_evaluation" DATE,
    "id_rfc" UUID NOT NULL,

    CONSTRAINT "evaluation_risque_pkey" PRIMARY KEY ("id_evaluation")
);

-- CreateTable
CREATE TABLE "pieces_jointe" (
    "id_piece" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "type_piece" VARCHAR(50),
    "taille_piece" BIGINT,
    "date_upload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_rfc" UUID NOT NULL,

    CONSTRAINT "pieces_jointe_pkey" PRIMARY KEY ("id_piece")
);

-- CreateTable
CREATE TABLE "commentaire" (
    "id_commentaire" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "contenu" TEXT NOT NULL,
    "date_publication" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_rfc" UUID NOT NULL,

    CONSTRAINT "commentaire_pkey" PRIMARY KEY ("id_commentaire")
);

-- CreateTable
CREATE TABLE "changement" (
    "id_changement" UUID NOT NULL,
    "code_changement" VARCHAR(40) NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_debut" DATE,
    "date_fin_prevu" DATE,
    "date_fin_reelle" DATE,
    "reussite" BOOLEAN,
    "id_user" UUID NOT NULL,
    "id_env" UUID NOT NULL,
    "id_rfc" UUID,
    "id_statut" UUID NOT NULL,

    CONSTRAINT "changement_pkey" PRIMARY KEY ("id_changement")
);

-- CreateTable
CREATE TABLE "plan_changement" (
    "id_plan" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "titre_plan" VARCHAR(200) NOT NULL,
    "etapes_plan" TEXT,
    "duree_estimee" INTEGER,
    "id_changement" UUID NOT NULL,

    CONSTRAINT "plan_changement_pkey" PRIMARY KEY ("id_plan")
);

-- CreateTable
CREATE TABLE "plan_rollback" (
    "id_rollback" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "description" TEXT NOT NULL,
    "procedure_rollback" TEXT,
    "id_changement" UUID NOT NULL,

    CONSTRAINT "plan_rollback_pkey" PRIMARY KEY ("id_rollback")
);

-- CreateTable
CREATE TABLE "test" (
    "id_test" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "date_test" DATE,
    "critere_test" TEXT,
    "resultat" "ResultatTest" NOT NULL DEFAULT 'EN_ATTENTE',
    "contexte" VARCHAR(100),
    "id_changement" UUID NOT NULL,

    CONSTRAINT "test_pkey" PRIMARY KEY ("id_test")
);

-- CreateTable
CREATE TABLE "post_implementation_review" (
    "id_pir" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "date_pir" DATE,
    "description" TEXT,
    "conformite_objectifs" BOOLEAN,
    "conformite_delais" BOOLEAN,
    "id_changement" UUID NOT NULL,

    CONSTRAINT "post_implementation_review_pkey" PRIMARY KEY ("id_pir")
);

-- CreateTable
CREATE TABLE "guide" (
    "id_guide" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "nom_guide" VARCHAR(150) NOT NULL,
    "contenu" TEXT,
    "id_changement" UUID NOT NULL,

    CONSTRAINT "guide_pkey" PRIMARY KEY ("id_guide")
);

-- CreateTable
CREATE TABLE "tache" (
    "id_tache" UUID NOT NULL,
    "code_tache" VARCHAR(40) NOT NULL,
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ordre_tache" INTEGER NOT NULL,
    "titre_tache" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "duree" INTEGER,
    "id_changement" UUID NOT NULL,
    "id_user" UUID NOT NULL,
    "id_statut" UUID NOT NULL,

    CONSTRAINT "tache_pkey" PRIMARY KEY ("id_tache")
);

-- CreateTable
CREATE TABLE "journal_execution" (
    "id_journal" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "titre_journal" VARCHAR(200),
    "description" TEXT NOT NULL,
    "date_entree" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_tache" UUID NOT NULL,

    CONSTRAINT "journal_execution_pkey" PRIMARY KEY ("id_journal")
);

-- CreateTable
CREATE TABLE "reunion_cab" (
    "id_reunion" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "date_reunion" DATE NOT NULL,
    "heure_debut" TIME,
    "heure_fin" TIME,
    "ordre_jour" TEXT,
    "id_cab" UUID NOT NULL,

    CONSTRAINT "reunion_cab_pkey" PRIMARY KEY ("id_reunion")
);

-- CreateTable
CREATE TABLE "participant" (
    "id_reunion" UUID NOT NULL,
    "id_user" UUID NOT NULL,

    CONSTRAINT "participant_pkey" PRIMARY KEY ("id_reunion","id_user")
);

-- CreateTable
CREATE TABLE "vote_cab" (
    "id_vote" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "valeur_vote" "ValeurVote" NOT NULL,
    "date_vote" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_reunion" UUID NOT NULL,
    "id_user" UUID NOT NULL,
    "id_rfc" UUID NOT NULL,

    CONSTRAINT "vote_cab_pkey" PRIMARY KEY ("id_vote")
);

-- CreateTable
CREATE TABLE "decision_cab" (
    "id_decision" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "decision" "TypeDecision" NOT NULL,
    "motif" TEXT,
    "date_decision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_reunion" UUID NOT NULL,
    "id_rfc" UUID NOT NULL,

    CONSTRAINT "decision_cab_pkey" PRIMARY KEY ("id_decision")
);

-- CreateTable
CREATE TABLE "rfc_reunion" (
    "id_rfc" UUID NOT NULL,
    "id_reunion" UUID NOT NULL,

    CONSTRAINT "rfc_reunion_pkey" PRIMARY KEY ("id_rfc","id_reunion")
);

-- CreateTable
CREATE TABLE "notification" (
    "id_notif" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "message" TEXT NOT NULL,
    "objet" VARCHAR(200),
    "type_notif" "TypeNotification" NOT NULL,
    "date_envoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "id_user" UUID NOT NULL,
    "id_rfc" UUID,
    "id_changement" UUID,
    "id_tache" UUID,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id_notif")
);

-- CreateTable
CREATE TABLE "rapport" (
    "id_rapport" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "titre_rapport" VARCHAR(200) NOT NULL,
    "type_rapport" VARCHAR(50),
    "contenu_rapport" TEXT,
    "date_generation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_rfc" UUID NOT NULL,

    CONSTRAINT "rapport_pkey" PRIMARY KEY ("id_rapport")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id_log" UUID NOT NULL,
    "code_metier" VARCHAR(40) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entite_type" VARCHAR(50) NOT NULL,
    "entite_id" INTEGER NOT NULL,
    "ancienne_val" JSONB,
    "nouvelle_val" JSONB,
    "date_action" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_user" UUID NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id_log")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_metier_key" ON "permission"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_permission_key" ON "permission"("code_permission");

-- CreateIndex
CREATE UNIQUE INDEX "role_code_metier_key" ON "role"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "role_nom_role_key" ON "role"("nom_role");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_jti_key" ON "RefreshToken"("jti");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_jti_key" ON "RevokedToken"("jti");

-- CreateIndex
CREATE UNIQUE INDEX "Session_jti_key" ON "Session"("jti");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "direction_metier_code_metier_key" ON "direction_metier"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "direction_metier_nom_direction_key" ON "direction_metier"("nom_direction");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_code_metier_key" ON "utilisateur"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateur_email_user_key" ON "utilisateur"("email_user");

-- CreateIndex
CREATE UNIQUE INDEX "cab_code_metier_key" ON "cab"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "type_rfc_code_metier_key" ON "type_rfc"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "statut_code_metier_key" ON "statut"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "statut_code_statut_contexte_key" ON "statut"("code_statut", "contexte");

-- CreateIndex
CREATE UNIQUE INDEX "priorite_code_metier_key" ON "priorite"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "priorite_code_priorite_key" ON "priorite"("code_priorite");

-- CreateIndex
CREATE UNIQUE INDEX "environnement_code_metier_key" ON "environnement"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "environnement_nom_env_key" ON "environnement"("nom_env");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_item_code_metier_key" ON "configuration_item"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "configuration_item_nom_ci_key" ON "configuration_item"("nom_ci");

-- CreateIndex
CREATE UNIQUE INDEX "rfc_code_rfc_key" ON "rfc"("code_rfc");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_risque_code_metier_key" ON "evaluation_risque"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_risque_id_rfc_key" ON "evaluation_risque"("id_rfc");

-- CreateIndex
CREATE UNIQUE INDEX "pieces_jointe_code_metier_key" ON "pieces_jointe"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "commentaire_code_metier_key" ON "commentaire"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "changement_code_changement_key" ON "changement"("code_changement");

-- CreateIndex
CREATE UNIQUE INDEX "plan_changement_code_metier_key" ON "plan_changement"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "plan_changement_id_changement_key" ON "plan_changement"("id_changement");

-- CreateIndex
CREATE UNIQUE INDEX "plan_rollback_code_metier_key" ON "plan_rollback"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "plan_rollback_id_changement_key" ON "plan_rollback"("id_changement");

-- CreateIndex
CREATE UNIQUE INDEX "test_code_metier_key" ON "test"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "post_implementation_review_code_metier_key" ON "post_implementation_review"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "post_implementation_review_id_changement_key" ON "post_implementation_review"("id_changement");

-- CreateIndex
CREATE UNIQUE INDEX "guide_code_metier_key" ON "guide"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "tache_code_tache_key" ON "tache"("code_tache");

-- CreateIndex
CREATE UNIQUE INDEX "journal_execution_code_metier_key" ON "journal_execution"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "reunion_cab_code_metier_key" ON "reunion_cab"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "vote_cab_code_metier_key" ON "vote_cab"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "vote_cab_id_reunion_id_user_id_rfc_key" ON "vote_cab"("id_reunion", "id_user", "id_rfc");

-- CreateIndex
CREATE UNIQUE INDEX "decision_cab_code_metier_key" ON "decision_cab"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "decision_cab_id_reunion_id_rfc_key" ON "decision_cab"("id_reunion", "id_rfc");

-- CreateIndex
CREATE UNIQUE INDEX "notification_code_metier_key" ON "notification"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "rapport_code_metier_key" ON "rapport"("code_metier");

-- CreateIndex
CREATE UNIQUE INDEX "audit_log_code_metier_key" ON "audit_log"("code_metier");

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_id_role_fkey" FOREIGN KEY ("id_role") REFERENCES "role"("id_role") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_id_permission_fkey" FOREIGN KEY ("id_permission") REFERENCES "permission"("id_permission") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_id_role_fkey" FOREIGN KEY ("id_role") REFERENCES "role"("id_role") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateur" ADD CONSTRAINT "utilisateur_id_direction_fkey" FOREIGN KEY ("id_direction") REFERENCES "direction_metier"("id_direction") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membre_cab" ADD CONSTRAINT "membre_cab_id_cab_fkey" FOREIGN KEY ("id_cab") REFERENCES "cab"("id_cab") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membre_cab" ADD CONSTRAINT "membre_cab_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statut_history" ADD CONSTRAINT "statut_history_id_statut_fkey" FOREIGN KEY ("id_statut") REFERENCES "statut"("id_statut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statut_history" ADD CONSTRAINT "statut_history_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statut_history" ADD CONSTRAINT "statut_history_id_changement_fkey" FOREIGN KEY ("id_changement") REFERENCES "changement"("id_changement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statut_history" ADD CONSTRAINT "statut_history_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_env" ADD CONSTRAINT "ci_env_id_ci_fkey" FOREIGN KEY ("id_ci") REFERENCES "configuration_item"("id_ci") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_env" ADD CONSTRAINT "ci_env_id_env_fkey" FOREIGN KEY ("id_env") REFERENCES "environnement"("id_env") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfc" ADD CONSTRAINT "rfc_id_statut_fkey" FOREIGN KEY ("id_statut") REFERENCES "statut"("id_statut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfc" ADD CONSTRAINT "rfc_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfc" ADD CONSTRAINT "rfc_id_priorite_fkey" FOREIGN KEY ("id_priorite") REFERENCES "priorite"("id_priorite") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfc" ADD CONSTRAINT "rfc_id_type_fkey" FOREIGN KEY ("id_type") REFERENCES "type_rfc"("id_type") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_rfc" ADD CONSTRAINT "ci_rfc_id_ci_fkey" FOREIGN KEY ("id_ci") REFERENCES "configuration_item"("id_ci") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ci_rfc" ADD CONSTRAINT "ci_rfc_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_risque" ADD CONSTRAINT "evaluation_risque_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_jointe" ADD CONSTRAINT "pieces_jointe_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaire" ADD CONSTRAINT "commentaire_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changement" ADD CONSTRAINT "changement_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changement" ADD CONSTRAINT "changement_id_env_fkey" FOREIGN KEY ("id_env") REFERENCES "environnement"("id_env") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changement" ADD CONSTRAINT "changement_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "changement" ADD CONSTRAINT "changement_id_statut_fkey" FOREIGN KEY ("id_statut") REFERENCES "statut"("id_statut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_changement" ADD CONSTRAINT "plan_changement_id_changement_fkey" FOREIGN KEY ("id_changement") REFERENCES "changement"("id_changement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_rollback" ADD CONSTRAINT "plan_rollback_id_changement_fkey" FOREIGN KEY ("id_changement") REFERENCES "changement"("id_changement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test" ADD CONSTRAINT "test_id_changement_fkey" FOREIGN KEY ("id_changement") REFERENCES "changement"("id_changement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_implementation_review" ADD CONSTRAINT "post_implementation_review_id_changement_fkey" FOREIGN KEY ("id_changement") REFERENCES "changement"("id_changement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guide" ADD CONSTRAINT "guide_id_changement_fkey" FOREIGN KEY ("id_changement") REFERENCES "changement"("id_changement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tache" ADD CONSTRAINT "tache_id_changement_fkey" FOREIGN KEY ("id_changement") REFERENCES "changement"("id_changement") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tache" ADD CONSTRAINT "tache_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tache" ADD CONSTRAINT "tache_id_statut_fkey" FOREIGN KEY ("id_statut") REFERENCES "statut"("id_statut") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_execution" ADD CONSTRAINT "journal_execution_id_tache_fkey" FOREIGN KEY ("id_tache") REFERENCES "tache"("id_tache") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reunion_cab" ADD CONSTRAINT "reunion_cab_id_cab_fkey" FOREIGN KEY ("id_cab") REFERENCES "cab"("id_cab") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_id_reunion_fkey" FOREIGN KEY ("id_reunion") REFERENCES "reunion_cab"("id_reunion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant" ADD CONSTRAINT "participant_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_cab" ADD CONSTRAINT "vote_cab_id_reunion_fkey" FOREIGN KEY ("id_reunion") REFERENCES "reunion_cab"("id_reunion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_cab" ADD CONSTRAINT "vote_cab_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_cab" ADD CONSTRAINT "vote_cab_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_cab" ADD CONSTRAINT "decision_cab_id_reunion_fkey" FOREIGN KEY ("id_reunion") REFERENCES "reunion_cab"("id_reunion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_cab" ADD CONSTRAINT "decision_cab_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfc_reunion" ADD CONSTRAINT "rfc_reunion_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfc_reunion" ADD CONSTRAINT "rfc_reunion_id_reunion_fkey" FOREIGN KEY ("id_reunion") REFERENCES "reunion_cab"("id_reunion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_id_changement_fkey" FOREIGN KEY ("id_changement") REFERENCES "changement"("id_changement") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_id_tache_fkey" FOREIGN KEY ("id_tache") REFERENCES "tache"("id_tache") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rapport" ADD CONSTRAINT "rapport_id_rfc_fkey" FOREIGN KEY ("id_rfc") REFERENCES "rfc"("id_rfc") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;
