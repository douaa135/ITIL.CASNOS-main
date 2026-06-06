-- CreateTable
CREATE TABLE "password_reset_token" (
    "id" UUID NOT NULL,
    "id_user" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_token_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "utilisateur"("id_user") ON DELETE CASCADE ON UPDATE CASCADE;
