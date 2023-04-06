-- CreateTable
CREATE TABLE "integrator_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "product_type" TEXT NOT NULL,
    "tier" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrator_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "integrator_team_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL DEFAULT '',
    "last_name" TEXT NOT NULL DEFAULT '',
    "email" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "image" TEXT,
    "password_hash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "verification_token" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrator_apps" (
    "id" TEXT NOT NULL,
    "integrator_team_id" TEXT NOT NULL,
    "integrator_external_app_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "affiliate_address" TEXT,
    "legacy_integrator_id" TEXT,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrator_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrator_external_apps" (
    "id" TEXT NOT NULL,
    "integrator_team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrator_external_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrator_api_keys" (
    "id" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "integrator_app_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "integrator_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrator_access" (
    "integrator_app_id" TEXT NOT NULL,
    "route_tag" TEXT NOT NULL,
    "rate_limit" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrator_access_pkey" PRIMARY KEY ("integrator_app_id","route_tag")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_user_id_key" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_verification_token_key" ON "verification_tokens"("verification_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_user_email_key" ON "verification_tokens"("user_email");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_integrator_team_id_fkey" FOREIGN KEY ("integrator_team_id") REFERENCES "integrator_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_email_fkey" FOREIGN KEY ("user_email") REFERENCES "users"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrator_apps" ADD CONSTRAINT "integrator_apps_integrator_team_id_fkey" FOREIGN KEY ("integrator_team_id") REFERENCES "integrator_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrator_apps" ADD CONSTRAINT "integrator_apps_integrator_external_app_id_fkey" FOREIGN KEY ("integrator_external_app_id") REFERENCES "integrator_external_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrator_external_apps" ADD CONSTRAINT "integrator_external_apps_integrator_team_id_fkey" FOREIGN KEY ("integrator_team_id") REFERENCES "integrator_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrator_api_keys" ADD CONSTRAINT "integrator_api_keys_integrator_app_id_fkey" FOREIGN KEY ("integrator_app_id") REFERENCES "integrator_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrator_access" ADD CONSTRAINT "integrator_access_integrator_app_id_fkey" FOREIGN KEY ("integrator_app_id") REFERENCES "integrator_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
