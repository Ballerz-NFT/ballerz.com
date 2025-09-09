import fs from "fs";
import { Database } from "@/db/client";
import { sneakerz, SneakerzInsert } from "../schema";
import {
  buildConflictUpdateColumns,
  getExtension,
  getFiles,
} from "../utils/helpers";
import { sneakerzData, SneakerzImportData } from "../data/sneakerz";

export async function importSneakerz(db: Database) {
  const teams = await db.query.ballerzTeams.findMany({
    columns: {
      id: true,
      name: true,
    },
  });

  const files = getFiles("./public/images/sneakerz");

  const sneakerzValues: SneakerzInsert[] = sneakerzData.map(
    (item: SneakerzImportData) => {
      const team_name = /^(.+) \d{3}$/.test(item.style)
        ? item.style.replace(/ \d{3}$/, "")
        : null;
      const teamId = teams.find((t) => t.name === team_name)?.id;
      const image = `/images/sneakerz/${item.id}.${getExtension(
        files,
        item.id.toString()
      )}`;
      console.log({ image });

      return {
        id: item.id,
        title: item.title,
        rarity: item.rarity as
          | "Custom"
          | "Common"
          | "Iconic"
          | "Legendary"
          | "Rare"
          | "Uncommon",
        design: item.design,
        image,
        teamId,
        background: item.background,
        color1: item.color1,
        color2: item.color2,
        color3: item.color3,
        color4: item.color4,
        style: item.style,
        accessory: item.accessory !== "None" ? item.accessory : null,
        jump: item.jump,
        dripFactor: item.dripFactor,
        enhancement: item.enhancement as
          | "Ankle Breaker"
          | "Bullseye"
          | "Drive the Lane"
          | "Stopping on a Dime"
          | null
          | undefined,
      };
    }
  );

  const CHUNK_SIZE = 250;

  const chunks = sneakerzValues.reduce(
    (acc: Array<SneakerzInsert[]>, _, i: number) => {
      if (i % CHUNK_SIZE === 0)
        acc.push(sneakerzValues.slice(i, i + CHUNK_SIZE));
      return acc;
    },
    []
  );

  const promiseArray = chunks.map((values) => {
    return db
      .insert(sneakerz)
      .values(values)
      .onConflictDoUpdate({
        target: sneakerz.id,
        set: buildConflictUpdateColumns(sneakerz, [
          "accessory",
          "background",
          "color1",
          "color2",
          "color3",
          "color4",
          "design",
          "dripFactor",
          "enhancement",
          "image",
          "jump",
          "rarity",
          "style",
          "teamId",
          "title",
        ]),
      })
      .returning({ id: sneakerz.id });
  });

  const results = await Promise.all(promiseArray);

  return { updated: results.flat() };
}
