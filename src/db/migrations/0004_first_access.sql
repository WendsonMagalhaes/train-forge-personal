ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provisional_password_enc" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_access_at" timestamp;