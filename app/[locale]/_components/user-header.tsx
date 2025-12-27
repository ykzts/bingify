"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
          <img
            alt={user.full_name || user.email || "User"}
            className="h-8 w-8 rounded-full object-cover"
            src={user.avatar_url}
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
            <User className="h-4 w-4 text-gray-600" />
          </div>
        )}
        <span className="text-sm">{user.full_name || user.email}</span>
      </div>
      <button
        aria-label={t("logout")}
        className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoggingOut}
        onClick={handleLogout}
        type="button"
      >
        <LogOut className="h-4 w-4" />
        {t("logout")}
      </button>
    </div>
  );
}
