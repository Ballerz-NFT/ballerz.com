import { Database } from "@/db/client";
import {
  and,
  arrayOverlaps,
  asc,
  between,
  desc,
  eq,
  inArray,
  sql,
  SQL,
} from "drizzle-orm";
import { ballerz, BallerzInsert, ballerzMeta, ballerzTeams } from "../schema";
import { ballerzData } from "../data/ballerz";
import {
  buildConflictUpdateColumns,
  getExtension,
  getFiles,
} from "../utils/helpers";

export type BallerzTeam =
  | "All-Stars"
  | "Team Dapper (W)"
  | "Team Flow (W)"
  | "Team Dapper (M)"
  | "Team Flow (M)"
  | "Miami Tentacles"
  | "Boulder Elks"
  | "San Jose Sirens"
  | "Charlotte Clovers"
  | "New York Golden Bulls"
  | "Pennsylvania Fangs"
  | "Austin Machines"
  | "Phoenix Skulls"
  | "Salt Lake City Souls"
  | "Las Vegas Scorpions"
  | "New York Torches"
  | "Omaha Bullsnakes"
  | "D.C. Dobermans"
  | "San Francisco Surge"
  | "Dallas Pythons"
  | "Alabama Kingpins"
  | "Los Angeles Knives"
  | "Orlando Freeze"
  | "St. Louis Orcs"
  | "Helena Pronghorns"
  | "Alaska Whales"
  | "New Jersey Scientists"
  | "New Orleans Giants"
  | "Los Angeles Mammoths"
  | "Sierra Spiders"
  | "Tampa Bay Omens"
  | "Iowa City Rattlesnakes"
  | "Toronto Spears"
  | "Minneapolis Express"
  | "Boston Rulers"
  | "Michigan Colliders"
  | "Portland Bats"
  | "Portland Creatures"
  | "Cleveland Firebirds"
  | "Seattle Scream"
  | "San Diego Keepers"
  | "Wisconsin Dragons"
  | "Delaware Horsemen"
  | "Houston Rogues"
  | "Nashville Miracle"
  | "Chicago Squid"
  | "Tallahassee Tarantulas";

export type GetBallerzParams = {
  cursor?: string | null;
  sort?: string[] | null;
  pageSize?: number;
  q?: string | null;
  team?: Array<BallerzTeam> | null;
  role?: Array<"Player" | "Captain" | "All-Star"> | null;
  jersey?: "Home" | "Away" | null;
  position?: string[] | null;
  face?: string[] | null;
  body?: string[] | null;
  accessories?: string[] | null;
  number?: number[] | null;
  shooting?: number[] | null;
  playmaking?: number[] | null;
  defense?: number[] | null;
  dunks?: number[] | null;
  overall?: number[] | null;
};

export async function importBallerz(db: Database) {
  const teams = await db.query.ballerzTeams.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  const files = getFiles("./public/images/ballerz");

  const ballerzValues: BallerzInsert[] = ballerzData.map((baller) => {
    const teamId = teams.find((t) => t.name === baller.team)!.id;
    const image = `/images/ballerz/${baller.id}.${getExtension(
      files,
      baller.id.toString()
    )}`;
    console.log({ image });

    return {
      ...baller,
      title: `Baller #${baller.id}`,
      number: parseInt(baller.number),
      gender: baller.gender ?? "M",
      hairColor: baller.hairColor ?? "Other",
      hairStyle: baller.hairStyle ?? "Custom",
      image,
      nftId: parseInt(baller.nftID),
      teamId,
    };
  });

  const CHUNK_SIZE = 250;

  const chunks = ballerzValues.reduce(
    (acc: Array<BallerzInsert[]>, _, i: number) => {
      if (i % CHUNK_SIZE === 0)
        acc.push(ballerzValues.slice(i, i + CHUNK_SIZE));
      return acc;
    },
    []
  );

  const promiseArray = chunks.map((values) => {
    return db
      .insert(ballerz)
      .values(values)
      .onConflictDoUpdate({
        target: ballerz.id,
        set: buildConflictUpdateColumns(ballerz, [
          "accessories",
          "body",
          "defense",
          "dunks",
          "face",
          "gender",
          "hair",
          "hairColor",
          "hairStyle",
          "image",
          "jersey",
          "mvp",
          "nftContract",
          "number",
          "playmaking",
          "role",
          "shooting",
          "teamId",
          "title",
        ]),
      })
      .returning({ id: ballerz.id });
  });

  const results = await Promise.all(promiseArray);

  return { updated: results.flat() };
}

