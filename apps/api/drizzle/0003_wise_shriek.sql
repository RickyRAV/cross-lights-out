CREATE TABLE "race_results" (
	"race_id" text PRIMARY KEY NOT NULL,
	"actual_order" jsonb NOT NULL,
	"graded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_id" uuid NOT NULL,
	"points" integer NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scores_predictionId_unique" UNIQUE("prediction_id")
);
--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE no action ON UPDATE no action;