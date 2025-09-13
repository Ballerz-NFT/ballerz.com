import { createTRPCRouter, publicProcedure } from "../init";
import { getUserById } from "@/db/queries";

export const userRouter = createTRPCRouter({
  me: publicProcedure.query(async ({ ctx: { db, session } }) => {
    if (!session) return null;
    return getUserById(db, session.user.wallet_address);
  }),

  //   update: protectedProcedure
  //     .input(updateUserSchema)
  //     .mutation(async ({ ctx: { db, session }, input }) => {
  //       return updateUser(db, {
  //         id: session.user.id,
  //         ...input,
  //       });
  //     })
});
