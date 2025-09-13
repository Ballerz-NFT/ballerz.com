import { createClient } from "@/lib/supabase/server";
import { JwtPayload } from "@supabase/supabase-js";

export type Session = {
  user: {
    id: string;
    wallet_address: string;
  };
};

type SupabaseJWTPayload = JwtPayload & {
  app_metadata?: {
    wallet_address?: string;
    [key: string]: string | undefined;
  };
};

export async function verifyAccessToken(): Promise<Session | null> {
  try {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();

    if (!data) return null;

    const claims = data.claims as SupabaseJWTPayload;

    if (!claims.app_metadata?.wallet_address) return null;

    return {
      user: {
        id: claims.sub!,
        wallet_address: claims.app_metadata.wallet_address!,
      },
    };
  } catch (error) {
    return null;
  }
}
