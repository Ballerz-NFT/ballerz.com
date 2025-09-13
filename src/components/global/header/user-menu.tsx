"use client";

import { useUserQuery } from "@/hooks/use-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getImageProps } from "next/image";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import { SignOut } from "./sign-out";
import { ThemeSwitch } from "./theme-switch";
import { MenuIcon, ShieldUserIcon, UserPenIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function AvatarImageNext({
  src,
  alt,
  width = 40,
  height = 40,
  className,
  unoptimized = false,
}: {
  src: string | StaticImport;
  alt: string;
  width: number;
  height: number;
  className: string;
  unoptimized: boolean;
}) {
  const { props } = getImageProps({
    src,
    alt,
    width,
    height,
    className,
    unoptimized,
  });

  return <AvatarImage {...props} />;
}

export function UserMenu() {
  const { data: user } = useUserQuery();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="inline-flex items-center gap-2.5 relative p-1.5 py-1 border rounded-full hover:shadow-sm">
          <MenuIcon className={cn("size-4.5", user && "ml-2")} />
          {user && (
            <Avatar className="rounded-full size-8 cursor-pointer">
              {user.avatar_url && (
                <AvatarImageNext
                  src={user?.avatar_url}
                  alt={user?.username ?? ""}
                  width={32}
                  height={32}
                  className={"aspect-square h-full w-full absolute z-10"}
                  unoptimized
                />
              )}
              <AvatarFallback>
                <span className="text-xs">
                  {user.username?.charAt(0)?.toUpperCase() ?? "0x"}
                </span>
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" sideOffset={10} align="end">
        <DropdownMenuLabel>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="truncate line-clamp-1 max-w-[155px] block">
                {user?.username}
              </span>
              <span className="truncate text-xs text-[#606060] font-normal">
                {user?.wallet_address}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="text-sm" asChild>
            <Link href="/my-teams">
              <ShieldUserIcon />
              My Teams
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-sm" asChild>
            <Link href="/profile">
              <UserPenIcon />
              Profile
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <div className="flex flex-row justify-between items-center px-2 py-1">
          <p className="text-sm">Theme</p>
          <ThemeSwitch />
        </div>
        <DropdownMenuSeparator />

        {!user ? (
          <DropdownMenuItem asChild>
            <Link
              prefetch
              href="/login"
              className="bg-primary text-primary-foreground justify-center focus:bg-primary/90 focus:text-white"
            >
              Sign in
            </Link>
          </DropdownMenuItem>
        ) : (
          <SignOut />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
