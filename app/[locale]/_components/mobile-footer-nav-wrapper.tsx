"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MobileFooterNav } from "./mobile-footer-nav";

interface UserProfile {
  avatar_url?: string | null;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
}

export function MobileFooterNavWrapper() {
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        return;
      }

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

  if (user === undefined || user === null) {
    return null;
  }

  return <MobileFooterNav user={user} />;
}
