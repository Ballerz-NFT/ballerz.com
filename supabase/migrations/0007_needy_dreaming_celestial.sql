CREATE TYPE "public"."design" AS ENUM('Cross Trainer', 'Hightop', 'Lowtop', 'Super Hightop', 'Super Hightops', 'Trainer');--> statement-breakpoint
CREATE TYPE "public"."enhancement" AS ENUM('Ankle Breaker', 'Bullseye', 'Drive the Lane', 'Stopping on a Dime');--> statement-breakpoint
CREATE TYPE "public"."rarity" AS ENUM('Common', 'Custom', 'Iconic', 'Legendary', 'Rare', 'Uncommon');--> statement-breakpoint
CREATE TABLE "sneakerz" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"image" text NOT NULL,
	"background" text NOT NULL,
	"color_1" text NOT NULL,
	"color_2" text NOT NULL,
	"color_3" text NOT NULL,
	"color_4" text NOT NULL,
	"design" text NOT NULL,
	"style" text NOT NULL,
	"accessory" text NOT NULL,
	"enhancement" "enhancement",
	"rarity" "rarity" NOT NULL,
	"jump" integer NOT NULL,
	"drip_factor" integer NOT NULL,
	"has_number" boolean GENERATED ALWAYS AS ("sneakerz"."style" = '210') STORED,
	"is_team_color" boolean GENERATED ALWAYS AS ("sneakerz"."style" ~ '^.+ [0-9]{3}$') STORED
);
--> statement-breakpoint
ALTER TABLE "ballerz" ALTER COLUMN "team_id" SET NOT NULL;