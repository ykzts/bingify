"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HeaderMenu } from "./header-menu";

interface UserProfile {
  avatar_url?: string | null;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
}

export function HeaderMenuWrapper() {
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        return;
      }

      // Fetch profile
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, email, full_name, role")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Failed to fetch user profile:", error);
        setUser({
          avatar_url: null,
          email: authUser.email || null,
          full_name: null,
          role: null,
        });
        return;
      }

      setUser(
        data || {
          avatar_url: null,
          email: authUser.email || null,
          full_name: null,
          role: null,
        }
      );
    };

    getUser();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUser();
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Show loading state
  if (user === undefined) {
    return (
      <div
        aria-hidden="true"
        className="flex h-8 w-8 animate-pulse items-center justify-center rounded-full bg-muted"
      />
    );
  }

  return <HeaderMenu user={user} />;
}
