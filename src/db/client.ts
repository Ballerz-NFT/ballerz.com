import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import z from "zod";
import { DrizzleConfig } from "drizzle-orm";

const SUPABASE_DATABASE_URL = z
  .url({
    error: (issue) =>
      issue.input === undefined
        ? "The environment variable SUPABASE_DATABASE_URL is required"
        : issue.message,
  })
  .meta({ description: "The URL of the Supabase database" })
  .parse(process.env.SUPABASE_DATABASE_URL!);

const connectionConfig = {
  prepare: false,
  max: 2, // Very conservative - 2 connections per pool per VM
  idle_timeout: 90, // fewer disconnects
  max_lifetime: 0, // disable forced recycling
  connect_timeout: 10, // Quick connection timeout
};

const drizzleConfig = {
  casing: "snake_case",
  //logger: true,
  schema,
} satisfies DrizzleConfig<typeof schema>;

export const client = postgres(SUPABASE_DATABASE_URL, connectionConfig);
export const connectDb = async () => drizzle(client, drizzleConfig);

export type Database = Awaited<ReturnType<typeof connectDb>>;
