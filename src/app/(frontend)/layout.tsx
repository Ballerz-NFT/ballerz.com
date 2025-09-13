import { Navbar } from "@/components/global/header/navbar";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export default async function FrontendLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = await getQueryClient();

  // NOTE: Right now we want to fetch the user and hydrate the client
  // Next steps would be to prefetch and suspense
  await queryClient.fetchQuery(trpc.user.me.queryOptions());

  return (
    <HydrateClient>
      <Navbar />
      <main>{children}</main>
    </HydrateClient>
  );
}
