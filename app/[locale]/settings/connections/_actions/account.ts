"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export interface UnlinkIdentityState {
  error?: string;
  errorKey?: string;
  success: boolean;
}

export async function unlinkIdentity(
  provider: string
): Promise<UnlinkIdentityState> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        errorKey: "errorUnauthorized",
        success: false,
      };
    }

    const identities = user.identities || [];

    if (identities.length <= 1) {
      return {
        errorKey: "errorMinimumIdentity",
        success: false,
      };
    }

    const identity = identities.find((id) => id.provider === provider);

    if (!identity) {
      return {
        errorKey: "errorProviderNotLinked",
        success: false,
      };
    }

    const { error } = await supabase.auth.unlinkIdentity(identity);

    if (error) {
      console.error("Unlink identity error:", error);
      return {
        errorKey: "errorUnlinkFailed",
        success: false,
      };
    }

    // Invalidate the connections settings page cache
    const locale = await getLocale();
    const connectionsPath = getPathname({
      href: "/settings/connections",
      locale,
    });
    revalidatePath(connectionsPath);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error unlinking identity:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}
