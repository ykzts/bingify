"use server";

import { usernameSchema } from "@/lib/schemas/user";
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

export interface UpdateUsernameState {
  error?: string;
  errorKey?: string;
  success: boolean;
}

export async function updateUsername(
  _prevState: UpdateUsernameState,
  formData: FormData
): Promise<UpdateUsernameState> {
  try {
    const username = formData.get("username") as string;

    const validation = usernameSchema.safeParse({ username });
    if (!validation.success) {
      return {
        error: validation.error.issues[0].message,
        success: false,
      };
    }

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

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: validation.data.username,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Update username error:", error);
      return {
        errorKey: "errorUpdateFailed",
        success: false,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error updating username:", error);
    return {
      errorKey: "errorGeneric",
      success: false,
    };
  }
}
