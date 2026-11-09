CREATE TABLE "drivers" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"cached_at" timestamp with time zone DEFAULT now() NOT NULL
);
