import type { createClient } from "@/lib/supabase/server";

/**
 * Check if a user is the owner of a space
 */
export async function isSpaceOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("spaces")
    .select("owner_id")
    .eq("id", spaceId)
    .single();

  return data?.owner_id === userId;
}

/**
 * Check if a user is an admin of a space (has admin role in space_roles)
 */
export async function isSpaceAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("space_roles")
    .select("id")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .eq("role", "admin")
    .single();

  return !!data;
}

/**
 * Verify that a user has admin access to a space (either owner or admin)
 * This is the main function to use for permission checks
 */
export async function verifySpaceAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  spaceId: string,
  userId: string
): Promise<{ isAdmin: boolean; isOwner: boolean }> {
  // Check both owner and admin status in parallel
  const [owner, admin] = await Promise.all([
    isSpaceOwner(supabase, spaceId, userId),
    isSpaceAdmin(supabase, spaceId, userId),
  ]);

  return {
    isAdmin: owner || admin,
    isOwner: owner,
  };
}
