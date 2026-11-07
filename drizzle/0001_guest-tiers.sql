ALTER TABLE "products" ADD COLUMN "guest_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "tier_guests" jsonb DEFAULT '[]'::jsonb NOT NULL;