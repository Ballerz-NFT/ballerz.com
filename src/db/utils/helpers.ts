import { getTableColumns, SQL, sql } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";
import { PgTable, timestamp } from "drizzle-orm/pg-core";
import fs from "fs";

export function getFiles(rootDir: string) {
  const files = fs.readdirSync(rootDir);
  // (4) [ 'a.js', 'b.ts', 'index.js', 'README.md', 'package.json' ]
  return files;
}

export function getExtension(files: string[], entry: string) {
  const filename = files.find((file) => {
    // return the first files that include given entry
    return file.includes(entry);
  });

  if (!filename) return null;

  const extension = filename.split(".").pop();

  return extension;
}

export const timestamps = {
  updated_at: timestamp({ withTimezone: true, mode: "string" }).$onUpdate(() =>
    new Date().toISOString()
  ),
  created_at: timestamp({ withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
};

export const buildConflictUpdateColumns = <
  T extends PgTable,
  Q extends keyof T["_"]["columns"]
>(
  table: T,
  columns: Q[]
) => {
  const cls = getTableColumns(table);
  return columns.reduce((acc, column) => {
    const colName = cls[column].name;
    acc[column] = sql.raw(`excluded.${colName}`);
    return acc;
  }, {} as Record<Q, SQL>);
};

export const conflictUpdateAllExcept = <
  T extends PgTable,
  C extends keyof T["$inferInsert"]
>(
  table: T,
  except: C[]
) =>
  Object.fromEntries(
    Object.entries(getTableColumns(table))
      .filter(
        ([colName]) =>
          !except.includes(colName as keyof typeof table.$inferInsert)
      )
      .map(([colName, { name }]) => [
        colName,
        sql.raw(`EXCLUDED."${toSnakeCase(name)}"`),
      ])
  );
