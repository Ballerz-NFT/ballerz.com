import { createTRPCRouter, publicProcedure } from "../init";
import { importTeams } from "@/db/queries/ballerz-teams";

export const ballerzTeamsRouter = createTRPCRouter({
  import: publicProcedure.query(async ({ ctx: { db } }) => {
    console.log("Importing Ballerz Teams....");
    return importTeams(db);
  }),
});
