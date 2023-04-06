-- AlterTable
ALTER TABLE "integrator_apps" ADD COLUMN     "integrator_external_app_id" TEXT,
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "description" SET DEFAULT '';

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

-- AddForeignKey
ALTER TABLE "integrator_apps" ADD CONSTRAINT "integrator_apps_integrator_external_app_id_fkey" FOREIGN KEY ("integrator_external_app_id") REFERENCES "integrator_external_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrator_external_apps" ADD CONSTRAINT "integrator_external_apps_integrator_team_id_fkey" FOREIGN KEY ("integrator_team_id") REFERENCES "integrator_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
