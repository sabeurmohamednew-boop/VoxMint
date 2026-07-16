-- Add a nullable clone-request key so existing voices remain unchanged while
-- new paid clone requests can be retried safely.
ALTER TABLE "Voice" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "Voice_userId_idempotencyKey_key" ON "Voice"("userId", "idempotencyKey");
