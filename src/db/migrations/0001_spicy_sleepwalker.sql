CREATE TABLE "exercise_substitutes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"exercise_id" uuid NOT NULL,
	"substitute_exercise_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "logo_size_pct" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "logo_position_x" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "logo_position_y" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "logo_palette_colors" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_zoom_pct" integer DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_position_x" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_position_y" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "exercise_substitutes" ADD CONSTRAINT "exercise_substitutes_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_substitutes" ADD CONSTRAINT "exercise_substitutes_substitute_exercise_id_exercises_id_fk" FOREIGN KEY ("substitute_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exercise_substitutes_pair_unique" ON "exercise_substitutes" USING btree ("exercise_id","substitute_exercise_id");