export async function getBallerz(db: Database, params: GetBallerzParams) {
  const {
    cursor,
    pageSize = 10,
    q,
    sort,
    team,
    role,
    jersey,
    position,
    face,
    body,
    accessories,
    number,
    shooting,
    playmaking,
    defense,
    dunks,
    overall,
  } = params;

  const whereConditions: { [key: string]: SQL | undefined } = {};

  // Search query filter (id or name)
  if (q) {
    const numericQ = Number.parseFloat(q);
    if (!Number.isNaN(numericQ)) {
      whereConditions.q = sql`${ballerz.id} = ${numericQ}`;
    } else {
      // TODO: search by name
    }
  }

  if (jersey) {
    whereConditions.jersey = eq(ballerz.jersey, jersey);
  }
  if (team) {
    whereConditions.team = inArray(ballerzTeams.name, team);
  }
  if (role) {
    whereConditions.role = inArray(ballerz.role, role);
  }
  if (position) {
    whereConditions.position = inArray(ballerz.position, position);
  }
  if (face) {
    if (face.includes("None")) {
      // Include null/empty values if "none" is selected
      whereConditions.face = sql`(${inArray(
        ballerz.face,
        face.filter((f) => f !== "None")
      )} OR ${ballerz.face} IS NULL OR ${ballerz.face} = '')`;
    } else {
      whereConditions.face = inArray(ballerz.face, face);
    }
  }
  if (body) {
    whereConditions.body = inArray(ballerz.body, body);
  }
  if (accessories) {
    whereConditions.accessories = arrayOverlaps(
      ballerz.accessories,
      accessories
    );
  }
  if (number) {
    whereConditions.number = between(ballerz.number, number[0], number[1]);
  }
  if (shooting) {
    whereConditions.shooting = between(
      ballerz.shooting,
      shooting[0],
      shooting[1]
    );
  }
  if (playmaking) {
    whereConditions.playmaking = between(
      ballerz.playmaking,
      playmaking[0],
      playmaking[1]
    );
  }
  if (defense) {
    whereConditions.defense = between(ballerz.defense, defense[0], defense[1]);
  }
  if (dunks) {
    whereConditions.dunks = between(ballerz.dunks, dunks[0], dunks[1]);
  }
  if (overall) {
    whereConditions.overall = between(ballerz.overall, overall[0], overall[1]);
  }

  const finalWhereConditions = Object.values(whereConditions).filter(
    (c) => c !== undefined
  ) as SQL[];

  const queryBuilder = db
    .select({
      id: ballerz.id,
      title: ballerz.title,
      image: ballerz.image,
      team: {
        name: ballerzTeams.name,
      },
      role: ballerz.role,
      jersey: ballerz.jersey,
      number: ballerz.number,
      position: ballerz.position,
      face: ballerz.face,
      hair: ballerz.hair,
      body: ballerz.body,
      accessories: ballerz.accessories,
      shooting: ballerz.shooting,
      playmaking: ballerz.playmaking,
      defense: ballerz.defense,
      dunks: ballerz.dunks,
      overall: ballerz.overall,
      ballerz_meta: {
        name: ballerzMeta.name,
      },
    })
    .from(ballerz)
    .leftJoin(ballerzMeta, eq(ballerz.id, ballerzMeta.ballerId))
    .leftJoin(ballerzTeams, eq(ballerz.teamId, ballerzTeams.id))
    .where(and(...finalWhereConditions))
    .groupBy(
      ballerz.id,
      ballerz.title,
      ballerz.image,
      ballerzMeta.name,
      ballerzTeams.name,
      ballerz.role,
      ballerz.jersey,
      ballerz.number,
      ballerz.position,
      ballerz.face,
      ballerz.hair,
      ballerz.body,
      ballerz.accessories,
      ballerz.shooting,
      ballerz.playmaking,
      ballerz.defense,
      ballerz.dunks,
      ballerz.overall,
      ballerz.accessories
    );

  let query = queryBuilder.$dynamic();

  // Sorting
  if (sort && sort.length === 2) {
    const [column, direction] = sort;
    const isAscending = direction === "asc";
    const order = isAscending ? asc : desc;

    if (column === "id") {
      query = query.orderBy(order(ballerz.id));
    } else if (column === "name") {
      query = query.orderBy(order(ballerzMeta.name), asc(ballerz.id));
    } else if (column === "team") {
      query = query.orderBy(order(ballerzMeta.name), asc(ballerz.id));
    } else if (column === "role") {
      query = query.orderBy(order(ballerz.role), asc(ballerz.id));
    } else if (column === "jersey") {
      query = query.orderBy(order(ballerz.jersey), asc(ballerz.id));
    } else if (column === "number") {
      query = query.orderBy(order(ballerz.number), asc(ballerz.id));
    } else if (column === "position") {
      query = query.orderBy(order(ballerz.position), asc(ballerz.id));
    } else if (column === "face") {
      query = query.orderBy(order(ballerz.face), asc(ballerz.id));
    } else if (column === "hair") {
      query = query.orderBy(order(ballerz.hair), asc(ballerz.id));
    } else if (column === "body") {
      query = query.orderBy(order(ballerz.body), asc(ballerz.id));
    } else if (column === "shooting") {
      query = query.orderBy(order(ballerz.shooting), asc(ballerz.id));
    } else if (column === "playmaking") {
      query = query.orderBy(order(ballerz.playmaking), asc(ballerz.id));
    } else if (column === "defense") {
      query = query.orderBy(order(ballerz.defense), asc(ballerz.id));
    } else if (column === "dunks") {
      query = query.orderBy(order(ballerz.dunks), asc(ballerz.id));
    } else if (column === "overall") {
      query = query.orderBy(order(ballerz.overall), asc(ballerz.id));
    } else {
      query = query.orderBy(asc(ballerz.id));
    }
  } else {
    query = query.orderBy(asc(ballerz.id));
  }

  const offset = cursor ? Number.parseInt(cursor, 10) : 0;
  const finalQuery = query.limit(pageSize).offset(offset);

  const fetchedData = await finalQuery;

  const hasNextPage = fetchedData.length === pageSize;
  const nextCursor = hasNextPage ? (offset + pageSize).toString() : undefined;

  const teamWhereConditions = Object.values(whereConditions).filter(
    (c) => c !== undefined && c !== whereConditions.team
  ) as SQL[];

  console.log(
    db
      .select({
        id: sql<string>`regexp_replace(regexp_replace(regexp_replace(lower(${ballerzTeams.name}::text, 'none')), '[^a-z0-9\\-_]+', '-', 'gi'), '\\-+$', ''), '^\\-', '')`,
        label: ballerzTeams.name,
        value: sql<number>`cast(count(${ballerz.id}) as int)`,
      })
      .from(ballerz)
      .where(and(...teamWhereConditions))
      .leftJoin(ballerzTeams, eq(ballerz.teamId, ballerzTeams.id))
      .groupBy(ballerz.teamId, ballerzTeams.name)
      .orderBy(asc(ballerzTeams.name))
      .toSQL()
  );

  const teamFacets = await db
    .select({
      id: sql<string>`regexp_replace(regexp_replace(regexp_replace(lower(${ballerzTeams.name}::text), '[^a-z0-9\\-_]+', '-', 'gi'), '\\-+$', ''), '^\\-', '')`,
      label: ballerzTeams.name,
      value: sql<number>`cast(count(${ballerz.id}) as int)`,
    })
    .from(ballerz)
    .where(and(...teamWhereConditions))
    .leftJoin(ballerzTeams, eq(ballerz.teamId, ballerzTeams.id))
    .groupBy(ballerz.teamId, ballerzTeams.name)
    .orderBy(asc(ballerzTeams.name));

  const roleWhereConditions = Object.values(whereConditions).filter(
    (c) => c !== undefined && c !== whereConditions.role
  ) as SQL[];

  const roleFacets = await db
    .select({
      id: sql<string>`regexp_replace(regexp_replace(regexp_replace(lower(${ballerz.role}::text), '[^a-z0-9\\-_]+', '-', 'gi'), '\\-+$', ''), '^\\-', '')`,
      label: ballerz.role,
      value: sql<number>`cast(count(${ballerz.id}) as int)`,
    })
    .from(ballerz)
    .where(and(...roleWhereConditions))
    .groupBy(ballerz.role);

  const jerseyWhereConditions = Object.values(whereConditions).filter(
    (c) => c !== undefined && c !== whereConditions.jersey
  ) as SQL[];

  const jerseyFacets = await db
    .select({
      id: sql<string>`regexp_replace(regexp_replace(regexp_replace(lower(${ballerz.jersey}::text), '[^a-z0-9\\-_]+', '-', 'gi'), '\\-+$', ''), '^\\-', '')`,
      label: ballerz.jersey,
      value: sql<number>`cast(count(${ballerz.id}) as int)`,
    })
    .from(ballerz)
    .where(and(...jerseyWhereConditions))
    .groupBy(ballerz.jersey);

  const positionWhereConditions = Object.values(whereConditions).filter(
    (c) => c !== undefined && c !== whereConditions.position
  ) as SQL[];

  const positionFacets = await db
    .select({
      id: sql<string>`regexp_replace(regexp_replace(regexp_replace(lower(coalesce(${ballerz.position}, 'none')), '[^a-z0-9\\-_]+', '-', 'gi'), '\\-+$', ''), '^\\-', '')`,
      label: ballerz.position,
      value: sql<number>`cast(count(${ballerz.id}) as int)`,
    })
    .from(ballerz)
    .where(and(...positionWhereConditions))
    .groupBy(ballerz.position);

  const faceWhereConditions = Object.values(whereConditions).filter(
    (c) => c !== undefined && c !== whereConditions.face
  ) as SQL[];

  const faceFacets = await db
    .select({
      id: sql<string>`regexp_replace(regexp_replace(regexp_replace(lower(coalesce(${ballerz.face}, 'none')), '[^a-z0-9\\-_]+', '-', 'gi'), '\\-+$', ''), '^\\-', '')`,
      label: sql<string>`coalesce(${ballerz.face}, 'None')`,
      value: sql<number>`cast(count(${ballerz.id}) as int)`,
    })
    .from(ballerz)
    .where(and(...faceWhereConditions))
    .groupBy(ballerz.face)
    .orderBy(sql`${ballerz.face} asc nulls first`);

  const bodyWhereConditions = Object.values(whereConditions).filter(
    (c) => c !== undefined && c !== whereConditions.body
  ) as SQL[];

  const bodyFacets = await db
    .select({
      id: sql<string>`regexp_replace(regexp_replace(regexp_replace(lower(coalesce(${ballerz.body}, 'none')), '[^a-z0-9\\-_]+', '-', 'gi'), '\\-+$', ''), '^\\-', '')`,
      label: sql<string>`coalesce(${ballerz.body}, 'None')`,
      value: sql<number>`cast(count(${ballerz.id}) as int)`,
    })
    .from(ballerz)
    .where(and(...bodyWhereConditions))
    .groupBy(ballerz.body)
    .orderBy(asc(ballerz.body));

  const accessoryWhereConditions = Object.values(whereConditions).filter(
    (c) => c !== undefined && c !== whereConditions.accessories
  ) as SQL[];

  const accessory_table = db
    .select({
      id: ballerz.id,
      accessory: sql<string>`unnest(${ballerz.accessories})`.as("accessory"),
    })
    .from(ballerz)
    .where(and(...accessoryWhereConditions))
    .as("accessory_table");

  const accessoryFacets = await db
    .select({
      id: sql<string>`regexp_replace(regexp_replace(regexp_replace(lower(coalesce(${accessory_table.accessory}, 'none')), '[^a-z0-9\\-_]+', '-', 'gi'), '\\-+$', ''), '^\\-', '')`,
      label: sql<string>`coalesce(${accessory_table.accessory}, 'None')`,
      value: sql<number>`cast(count(${accessory_table.id}) as int)`,
    })
    .from(accessory_table)
    .groupBy(accessory_table.accessory)
    .orderBy(asc(accessory_table.accessory));

  return {
    meta: {
      cursor: nextCursor,
      hasPreviousPage: offset > 0,
      hasNextPage: hasNextPage,
      facets: {
        teams: teamFacets,
        roles: roleFacets,
        jerseys: jerseyFacets,
        positions: positionFacets,
        faces: faceFacets,
        bodies: bodyFacets,
        accessories: accessoryFacets,
      },
    },
    data: fetchedData,
  };
}
