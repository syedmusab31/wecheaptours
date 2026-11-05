-- Search indexes (gin_trgm_ops) need the trigram extension; drizzle-kit doesn't create extensions.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."addon_unit" AS ENUM('person', 'booking');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('tour', 'cruise', 'transfer', 'stay', 'package');--> statement-breakpoint
CREATE TYPE "public"."price_unit" AS ENUM('person', 'group', 'night', 'vehicle');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('guest', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'declined', 'expired', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('deposit', 'balance', 'full', 'refund');--> statement-breakpoint
CREATE TYPE "public"."payment_record_status" AS ENUM('pending', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'deposit_paid', 'paid', 'refunded', 'partially_refunded');--> statement-breakpoint
CREATE TYPE "public"."enquiry_status" AS ENUM('new', 'quoted', 'closed');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('owner', 'manager', 'agent');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('queued', 'running', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "countries" (
	"code" char(2) PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"currency" char(3) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "destinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"country_code" char(2) NOT NULL,
	"tagline" varchar(200) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "destinations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "price_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"option_id" integer,
	"name" varchar(120) NOT NULL,
	"starts_on" date,
	"ends_on" date,
	"weekdays" jsonb,
	"min_guests" integer,
	"percent_change" numeric(6, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_addons" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"price_cents" integer NOT NULL,
	"unit" "addon_unit" DEFAULT 'person' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" varchar(300) DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"price_unit" "price_unit" DEFAULT 'person' NOT NULL,
	"min_guests" integer DEFAULT 1 NOT NULL,
	"max_guests" integer DEFAULT 12 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(140) NOT NULL,
	"category" "category" NOT NULL,
	"title" varchar(200) NOT NULL,
	"summary" varchar(300) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"destination_id" integer,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"price_unit" "price_unit" DEFAULT 'person' NOT NULL,
	"duration_label" varchar(80) DEFAULT '' NOT NULL,
	"duration_minutes" integer DEFAULT 480 NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"included" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excluded" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"itinerary" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"languages" jsonb DEFAULT '["English"]'::jsonb NOT NULL,
	"meeting_point" text DEFAULT '' NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"pickup_included" boolean DEFAULT true NOT NULL,
	"min_guests" integer DEFAULT 1 NOT NULL,
	"max_guests" integer DEFAULT 12 NOT NULL,
	"bedrooms" integer,
	"min_nights" integer DEFAULT 1 NOT NULL,
	"rating" numeric(2, 1) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(40) NOT NULL,
	"description" varchar(200) DEFAULT '' NOT NULL,
	"percent_off" integer,
	"amount_off_cents" integer,
	"starts_on" date,
	"ends_on" date,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "availability_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"starts_on" date NOT NULL,
	"start_time" time DEFAULT '00:00:00' NOT NULL,
	"capacity" integer NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"status" "slot_status" DEFAULT 'open' NOT NULL,
	"cutoff_hours" integer,
	CONSTRAINT "availability_slots_product_date_time_uq" UNIQUE("product_id","starts_on","start_time")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(200) NOT NULL,
	"name" varchar(160) DEFAULT '' NOT NULL,
	"phone" varchar(40) DEFAULT '' NOT NULL,
	"country" varchar(80) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "booking_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"from_status" "booking_status",
	"to_status" "booking_status" NOT NULL,
	"actor_type" "actor_type" NOT NULL,
	"actor_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_reservations" (
	"booking_id" integer NOT NULL,
	"slot_id" integer NOT NULL,
	"seats" integer NOT NULL,
	CONSTRAINT "booking_reservations_booking_id_slot_id_pk" PRIMARY KEY("booking_id","slot_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(20) NOT NULL,
	"idempotency_key" varchar(64),
	"product_id" integer,
	"option_id" integer,
	"customer_id" integer,
	"product_title" varchar(200) NOT NULL,
	"option_name" varchar(120) DEFAULT '' NOT NULL,
	"category" "category" NOT NULL,
	"travel_date" date NOT NULL,
	"end_date" date,
	"adults" integer DEFAULT 1 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"infants" integer DEFAULT 0 NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"deposit_cents" integer DEFAULT 0 NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"currency" char(3) DEFAULT 'USD' NOT NULL,
	"display_currency" char(3) DEFAULT 'USD' NOT NULL,
	"fx_rate" numeric(12, 6) DEFAULT '1' NOT NULL,
	"price_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"addons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"promo_code_id" integer,
	"promo_code" varchar(40) DEFAULT '' NOT NULL,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"customer_name" varchar(160) NOT NULL,
	"customer_email" varchar(200) NOT NULL,
	"customer_phone" varchar(40) NOT NULL,
	"customer_country" varchar(80) DEFAULT '' NOT NULL,
	"pickup_location" varchar(240) DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"admin_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_reference_unique" UNIQUE("reference"),
	CONSTRAINT "bookings_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_ref" varchar(200) NOT NULL,
	"kind" "payment_kind" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" char(3) NOT NULL,
	"status" "payment_record_status" NOT NULL,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_provider_ref_unique" UNIQUE("provider_ref")
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"topic" varchar(40) DEFAULT 'general' NOT NULL,
	"product_id" integer,
	"customer_id" integer,
	"customer_name" varchar(160) NOT NULL,
	"customer_email" varchar(200) NOT NULL,
	"customer_phone" varchar(40) DEFAULT '' NOT NULL,
	"travel_date" date,
	"guests" integer,
	"budget" varchar(60) DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" "enquiry_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer,
	"author_name" varchar(120) NOT NULL,
	"author_country" varchar(80) DEFAULT '' NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(160) DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"travel_month" varchar(40) DEFAULT '' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(200) NOT NULL,
	"name" varchar(120) DEFAULT 'Admin' NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'owner' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "login_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" integer NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" varchar(64) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(60) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" varchar(200),
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "jobs_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(200) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_rules" ADD CONSTRAINT "price_rules_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_destination_id_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_reservations" ADD CONSTRAINT "booking_reservations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_reservations" ADD CONSTRAINT "booking_reservations_slot_id_availability_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."availability_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_option_id_product_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."product_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_challenges" ADD CONSTRAINT "login_challenges_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "destinations_name_trgm_idx" ON "destinations" USING gin ("name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "price_rules_product_idx" ON "price_rules" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_addons_product_idx" ON "product_addons" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_options_product_idx" ON "product_options" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_destination_idx" ON "products" USING btree ("destination_id");--> statement-breakpoint
CREATE INDEX "products_is_active_category_idx" ON "products" USING btree ("is_active","category");--> statement-breakpoint
CREATE INDEX "products_is_active_is_featured_idx" ON "products" USING btree ("is_active","is_featured");--> statement-breakpoint
CREATE INDEX "products_tags_gin_idx" ON "products" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "products_title_trgm_idx" ON "products" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "products_summary_trgm_idx" ON "products" USING gin ("summary" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "availability_slots_product_date_idx" ON "availability_slots" USING btree ("product_id","starts_on");--> statement-breakpoint
CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bookings_customer_email_idx" ON "bookings" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "bookings_travel_date_idx" ON "bookings" USING btree ("travel_date");--> statement-breakpoint
CREATE INDEX "bookings_created_at_id_idx" ON "bookings" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "enquiries_created_at_id_idx" ON "enquiries" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "login_challenges_admin_idx" ON "login_challenges" USING btree ("admin_id");--> statement-breakpoint
CREATE INDEX "jobs_status_run_at_idx" ON "jobs" USING btree ("status","run_at");