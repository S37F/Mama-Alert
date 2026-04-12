-- Patient passwordless OTP (SMS) for PWA sign-in; mirrors volunteer_otp_challenges pattern.

CREATE TABLE "patient_otp_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_otp_challenges_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "patient_otp_challenges" ADD CONSTRAINT "patient_otp_challenges_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "patient_otp_challenges_patient_id_created_at_idx" ON "patient_otp_challenges" ("patient_id", "created_at" DESC);
