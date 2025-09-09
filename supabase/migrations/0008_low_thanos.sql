ALTER TABLE "sneakerz" ADD COLUMN "team_name" text GENERATED ALWAYS AS (CASE 
        WHEN style ~ '^.+ [0-9]{3}$' THEN REGEXP_REPLACE(style, ' [0-9]{3}$', '')
        ELSE NULL
    END) STORED;--> statement-breakpoint
ALTER TABLE "sneakerz" ADD COLUMN "team_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sneakerz" ADD CONSTRAINT "sneakerz_team_id_ballerz_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."ballerz_teams"("id") ON DELETE no action ON UPDATE no action;