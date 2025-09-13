import { createClient } from "@/lib/supabase/server";
import { verifyAccessToken } from "./utils/auth";
import type { Session } from "./utils/auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { connectDb, Database } from "@/db/client";

type TRPCContext = {
  session: Session | null;
  supabase: SupabaseClient;
  db: Database;
};

export const createTRPCContext = cache(async () => {
  const supabase = await createClient();
  const session = await verifyAccessToken();
  const db = await connectDb();

  return {
    session,
    supabase,
    db,
  };
});

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async (opts) => {
  const { session } = opts.ctx;

  console.log({ session });

  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      session,
    },
  });
});
