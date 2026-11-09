CREATE TABLE "workout_template_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0,
	"series_type" "series_type" DEFAULT 'simples' NOT NULL,
	"rounds" integer DEFAULT 1 NOT NULL,
	"rest_seconds" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workout_template_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_block_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"order_index" integer DEFAULT 0,
	"reps" text,
	"load_kg" numeric(6, 2),
	"tempo" text,
	"hold_seconds" integer,
	"notes" text,
	"sets_detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_template_blocks" ADD CONSTRAINT "workout_template_blocks_template_id_workout_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_template_block_id_workout_template_blocks_id_fk" FOREIGN KEY ("template_block_id") REFERENCES "public"."workout_template_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_exercises" ADD CONSTRAINT "workout_template_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;