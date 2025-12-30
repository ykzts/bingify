import { routing } from "@/i18n/routing";

const LOCALE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/`);
const DASHBOARD_PATTERN = new RegExp(
  `^/(${routing.locales.join("|")})/dashboard(/|$)`
);
const ADMIN_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/admin(/|$)`);

export function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    Boolean(pathname.match(ADMIN_PATTERN))
  );
}

export function isDashboardPath(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    Boolean(pathname.match(DASHBOARD_PATTERN))
  );
}

export function extractLocaleFromPath(pathname: string): string | null {
  const match = pathname.match(LOCALE_PATTERN);
  return match ? match[1] : null;
}
