CREATE TYPE "public"."hair_color" AS ENUM('Orange', 'Blue', 'Light Brown', 'Red', 'Blonde', 'Purple', 'Pink', 'Black', 'Other', 'Brown');--> statement-breakpoint
CREATE TYPE "public"."jersey" AS ENUM('Home', 'Away');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('Player', 'Captain', 'All-Star');--> statement-breakpoint
CREATE TYPE "public"."team" AS ENUM('All-Stars', 'Team Dapper (W)', 'Team Flow (W)', 'Team Dapper (M)', 'Team Flow (M)', 'Miami Tentacles', 'Boulder Elks', 'San Jose Sirens', 'Charlotte Clovers', 'New York Golden Bulls', 'Pennsylvania Fangs', 'Austin Machines', 'Phoenix Skulls', 'Salt Lake City Souls', 'Las Vegas Scorpions', 'New York Torches', 'Omaha Bullsnakes', 'D.C. Dobermans', 'San Francisco Surge', 'Dallas Pythons', 'Alabama Kingpins', 'Los Angeles Knives', 'Orlando Freeze', 'St. Louis Orcs', 'Helena Pronghorns', 'Alaska Whales', 'New Jersey Scientists', 'New Orleans Giants', 'Los Angeles Mammoths', 'Sierra Spiders', 'Tampa Bay Omens', 'Iowa City Rattlesnakes', 'Toronto Spears', 'Minneapolis Express', 'Boston Rulers', 'Michigan Colliders', 'Portland Bats', 'Portland Creatures', 'Cleveland Firebirds', 'Seattle Scream', 'San Diego Keepers', 'Wisconsin Dragons', 'Delaware Horsemen', 'Houston Rogues', 'Nashville Miracle', 'Chicago Squid', 'Tallahassee Tarantulas');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('M', 'W');--> statement-breakpoint
CREATE TABLE "ballerz" (
	"id" integer PRIMARY KEY NOT NULL,
	"role" "role" NOT NULL,
	"title" text NOT NULL,
	"img" text NOT NULL,
	"team_id" integer,
	"gender" "gender" NOT NULL,
	"jersey" "jersey" NOT NULL,
	"number" integer NOT NULL,
	"face" text,
	"hair" text NOT NULL,
	"hair_color" "hair_color" DEFAULT 'Other' NOT NULL,
	"hair_style" text NOT NULL,
	"body" text NOT NULL,
	"accessories" text[] DEFAULT '{""}' NOT NULL,
	"shooting" integer NOT NULL,
	"playmaking" integer NOT NULL,
	"defense" integer NOT NULL,
	"dunks" integer NOT NULL,
	"position" text GENERATED ALWAYS AS (
        CASE
            WHEN (((GREATEST("ballerz"."dunks", "ballerz"."shooting", "ballerz"."playmaking") = "ballerz"."playmaking") AND (LEAST("ballerz"."dunks", "ballerz"."shooting", "ballerz"."playmaking") = "ballerz"."dunks") AND (("ballerz"."playmaking" - "ballerz"."dunks") > 5) AND ("ballerz"."shooting" < ("ballerz"."playmaking" - 2))) OR (("ballerz"."playmaking" - "ballerz"."dunks") > 15)) THEN 'PG'::text
            WHEN ((GREATEST("ballerz"."dunks", "ballerz"."shooting", "ballerz"."playmaking") = "ballerz"."dunks") AND (LEAST("ballerz"."dunks", "ballerz"."shooting", "ballerz"."playmaking") = "ballerz"."playmaking")) THEN 'C'::text
            WHEN ((GREATEST("ballerz"."dunks", "ballerz"."shooting", "ballerz"."playmaking") - LEAST("ballerz"."dunks", "ballerz"."shooting", "ballerz"."playmaking")) <= 8) THEN 'SF'::text
            WHEN ("ballerz"."shooting" > "ballerz"."dunks") THEN 'SG'::text
            WHEN ("ballerz"."dunks" >= "ballerz"."shooting") THEN 'PF'::text
            ELSE ''::text
        END
      ) STORED,
	"overall" numeric GENERATED ALWAYS AS (round(((float8(((("ballerz"."dunks" + "ballerz"."shooting") + "ballerz"."playmaking") + "ballerz"."defense")) / (4)::double precision))::numeric, 2)) STORED,
	"nft_contract" text NOT NULL,
	"nft_id" integer NOT NULL,
	"nft_slug" text NOT NULL,
	"mvp" boolean DEFAULT false,
	CONSTRAINT "ballerz_nftID_unique" UNIQUE("nft_id"),
	CONSTRAINT "ballerz_nftSlug_unique" UNIQUE("nft_slug")
);
--> statement-breakpoint
CREATE TABLE "ballerz_meta" (
	"baller_id" integer PRIMARY KEY NOT NULL,
	"name" text,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ballerz_meta_name_length_check" CHECK (("ballerz_meta"."name" IS NULL) OR ((char_length(TRIM(BOTH FROM "ballerz_meta"."name")) >= 3) AND (char_length(TRIM(BOTH FROM "ballerz_meta"."name")) <= 50)))
);
--> statement-breakpoint
CREATE TABLE "ballerz_teams" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ballerz_teams_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" "team" NOT NULL,
	"gender" "gender" NOT NULL,
	"logo" text NOT NULL,
	"abbrev" text NOT NULL,
	"primary_color" text NOT NULL,
	"secondary_color" text NOT NULL,
	CONSTRAINT "ballerz_teams_name_unique" UNIQUE("name"),
	CONSTRAINT "abbrev_check" CHECK (char_length(TRIM(BOTH FROM "ballerz_teams"."abbrev")) >= 2 AND char_length(TRIM(BOTH FROM "ballerz_teams"."abbrev")) <= 3),
	CONSTRAINT "primary_color_check" CHECK (starts_with("ballerz_teams"."primary_color", '#') AND char_length("ballerz_teams"."primary_color") = 7),
	CONSTRAINT "secondary_color_check" CHECK (starts_with("ballerz_teams"."secondary_color", '#') AND char_length("ballerz_teams"."secondary_color") = 7)
);
--> statement-breakpoint
ALTER TABLE "ballerz" ADD CONSTRAINT "ballerz_team_id_ballerz_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."ballerz_teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ballerz_meta" ADD CONSTRAINT "ballerz_meta_baller_id_ballerz_id_fk" FOREIGN KEY ("baller_id") REFERENCES "public"."ballerz"("id") ON DELETE no action ON UPDATE no action;