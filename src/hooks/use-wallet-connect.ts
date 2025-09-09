"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { fcl } from "@/lib/fcl/config";
import { walletConnectLoginAction } from "@/actions/wallet-connect-login-action";

export function useWalletConnect({ redirectTo }: { redirectTo?: string }) {
  const [isLoading, startTransition] = useTransition();

  const signIn = async () => {
    startTransition(async () => {
      const user = await fcl.logIn();
      fcl.unauthenticate();

      const result = await walletConnectLoginAction({
        credentials: user,
        redirectTo,
      });

      if (!result.data?.success) {
        toast.error(result.data?.message || "Failed to sign in");
      } else {
        toast.success("Successfully signed in!");
      }
    });
  };

  return {
    signIn,
    isLoading,
  };
}
