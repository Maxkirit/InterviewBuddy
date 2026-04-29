-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "auths" (
    "auth_id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "sub" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auths_pkey" PRIMARY KEY ("auth_id")
);

-- CreateTable
CREATE TABLE "failed_logins" (
    "attempt_id" SERIAL NOT NULL,
    "auth_id" INTEGER,
    "attempt_count" INTEGER NOT NULL,
    "ip_address" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "failed_logins_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "auth_id" INTEGER NOT NULL,
    "reset_token" TEXT NOT NULL,
    "token_expiry" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("auth_id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "token" TEXT NOT NULL,
    "version_control" INTEGER NOT NULL,
    "token_expiry" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '7 days'::interval),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE UNIQUE INDEX "auths_email_key" ON "auths"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_reset_token_key" ON "password_reset_tokens"("reset_token");

-- AddForeignKey
ALTER TABLE "failed_logins" ADD CONSTRAINT "failed_logins_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auths"("auth_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_auth_id_fkey" FOREIGN KEY ("auth_id") REFERENCES "auths"("auth_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

