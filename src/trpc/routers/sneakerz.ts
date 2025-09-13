import { createTRPCRouter, publicProcedure } from "../init";
import { importSneakerz } from "@/db/queries/sneakerz";

export const sneakerzRouter = createTRPCRouter({
  import: publicProcedure.query(async ({ ctx: { db } }) => {
    return importSneakerz(db);
  }),
});
