import z from "zod";

export const ballerzTeamImportResponseSchema = z.object({
  updated: z.array(z.object({ id: z.number() })),
});
