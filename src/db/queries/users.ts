import { Database } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const getUserById = async (db: Database, wallet_address: string) => {
  const [result] = await db
    .select({
      wallet_address: users.walletAddress,
      username: users.username,
      avatar_url: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.walletAddress, wallet_address));

  return result;
};
