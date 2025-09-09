import GameSim, { OptionsOverride } from "../gamesim/GameSim";
import type {
  AnimationData,
  AnimationDataWithID,
} from "../gamesim/AnimationData";
import { Team, TeamData } from "../gamesim/Team";
import * as TeamExtractor from "./TeamExtractor";

type TeamResult = {
  teamID: number;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type TeamWithSeed = TeamResult & { seed: number };

export function getPlayoffRound(teams: TeamWithSeed[]) {
  const lowSeeds = teams.slice(0, teams.length / 2);
  const topSeeds = teams.slice(teams.length / 2);

  const roundMatches: TeamWithSeed[][] = [];

  for (let i = 0; i < topSeeds.length; i++) {
    const teamA = topSeeds[i];
    const teamB = lowSeeds[lowSeeds.length - 1 - i];

    roundMatches.push([teamA, teamB]);
  }

  return roundMatches;
}

/**
 * Single match simulation
 * @param homeTeamData TeamData for home team
 * @param awayTeamData TeamData for away team
 * @param [startTimestamp] timestamp (milliseconds since epoch) of when the game is scheduled to be aired. This will be used as a seed for the random number generator. The output timestamp might not be exactly the same as this value if you are forcing a result since we need to get new seeds for different results, in which case your start timestamp will be off by a couple of miliseconds or so. If not specified, the current time will be used
 * @param [forcedWinner] optionally force the winner of the match. If not specified, the winner will be random
 * @returns simulation object ready to be fed into the moviemaker
 */
export function singleSimulation(
  homeTeamData: Omit<TeamData, "stat">,
  awayTeamData: Omit<TeamData, "stat">,
  options?: OptionsOverride,
  startTimestamp?: number,
  forcedWinner?: "home" | "away"
): AnimationData {
  if (startTimestamp == undefined) {
    startTimestamp = Date.now();
  }
  let simulatedMatch: AnimationData;

  const homeTeam = new Team(homeTeamData);
  const awayTeam = new Team(awayTeamData);

  const needForceWinner = forcedWinner != undefined;
  const forceHomeWinner = forcedWinner == "home";

  let simulatorWonHome = false;
  do {
    homeTeam?.reset();
    awayTeam?.reset();
    const sim = new GameSim({
      teams: [homeTeam, awayTeam],
      allStarGame: false,
      timeStamp: startTimestamp,
      options: options ?? {},
    });

    simulatedMatch = sim.run();
    simulatorWonHome =
      simulatedMatch.teams[0].stat.pts > simulatedMatch.teams[1].stat.pts;

    startTimestamp++; // add one milisecond to the date to get a different random next loop
  } while (needForceWinner && simulatorWonHome != forceHomeWinner);

  return simulatedMatch;
}

export function simulateFromPlayoffsTournament(
  rawData: any,
  teams: TeamWithSeed[],
  options?: OptionsOverride,
  getGameID?: () => number
) {
  const allTeams = TeamExtractor.extractTeams(rawData);
  const firstRoundMatchups = getPlayoffRound(teams);

  let nextRound;

  nextRound = firstRoundMatchups.map((matchup) => {
    return {
      home: {
        tid: matchup[0].teamID,
        won: 0,
        seed: matchup[0].seed,
        cid: 0,
      },
      away: {
        tid: matchup[1].teamID,
        won: 0,
        seed: matchup[1].seed,
        cid: 0,
      },
    };
  });

  const allMatches: AnimationDataWithID[] = [];

  while (nextRound !== null) {
    const roundGames = nextRound
      .map((match: any) => {
        const homeTeamId = match.home.tid;
        const awayTeamId = match.away.tid;

        if (typeof homeTeamId !== "number" || typeof awayTeamId !== "number") {
          throw new Error("Invalid match teams");
        }

        if (homeTeamId < 0 || awayTeamId < 0) {
          console.log("Negative teams found, skipping...");
          return undefined;
        }

        if (homeTeamId === awayTeamId) {
          throw new Error("Match teams are the same");
        }

        const homeTeam = allTeams.find((t) => t.id == homeTeamId);
        const awayTeam = allTeams.find((t) => t.id == awayTeamId);

        if (!homeTeam || !awayTeam) {
          throw new Error("Match teams not found");
        }

        const sim = singleSimulation(homeTeam, awayTeam, options);

        return {
          ...sim,
          id: crypto.randomUUID(),
          gid: getGameID?.() || Math.floor(Math.random() * 1000000),
          day: null,
        };
      })
      .filter(Boolean) as AnimationDataWithID[];

    allMatches.push(...roundGames);

    if (roundGames.length === 1) {
      nextRound = null;
      continue;
    }

    const winnerTeamsIDs = roundGames.map((game) => {
      const winner =
        game.teams[0].stat.pts > game.teams[1].stat.pts
          ? game.teams[0]
          : game.teams[1];
      return winner.id;
    });

    const winnerTeamsWithSeed = teams.filter((t) =>
      winnerTeamsIDs.includes(t.teamID)
    );
    const nextRoundMatches = getPlayoffRound(winnerTeamsWithSeed);

    nextRound = nextRoundMatches.map((matchup) => {
      return {
        home: {
          tid: matchup[0].teamID,
          won: 0,
          seed: matchup[0].seed,
          cid: 0,
        },
        away: {
          tid: matchup[1].teamID,
          won: 0,
          seed: matchup[1].seed,
          cid: 0,
        },
      };
    });
  }

  console.log("ALL MATCHES RESULT:");
  console.log(
    JSON.stringify(
      allMatches.map((match) => {
        return {
          teams: [match.teams[0].name, match.teams[1].name],
          result: match.teams[0].stat.pts + " - " + match.teams[1].stat.pts,
        };
      }),
      null,
      2
    )
  );

  return allMatches;
}

export function simulateFromRegularSeason(
  rawData: any,
  options?: OptionsOverride,
  getGameID?: () => number
) {
  const allTeams = TeamExtractor.extractTeams(rawData);

  const { schedule } = rawData;

  const dayOffset = schedule[0].day;

  const games = schedule
    .map((game: any, index: number) => {
      console.log("simulating game", index, "of", schedule.length, "...");
      const homeTeamId = game.homeTid;
      const awayTeamId = game.awayTid;

      if (typeof homeTeamId !== "number" || typeof awayTeamId !== "number") {
        throw new Error("Invalid match teams");
      }

      if (homeTeamId < 0 || awayTeamId < 0) {
        console.log("Negative teams found, skipping...");
        return undefined;
      }

      if (homeTeamId === awayTeamId) {
        throw new Error("Match teams are the same");
      }

      const homeTeam = allTeams.find((t) => t.id == homeTeamId);
      const awayTeam = allTeams.find((t) => t.id == awayTeamId);

      if (!homeTeam || !awayTeam) {
        throw new Error("Match teams not found");
      }

      const sim = singleSimulation(homeTeam, awayTeam, options);
      return {
        ...sim,
        id: crypto.randomUUID(),
        gid: getGameID?.() || Math.floor(Math.random() * 1000000),
        day: game.day - dayOffset + 1,
      };
    })
    .filter(Boolean) as AnimationDataWithID[];

  return games;
}

/**
 * Simulates all season from league export data
 * @param rawData The raw exported data for the league
 * @param timestampArray Array of timestamps (milliseconds since epoch) for each game. The length of this array must be equal to the number of games in the league. The timestamp will be used as a seed for the random number generator. The output timestamp might not be exactly the same as this as we are forcing a result and we need to get new seeds for different results, in which case your start timestamp will be off by a couple of miliseconds or so. If not specified or the array isn't long enough, the current time will be used
 * @returns from league file
 */
export function simulateFromLeagueData(
  rawData: any,
  timestampArray?: number[]
): AnimationDataWithID[] {
  if (timestampArray == undefined) {
    timestampArray = [];
  }
  const allTeams = TeamExtractor.extractTeams(rawData);
  const retval: AnimationDataWithID[] = [];
  let gameNum = 0;

  for (const bracket of rawData.playoffSeries[0].series) {
    for (const match of bracket) {
      const homeTeam = allTeams.find((t) => t.id == match.home.tid);
      const awayTeam = allTeams.find((t) => t.id == match.away.tid);

      if (homeTeam && awayTeam) {
        const sim = singleSimulation(
          homeTeam,
          awayTeam,
          {},
          timestampArray[gameNum] ?? Date.now()
        );

        retval.push({ ...sim, id: crypto.randomUUID(), day: null, gid: 1 });
      } else {
        throw new Error(
          (homeTeam
            ? ""
            : `homeTeam id ${String(match.home.tid)} not found in teams! `) +
            (awayTeam
              ? ""
              : `awayTeam id ${String(match.away.tid)} not found in teams! `)
        );
      }
      gameNum++;
    }
  }

  return retval;
}
