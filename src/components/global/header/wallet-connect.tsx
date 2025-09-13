"use client";

import { UserMenu } from "./user-menu";
import { useUserQuery } from "@/hooks/use-user";
import { ThemeDropdown } from "./theme-dropdown";
import { WalletConnectButton } from "@/components/wallet-connect-button";

export function WalletConnect() {
  const { data: user } = useUserQuery();

  if (!user)
    return (
      <div className="flex items-center gap-3">
        <ThemeDropdown />
        <WalletConnectButton className="w-9 sm:w-auto sm:border sm:border-background">
          <span className="sr-only sm:not-sr-only">WalletConnect</span>
        </WalletConnectButton>
      </div>
    );

  return <UserMenu />;
}
