"use server";

import { checkNonce, removeNonce } from "@/lib/nonces";
import { createClient } from "@/lib/supabase/server";
import {
  type Service as BaseService,
  type CompositeSignature,
  AppUtils,
} from "@onflow/fcl";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actionClient } from "./safe-action";
import { z } from "zod";

interface Service extends BaseService {
  data?: { address: string; nonce: string; signatures: CompositeSignature[] };
}

export const walletConnectLoginAction = actionClient
  .inputSchema(
    z.object({
      credentials: z.any(),
      redirectTo: z.string().optional(),
    })
  )
  .action(async ({ parsedInput: { credentials, redirectTo } }) => {
    if (!credentials?.services)
      return { success: false, message: "Credentials not found." };

    const supabase = await createClient();

    console.log("Has credentials.services");

    const accountProofService = (credentials.services as Service[]).find(
      (service: Service) => service.type === "account-proof"
    );

    console.log("Account Proof Service Found", accountProofService);

    if (!accountProofService || !accountProofService.data)
      return { success: false, message: "Login failed." };

    if (!(await checkNonce(accountProofService.data.nonce))) {
      console.log("Failed to verify nonce.");
      return { success: false, message: "Failed to verify nonce." };
    }

    console.log("Delete nonce.");

    console.log("Verifying account proof.");

    const verified = await AppUtils.verifyAccountProof(
      process.env.NEXT_PUBLIC_SITE_URL!,
      accountProofService.data
    );

    if (!verified) {
      console.log("Account proof not verified.");
      return { success: false, message: "Account proof not verified." };
    }

    console.log("Account proof verified successfully.");

    const {
      data: { user },
      error: signInError,
    } = await supabase.auth.signInAnonymously();

    if (signInError) {
      console.log("Error signing in anonymously.");
      return { success: false, message: signInError.message };
    }

    if (!user) {
      console.log("Error signing in anonymously.");
      return {
        success: false,
        message: "Something went wrong during sign in.",
      };
    }
    console.log("Signed in anonymously.");

    const supabaseAdmin = await createClient({ admin: true });

    // Add the wallet address to the user metadata
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { wallet_address: credentials.addr },
    });

    // Refresh the session to get the updated user metadata
    await supabase.auth.refreshSession();

    if (error) {
      console.log("Error linking wallet.");
      return { success: false, message: error.message };
    }
    console.log("Wallet linked to account.");

    await removeNonce(accountProofService.data.nonce);
    revalidatePath("/");
    if (redirectTo) {
      redirect(redirectTo);
    }
    return { success: true };
  });
