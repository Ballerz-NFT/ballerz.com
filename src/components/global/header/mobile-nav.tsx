"use client";

import Link, { LinkProps } from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Fragment } from "react";
import { useModal } from "@/hooks/use-modal";

export interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  label?: string;
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export interface NavItems {
  mainNav: NavItem[];
  secondaryNav: NavItemWithChildren[];
}

export const navItems: NavItems = {
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Ballerz",
      href: "/ballerz",
    },
    {
      title: "Sneakerz",
      href: "/sneakerz",
    },
    {
      title: "Team Builder",
      href: "/team-builder",
    },
  ],
  secondaryNav: [],
};

export function MobileNav() {
  const drawer = useModal();

  return (
    <div className="flex items-center gap-4">
      <Drawer open={drawer.isOpen} onOpenChange={drawer.setOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="!size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 9h16.5m-16.5 6.75h16.5"
              />
            </svg>
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[80svh] p-0">
          <DrawerTitle className="sr-only">Mobile Navigation</DrawerTitle>
          <div className="overflow-auto p-6">
            <div className="flex flex-col space-y-3">
              {navItems.mainNav?.map(
                (item) =>
                  item.href && (
                    <MobileLink
                      key={item.href}
                      href={item.href}
                      onOpenChange={drawer.setOpen}
                    >
                      {item.title}
                    </MobileLink>
                  )
              )}
            </div>
            <div className="flex flex-col space-y-2">
              {navItems.secondaryNav.map((item, index) => (
                <div key={index} className="flex flex-col gap-4 pt-6">
                  <h4 className="text-xl font-medium">{item.title}</h4>
                  {item?.items?.length &&
                    item.items.map((item) => (
                      <Fragment key={item.href}>
                        {!item.disabled &&
                          (item.href ? (
                            <MobileLink
                              href={item.href}
                              onOpenChange={drawer.setOpen}
                              className="opacity-80"
                            >
                              {item.title}
                              {item.label && (
                                <span className="ml-2 rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs leading-none text-[#000000] no-underline group-hover:no-underline">
                                  {item.label}
                                </span>
                              )}
                            </MobileLink>
                          ) : (
                            item.title
                          ))}
                      </Fragment>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <Link href="/" className="md:hidden">
        <Image
          src="/images/logo.png"
          width={321}
          height={60}
          alt="Ballerz Logo"
          className="max-h-6 w-auto"
        />
        <span className="sr-only">Ballerz</span>
      </Link>
    </div>
  );
}

interface MobileLinkProps extends LinkProps {
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: MobileLinkProps) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={() => {
        router.push(href.toString());
        onOpenChange?.(false);
      }}
      className={cn("text-[1.15rem]", className)}
      {...props}
    >
      {children}
    </Link>
  );
}
