CREATE TABLE "health_check" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text DEFAULT 'lights-out-api' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
