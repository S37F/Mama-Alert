-- Self-registration vs HW-complete workflow (Path B alignment)
ALTER TABLE "patients" ADD COLUMN "registration_verified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "patients" ADD COLUMN "registration_source" TEXT NOT NULL DEFAULT 'health_worker';
