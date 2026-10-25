ALTER TABLE "students" ADD COLUMN "finance_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "finance_override_at" timestamp;