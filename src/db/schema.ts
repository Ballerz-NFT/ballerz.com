import {
  pgTable,
  integer,
  text,
  numeric,
  check,
  pgEnum,
  boolean,
  uniqueIndex,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations, SQL, sql } from "drizzle-orm";
import { timestamps } from "./utils/helpers";

export const genderEnum = pgEnum("gender", ["M", "W"]);

export const ballerzTeamEnum = pgEnum("team", [
  "All-Stars",
  "Team Dapper (W)",
  "Team Flow (W)",
  "Team Dapper (M)",
  "Team Flow (M)",
  "Miami Tentacles",
  "Boulder Elks",
  "San Jose Sirens",
  "Charlotte Clovers",
  "New York Golden Bulls",
  "Pennsylvania Fangs",
  "Austin Machines",
  "Phoenix Skulls",
  "Salt Lake City Souls",
  "Las Vegas Scorpions",
  "New York Torches",
  "Omaha Bullsnakes",
  "D.C. Dobermans",
  "San Francisco Surge",
  "Dallas Pythons",
  "Alabama Kingpins",
  "Los Angeles Knives",
  "Orlando Freeze",
  "St. Louis Orcs",
  "Helena Pronghorns",
  "Alaska Whales",
  "New Jersey Scientists",
  "New Orleans Giants",
  "Los Angeles Mammoths",
  "Sierra Spiders",
  "Tampa Bay Omens",
  "Iowa City Rattlesnakes",
  "Toronto Spears",
  "Minneapolis Express",
  "Boston Rulers",
  "Michigan Colliders",
  "Portland Bats",
  "Portland Creatures",
  "Cleveland Firebirds",
  "Seattle Scream",
  "San Diego Keepers",
  "Wisconsin Dragons",
  "Delaware Horsemen",
  "Houston Rogues",
  "Nashville Miracle",
  "Chicago Squid",
  "Tallahassee Tarantulas",
]);

export const ballerzRoleEnum = pgEnum("role", [
  "Player",
  "Captain",
  "All-Star",
]);

export const ballerzJerseyEnum = pgEnum("jersey", ["Home", "Away"]);

export const ballerzHairColorEnum = pgEnum("hair_color", [
  "Orange",
  "Blue",
  "Light Brown",
  "Red",
  "Blonde",
  "Purple",
  "Pink",
  "Black",
  "Other",
  "Brown",
  "Brunette",
  "Light Brunette",
  "Custom",
]);

export const sneakerzEnhancementEnum = pgEnum("enhancement", [
  "Ankle Breaker",
  "Bullseye",
  "Drive the Lane",
  "Stopping on a Dime",
]);

export const sneakerzRarityEnum = pgEnum("rarity", [
  "Common",
  "Custom",
  "Iconic",
  "Legendary",
  "Rare",
  "Uncommon",
]);

export const sneakerzDesignEnum = pgEnum("design", [
  "Cross Trainer",
  "Hightop",
  "Lowtop",
  "Super Hightop",
  "Super Hightops",
  "Trainer",
]);

export const nonces = pgTable("nonces", {
  id: text().primaryKey().notNull(),
  expires: timestamp({ withTimezone: true, mode: "string" })
    .default(sql`(now() + '00:10:00'::interval)`)
    .notNull(),
});

export const ballerzTeams = pgTable(
  "ballerz_teams",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: ballerzTeamEnum().notNull().unique(),
    gender: genderEnum().notNull(),
    logo: text().notNull(),
    abbrev: text().notNull(),
    primaryColor: text().notNull(),
    secondaryColor: text().notNull(),
  },
  (table) => [
    uniqueIndex("ballerz_team_name_idx").on(table.name),
    uniqueIndex("ballerz_team_abbrev_idx").on(table.abbrev),
    check(
      "abbrev_check",
      sql`char_length(TRIM(BOTH FROM ${table.abbrev})) >= 2 AND char_length(TRIM(BOTH FROM ${table.abbrev})) <= 3`
    ),
    check(
      "primary_color_check",
      sql`starts_with(${table.primaryColor}, '#') AND char_length(${table.primaryColor}) = 7`
    ),
    check(
      "secondary_color_check",
      sql`starts_with(${table.secondaryColor}, '#') AND char_length(${table.secondaryColor}) = 7`
    ),
  ]
);

export type BallerzTeamSelect = typeof ballerzTeams.$inferSelect;
export type BallerzTeamInsert = typeof ballerzTeams.$inferInsert;

