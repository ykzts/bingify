"use client";

import { LogOut, Settings, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserHeaderProps {
  user: {
    avatar_url?: string | null;
    email?: string | null;
    full_name?: string | null;
  } | null;
}

export function UserHeader({ user }: UserHeaderProps) {
  const t = useTranslations("UserHeader");
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.avatar_url ? (
          <Image
            alt={user.full_name || user.email || "User"}
            className="rounded-full object-cover"
            height={32}
            src={user.avatar_url}
            width={32}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <User className="h-4 w-4 text-gray-600" />
          </div>
        )}
        <span className="text-sm">{user.full_name || user.email}</span>
      </div>
      <Link
        aria-label={t("settings")}
        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm transition hover:bg-gray-50"
        href="/settings/profile"
      >
        <Settings className="h-4 w-4" />
        {t("settings")}
      </Link>
      <Button
        aria-label={t("logout")}
        disabled={isLoggingOut}
        onClick={handleLogout}
        type="button"
        variant="outline"
      >
        <LogOut className="h-4 w-4" />
        {t("logout")}
      </Button>
    </div>
  );
}
