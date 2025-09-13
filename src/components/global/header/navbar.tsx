import { MainNav } from "@/components/global/header/main-nav";
import { MobileNav } from "@/components/global/header/mobile-nav";
import { WalletConnect } from "./wallet-connect";
import { Suspense } from "react";

export async function Navbar() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="container w-full mx-auto py-2 px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-2 md:gap-4">
          <MainNav />
          <MobileNav />
          <div className="ml-auto flex items-center gap-2 md:flex-1 md:justify-end">
            <nav className="flex items-center gap-0.5">
              <Suspense>
                <WalletConnect />
              </Suspense>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
