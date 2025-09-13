"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainNav() {
  const pathname = usePathname();

  return (
    <div className="mr-4 hidden md:flex">
      <Link href="/" className="mr-4 flex items-center gap-2 lg:mr-8">
        <Image
          src="/images/logo.png"
          width={321}
          height={60}
          alt="Ballerz Logo"
          className="max-h-6 w-auto"
          unoptimized
        />
        <span className="sr-only">Ballerz</span>
      </Link>
      <nav className="flex items-center gap-4 font-bold xl:gap-8">
        <Link
          href="/ballerz"
          className={cn(
            "hover:text-foreground/90 transition-colors",
            pathname === "/ballerz" ? "text-foreground" : "text-foreground/80"
          )}
        >
          Ballerz
        </Link>
        <Link
          href="/sneakerz"
          className={cn(
            "hover:text-foreground/90 transition-colors",
            pathname === "/sneakerz" ? "text-foreground" : "text-foreground/80"
          )}
        >
          Sneakerz
        </Link>
        <Link
          href="/team-builder"
          className={cn(
            "hover:text-foreground/90 transition-colors",
            pathname?.startsWith("/team-builder")
              ? "text-foreground"
              : "text-foreground/80"
          )}
        >
          Team Builder
        </Link>
      </nav>
    </div>
  );
}
