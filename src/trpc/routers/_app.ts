import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../init";
import { ballerzRouter } from "./ballerz";
import { ballerzTeamsRouter } from "./ballerz-teams";
import { sneakerzRouter } from "./sneakerz";
import { userRouter } from "./user";

export const appRouter = createTRPCRouter({
  ballerz: ballerzRouter,
  ballerz_teams: ballerzTeamsRouter,
  sneakerz: sneakerzRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
