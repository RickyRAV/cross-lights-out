CREATE TABLE "race_calendar" (
	"race_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"circuit" text NOT NULL,
	"lockout_at" timestamp with time zone NOT NULL,
	"cached_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"race_id" text NOT NULL,
	"predicted_order" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone NOT NULL,
	CONSTRAINT "predictions_userId_raceId_unique" UNIQUE("user_id","race_id")
);
--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;