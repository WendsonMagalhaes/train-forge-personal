CREATE TABLE "challenge_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"points" integer DEFAULT 1 NOT NULL,
	"due_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_activity_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"checkin_date" date NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_group_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenge_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_activities" ADD CONSTRAINT "challenge_activities_group_id_challenge_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."challenge_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_activity_completions" ADD CONSTRAINT "challenge_activity_completions_activity_id_challenge_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."challenge_activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_activity_completions" ADD CONSTRAINT "challenge_activity_completions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_checkins" ADD CONSTRAINT "challenge_checkins_group_id_challenge_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."challenge_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_checkins" ADD CONSTRAINT "challenge_checkins_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_group_members" ADD CONSTRAINT "challenge_group_members_group_id_challenge_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."challenge_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_group_members" ADD CONSTRAINT "challenge_group_members_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_group_messages" ADD CONSTRAINT "challenge_group_messages_group_id_challenge_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."challenge_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_group_messages" ADD CONSTRAINT "challenge_group_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_groups" ADD CONSTRAINT "challenge_groups_trainer_id_users_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_activity_completions_unique" ON "challenge_activity_completions" USING btree ("activity_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_checkins_unique" ON "challenge_checkins" USING btree ("group_id","student_id","checkin_date");--> statement-breakpoint
CREATE UNIQUE INDEX "challenge_group_members_unique" ON "challenge_group_members" USING btree ("group_id","student_id");