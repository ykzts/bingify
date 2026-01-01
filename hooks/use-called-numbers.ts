import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type CalledNumber = Tables<"called_numbers">;

interface UseCalledNumbersOptions {
  /**
   * Number of retry attempts on error. Default is 1.
   */
  retry?: number;
}

/**
 * Hook to fetch called numbers for a space.
 * Always returns CalledNumber[] array.
 * Callers can transform to Set<number> with .map(({ value }) => value) if needed.
 */
export function useCalledNumbers(
  spaceId: string,
  options?: UseCalledNumbersOptions
) {
  const { retry = 1 } = options || {};

  return useQuery({
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("called_numbers")
        .select("id, space_id, value, called_at")
        .eq("space_id", spaceId)
        .order("called_at", { ascending: true });

      if (error) {
        console.error("Error fetching called numbers:", error);
        throw error;
      }

      // Use nullish coalescing for clarity; type assertion only applies to fallback array
      return (data ?? []) as Tables<"called_numbers">[];
    },
    queryKey: ["called-numbers", spaceId],
    retry,
  });
}
