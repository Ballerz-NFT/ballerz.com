import { createTRPCRouter, publicProcedure } from "../init";
import { importSneakerz } from "@/db/queries/sneakerz";

export const sneakerzRouter = createTRPCRouter({
  import: publicProcedure.query(async ({ ctx: { db } }) => {
    console.log("Importing Sneakerz....");
    return importSneakerz(db);
  }),
});
