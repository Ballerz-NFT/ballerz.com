import { createTRPCRouter, publicProcedure } from "../init";
import { importBallerz, getBallerz } from "@/db/queries";
import { getBallerzSchema } from "../schemas/ballerz";

export const ballerzRouter = createTRPCRouter({
  import: publicProcedure.query(async ({ ctx: { db } }) => {
    console.log("Importing Ballerz...");
    return importBallerz(db);
  }),
  get: publicProcedure
    .input(getBallerzSchema)
    .query(async ({ input, ctx: { db } }) => {
      console.log("Fetching ballerz with input:", input);
      return getBallerz(db, {
        ...input,
      });
    }),
});
