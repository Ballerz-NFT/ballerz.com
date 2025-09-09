import type { PlayerData } from "../gamesim/Player";
import * as Random from "../gamesim/Random";
import type { TeamData } from "../gamesim/Team";

// functions to parse a bbgm league and extracts teams and players

export function extractPlayers(
  rawData: any
): Record<string, Omit<PlayerData, "stat">[]> {
  const players: Record<string, Omit<PlayerData, "stat">[]> = {};

  for (const p of rawData.players) {
    if (p.tid >= 0) {
      players[p.tid] = players[p.tid] ?? [];
      const playerName = `${String(p.firstName)} ${String(p.lastName)}`;
      const regex = /#(\d*)/g;

      players[p.tid].push({
        age: p.pid,
        id: Number.parseInt(playerName.match(regex)![0].replace("#", "")),
        name: playerName,
        previouslyInjured: false,
        ratings: p.ratings[0],
        baller: Number.parseInt(playerName.match(regex)![0].replace("#", "")),
        sneakerz: Number.parseInt(p.college.match(regex)![0].replace("#", "")),
      });
    }
  }

  return players;
}

export function extractTeams(rawData: any): Omit<TeamData, "stat">[] {
  const players = extractPlayers(rawData);
  const retval: Omit<TeamData, "stat">[] = [];
  for (const team of rawData.teams) {
    if (team.tid < 0) {
      console.log("negative team is bad");
      continue;
    }
    const teamName = String(team.region) + String(team.name);
    retval.push({
      name: teamName,
      firstName: team.name,
      region: team.region,
      id: team.tid,
      pace: 100,
      player: players[team.tid],
      abbrev: team.abbrev,
      logo: team.imgURL,
      ...Random.makeTeamColors(teamName),
    });
  }
  return retval;
}
