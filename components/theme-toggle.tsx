"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const t = useTranslations("ThemeSwitcher");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        aria-label={t("label")}
        disabled
        size="icon"
        type="button"
        variant="outline"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const themeOptions = [
    {
      icon: Sun,
      label: t("light"),
      value: "light",
    },
    {
      icon: Moon,
      label: t("dark"),
      value: "dark",
    },
    {
      icon: Monitor,
      label: t("system"),
      value: "system",
    },
  ];

  const currentThemeOption = themeOptions.find((opt) => opt.value === theme);
  const CurrentIcon = currentThemeOption?.icon || Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("label")}
          size="icon"
          type="button"
          variant="outline"
        >
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                className={cn(
                  "flex cursor-pointer items-center gap-2",
                  theme === option.value && "bg-gray-50 font-medium"
                )}
                key={option.value}
                onSelect={() => setTheme(option.value)}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
