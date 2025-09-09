import { createClient } from "@/lib/supabase/server";
import { JwtPayload } from "@supabase/supabase-js";

export type Session = {
  user: {
    id: string;
    email?: string;
    full_name?: string;
  };
};

type SupabaseJWTPayload = JwtPayload & {
  user_metadata?: {
    email?: string;
    full_name?: string;
    [key: string]: string | undefined;
  };
};

export async function verifyAccessToken(): Promise<Session | null> {
  try {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();

    if (!data) return null;

    const claims = data.claims as SupabaseJWTPayload;

    return {
      user: {
        id: claims.sub!,
        email: claims.user_metadata?.email,
        full_name: claims.user_metadata?.full_name,
      },
    };
  } catch (error) {
    return null;
  }
}
