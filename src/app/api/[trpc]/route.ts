import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "./init";
import { appRouter } from "./routers/_app";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });
export { handler as GET, handler as POST };