export const ballerz = pgTable("ballerz", {
  id: integer().primaryKey(),
  role: ballerzRoleEnum().notNull(),
  title: text().notNull(),
  image: text().notNull(),
  teamId: integer("team_id")
    .references(() => ballerzTeams.id)
    .notNull(),
  gender: genderEnum().notNull(),
  jersey: ballerzJerseyEnum().notNull(),
  number: integer().notNull(),
  face: text(),
  hair: text().notNull(),
  hairColor: ballerzHairColorEnum("hair_color").default("Other").notNull(),
  hairStyle: text("hair_style").notNull(),
  body: text().notNull(),
  accessories: text().array().default([""]).notNull(),
  shooting: integer().notNull(),
  playmaking: integer().notNull(),
  defense: integer().notNull(),
  dunks: integer().notNull(),
  position: text().generatedAlwaysAs(
    (): SQL =>
      sql`
        CASE
            WHEN (((GREATEST(${ballerz.dunks}, ${ballerz.shooting}, ${ballerz.playmaking}) = ${ballerz.playmaking}) AND (LEAST(${ballerz.dunks}, ${ballerz.shooting}, ${ballerz.playmaking}) = ${ballerz.dunks}) AND ((${ballerz.playmaking} - ${ballerz.dunks}) > 5) AND (${ballerz.shooting} < (${ballerz.playmaking} - 2))) OR ((${ballerz.playmaking} - ${ballerz.dunks}) > 15)) THEN 'PG'::text
            WHEN ((GREATEST(${ballerz.dunks}, ${ballerz.shooting}, ${ballerz.playmaking}) = ${ballerz.dunks}) AND (LEAST(${ballerz.dunks}, ${ballerz.shooting}, ${ballerz.playmaking}) = ${ballerz.playmaking})) THEN 'C'::text
            WHEN ((GREATEST(${ballerz.dunks}, ${ballerz.shooting}, ${ballerz.playmaking}) - LEAST(${ballerz.dunks}, ${ballerz.shooting}, ${ballerz.playmaking})) <= 8) THEN 'SF'::text
            WHEN (${ballerz.shooting} > ${ballerz.dunks}) THEN 'SG'::text
            WHEN (${ballerz.dunks} >= ${ballerz.shooting}) THEN 'PF'::text
            ELSE ''::text
        END
      `
  ),
  overall: numeric({ mode: "number" }).generatedAlwaysAs(
    (): SQL =>
      sql`round(((float8((((${ballerz.dunks} + ${ballerz.shooting}) + ${ballerz.playmaking}) + ${ballerz.defense})) / (4)::double precision))::numeric, 2)`
  ),
  nftContract: text("nft_contract").notNull(),
  nftId: integer("nft_id").notNull().unique(),
  nftSlug: text("nft_slug").notNull().unique(),
  mvp: boolean().default(false),
});

export const ballerzRelations = relations(ballerz, ({ one }) => ({
  team: one(ballerzTeams, {
    fields: [ballerz.teamId],
    references: [ballerzTeams.id],
  }),
}));

export type BallerzSelect = typeof ballerz.$inferSelect;
export type BallerzInsert = typeof ballerz.$inferInsert;

export const ballerzMeta = pgTable(
  "ballerz_meta",
  {
    ballerId: integer("baller_id")
      .primaryKey()
      .references(() => ballerz.id),
    name: text(),
    ...timestamps,
  },
  (table) => [
    check(
      "ballerz_meta_name_length_check",
      sql`(${table.name} IS NULL) OR ((char_length(TRIM(BOTH FROM ${table.name})) >= 3) AND (char_length(TRIM(BOTH FROM ${table.name})) <= 50))`
    ),
  ]
);

export const sneakerz = pgTable("sneakerz", {
  id: integer().primaryKey(),
  title: text().notNull(),
  image: text().notNull(),
  background: text().notNull(),
  color1: text("color_1").notNull(),
  color2: text("color_2").notNull(),
  color3: text("color_3").notNull(),
  color4: text("color_4").notNull(),
  design: text().notNull(),
  style: text("style").notNull(),
  accessory: text(),
  enhancement: sneakerzEnhancementEnum(),
  rarity: sneakerzRarityEnum().notNull(),
  jump: integer().notNull(),
  dripFactor: integer("drip_factor").notNull(),
  hasNumber: boolean("has_number").generatedAlwaysAs(
    (): SQL => sql`${sneakerz.style} = '210'`
  ),
  isTeamColor: boolean("is_team_color").generatedAlwaysAs(
    (): SQL => sql`${sneakerz.style} ~ '^.+ [0-9]{3}$'`
  ),
  teamName: text("team_name").generatedAlwaysAs(
    (): SQL => sql`CASE 
        WHEN style ~ '^.+ [0-9]{3}$' THEN REGEXP_REPLACE(style, ' [0-9]{3}$', '')
        ELSE NULL
    END`
  ),
  teamId: integer("team_id").references(() => ballerzTeams.id),
});

export type SneakerzSelect = typeof sneakerz.$inferSelect;
export type SneakerzInsert = typeof sneakerz.$inferInsert;

export const sneakerzRelations = relations(sneakerz, ({ one }) => ({
  team: one(ballerzTeams, {
    fields: [sneakerz.teamId],
    references: [ballerzTeams.id],
  }),
}));
