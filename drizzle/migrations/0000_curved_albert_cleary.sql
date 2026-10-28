CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_name_not_blank" CHECK (length(trim("admins"."name")) > 0),
	CONSTRAINT "admins_email_not_blank" CHECK (length(trim("admins"."email")) > 0)
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_name_not_blank" CHECK (length(trim("employees"."name")) > 0),
	CONSTRAINT "employees_email_not_blank" CHECK (length(trim("employees"."email")) > 0)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"cycle_start" date NOT NULL,
	"cycle_end" date NOT NULL,
	"total_days" integer DEFAULT 30 NOT NULL,
	"max_periods" integer DEFAULT 3 NOT NULL,
	"min_period_days" integer DEFAULT 1 NOT NULL,
	"min_gap_days" integer DEFAULT 15 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_cycle_valid" CHECK ("settings"."cycle_end" >= "settings"."cycle_start"),
	CONSTRAINT "settings_positive_values" CHECK ("settings"."total_days" > 0 AND "settings"."max_periods" > 0 AND "settings"."min_period_days" > 0 AND "settings"."min_gap_days" >= 0)
);
--> statement-breakpoint
CREATE TABLE "vacation_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"admin_override" boolean DEFAULT false NOT NULL,
	"override_reason" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vacation_periods_dates_valid" CHECK ("vacation_periods"."end_date" >= "vacation_periods"."start_date"),
	CONSTRAINT "vacation_periods_status_valid" CHECK ("vacation_periods"."status" IN ('draft', 'confirmed')),
	CONSTRAINT "vacation_periods_override_reason" CHECK (("vacation_periods"."admin_override" = false AND "vacation_periods"."override_reason" IS NULL) OR ("vacation_periods"."admin_override" = true AND "vacation_periods"."override_reason" IS NOT NULL AND length(trim("vacation_periods"."override_reason")) > 0))
);
--> statement-breakpoint
ALTER TABLE "vacation_periods" ADD CONSTRAINT "vacation_periods_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_periods" ADD CONSTRAINT "vacation_periods_no_overlap" EXCLUDE USING gist ("employee_id" WITH =, daterange("start_date", "end_date", '[]') WITH &&);--> statement-breakpoint
CREATE UNIQUE INDEX "admins_email_unique" ON "admins" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "employees_email_unique" ON "employees" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "employees_active_idx" ON "employees" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "vacation_periods_employee_idx" ON "vacation_periods" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "vacation_periods_status_idx" ON "vacation_periods" USING btree ("status");