CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'approve');--> statement-breakpoint
CREATE TYPE "public"."ingestion_status" AS ENUM('pending', 'processing', 'review', 'approved', 'failed');--> statement-breakpoint
CREATE TYPE "public"."restaurant_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"before_data" jsonb,
	"after_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"admin_id" uuid NOT NULL,
	"pdf_url" varchar(512) NOT NULL,
	"status" "ingestion_status" DEFAULT 'pending' NOT NULL,
	"raw_text" text,
	"structured_data" jsonb,
	"validation_report" jsonb,
	"items_extracted" integer DEFAULT 0 NOT NULL,
	"items_approved" integer DEFAULT 0 NOT NULL,
	"error_log" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"category" varchar(255) NOT NULL,
	"serving_size" varchar(255),
	"calories" integer NOT NULL,
	"total_fat_g" numeric(7, 2),
	"saturated_fat_g" numeric(7, 2),
	"trans_fat_g" numeric(7, 2),
	"cholesterol_mg" numeric(7, 2),
	"sodium_mg" numeric(7, 2),
	"total_carbs_g" numeric(7, 2),
	"dietary_fiber_g" numeric(7, 2),
	"sugars_g" numeric(7, 2),
	"protein_g" numeric(7, 2),
	"is_available" boolean DEFAULT true NOT NULL,
	"source_pdf_url" varchar(512),
	"ingestion_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"logo_url" varchar(512),
	"website_url" varchar(512),
	"description" text,
	"status" "restaurant_status" DEFAULT 'draft' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"last_ingestion_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD CONSTRAINT "ingestion_jobs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_ingestion_id_ingestion_jobs_id_fk" FOREIGN KEY ("ingestion_id") REFERENCES "public"."ingestion_jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_id_idx" ON "audit_logs" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "menu_items_restaurant_id_idx" ON "menu_items" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "menu_items_category_idx" ON "menu_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "menu_items_calories_idx" ON "menu_items" USING btree ("calories");--> statement-breakpoint
CREATE INDEX "restaurants_slug_idx" ON "restaurants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "restaurants_status_idx" ON "restaurants" USING btree ("status");