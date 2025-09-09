import { Database } from "@/db/client";
import { teamData } from "../data/ballerz-teams";
import { BallerzTeamInsert, ballerzTeams } from "../schema";
import { sql } from "drizzle-orm";

export async function importTeams(db: Database) {
  const teams: BallerzTeamInsert[] = Object.values(teamData).map((team) => {
    return {
      name: team.name,
      gender: team.gender,
      abbrev: team.abbreviation,
      primaryColor: team.colors[0],
      secondaryColor: team.colors[1],
      logo: team.image,
    };
  });

  const result = await db
    .insert(ballerzTeams)
    .values(teams)
    .onConflictDoUpdate({
      target: ballerzTeams.name,
      set: { ...teams, name: sql`${ballerzTeams.name}` },
    })
    .returning({ id: ballerzTeams.id });

  return { updated: result };
}
