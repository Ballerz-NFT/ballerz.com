"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Theme = "dark" | "system" | "light";

type Props = {
  currentTheme?: Theme;
};

const ThemeIcon = ({ currentTheme }: Props) => {
  switch (currentTheme) {
    case "dark":
      return <MoonIcon className="size-3" />;
    case "system":
      return <MonitorIcon className="size-3" />;
    default:
      return <SunIcon className="size-3" />;
  }
};

export const ThemeSwitch = () => {
  const { theme, setTheme, themes } = useTheme();
  const [mounted, setMounted] = useState(false);

  // After mounting, we have access to the theme
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-[32px]" />;
  }

  return (
    <div className="flex items-center relative">
      <Select value={theme} onValueChange={(value: Theme) => setTheme(value)}>
        <SelectTrigger
          size="sm"
          className="w-full px-2 bg-transparent outline-none capitalize text-xs"
        >
          <SelectValue>
            {theme ? (
              <>
                <ThemeIcon currentTheme={theme as Theme} />
                {theme.charAt(0).toUpperCase() + theme.slice(1)}
              </>
            ) : (
              "Select theme"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {themes.map((theme) => (
              <SelectItem
                key={theme}
                value={theme}
                className="capitalize text-xs"
              >
                <ThemeIcon currentTheme={theme as Theme} />
                {theme}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
