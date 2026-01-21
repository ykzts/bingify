"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

// ロケールプレフィックスを動的に構築
const LOCALE_PREFIX_REGEX = new RegExp(`^/(${routing.locales.join("|")})`);

export function SettingsTabs() {
  const t = useTranslations("AccountSettings");
  const pathname = usePathname();

  // Define tab navigation items
  const tabs = [
    {
      href: "/settings/profile" as const,
      label: t("profileTab"),
      segment: "/settings/profile",
    },
    {
      href: "/settings/connections" as const,
      label: t("connectionsTab"),
      segment: "/settings/connections",
    },
    {
      href: "/settings/avatar" as const,
      label: t("avatarTab"),
      segment: "/settings/avatar",
    },
    {
      href: "/settings/account" as const,
      label: t("accountTab"),
      segment: "/settings/account",
    },
  ];

  // Check if the current pathname matches a tab
  const isActive = (segment: string) => {
    // Remove locale prefix from pathname for comparison
    const pathWithoutLocale = pathname.replace(LOCALE_PREFIX_REGEX, "");
    return pathWithoutLocale === segment;
  };

  return (
    <nav className="border-gray-200 border-b">
      <div className="flex gap-8">
        {tabs.map((tab) => {
          const active = isActive(tab.segment);
          return (
            <Link
              className={`relative pb-4 font-medium text-sm transition-colors hover:text-purple-600 ${
                active ? "text-purple-600" : "text-gray-700"
              }`}
              href={tab.href}
              key={tab.segment}
            >
              {tab.label}
              <span
                className={`absolute bottom-0 left-0 h-0.5 w-full bg-purple-600 transition-transform ${
                  active ? "scale-x-100" : "scale-x-0"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
