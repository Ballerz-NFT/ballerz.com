import z from "zod";

export const getBallerzSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    sort: z.array(z.string()).nullable().optional(),
    pageSize: z.coerce.number().min(1).max(1000).optional(),
    q: z.string().nullable().optional(),
    team: z
      .array(
        z.enum([
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
        ])
      )
      .nullable()
      .optional(),
    role: z
      .array(z.enum(["Player", "Captain", "All-Star"]))
      .nullable()
      .optional(),
    jersey: z.enum(["Home", "Away"]).nullable().optional(),
    position: z.array(z.string()).nullable().optional(),
    face: z.array(z.string()).nullable().optional(),
    body: z.array(z.string()).nullable().optional(),
    accessories: z.array(z.string()).nullable().optional(),
    number: z.array(z.number()).nullable().optional(),
    shooting: z.array(z.number()).nullable().optional(),
    playmaking: z.array(z.number()).nullable().optional(),
    defense: z.array(z.number()).nullable().optional(),
    dunks: z.array(z.number()).nullable().optional(),
    overall: z.array(z.number()).nullable().optional(),
  })
  .optional();

export const ballerResponseSchema = z.object({
  id: z.number(),
  img: z.string(),
  team: z.enum([
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
  ]),
  jersey: z.enum(["Home", "Away"]),
  number: z.number(),
  position: z.string(),
  face: z.string().nullable().optional(),
  hair: z.string(),
  body: z.string(),
  accessories: z.array(z.string()),
  shooting: z.number(),
  playmaking: z.number(),
  defense: z.number(),
  dunks: z.number(),
  overall: z.number(),
  ballerz_meta: z
    .object({
      name: z.string(),
    })
    .nullable(),
});

export const ballerzResponseSchema = z.object({
  meta: z.object({
    cursor: z.string().optional(),
    hasPreviousPage: z.boolean(),
    hasNextPage: z.boolean(),
    facets: z.object({
      teams: z.array(
        z.object({
          id: z.string(),
          label: z.string().nullable(),
          value: z.number(),
        })
      ),
      roles: z.array(
        z.object({
          id: z.string(),
          label: z.string().nullable(),
          value: z.number(),
        })
      ),
      jerseys: z.array(
        z.object({
          id: z.string(),
          label: z.string().nullable(),
          value: z.number(),
        })
      ),
      positions: z.array(
        z.object({
          id: z.string(),
          label: z.string().nullable(),
          value: z.number(),
        })
      ),
      faces: z.array(
        z.object({
          id: z.string(),
          label: z.string().nullable(),
          value: z.number(),
        })
      ),
      bodies: z.array(
        z.object({
          id: z.string(),
          label: z.string().nullable(),
          value: z.number(),
        })
      ),
      accessories: z.array(
        z.object({
          id: z.string(),
          label: z.string().nullable(),
          value: z.number(),
        })
      ),
    }),
  }),
  data: z.array(ballerResponseSchema),
});

export const ballerzImportResponseSchema = z.object({
  updated: z.array(z.object({ id: z.number() })),
});
