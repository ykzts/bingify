import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CalledNumber {
  called_at: string;
  id: string;
  space_id: string;
  value: number;
}

interface UseCalledNumbersOptionsSet {
  asSet: true;
  retry?: number;
}

interface UseCalledNumbersOptionsArray {
  asSet?: false;
  retry?: number;
}

type UseCalledNumbersOptions =
  | UseCalledNumbersOptionsSet
  | UseCalledNumbersOptionsArray;

/**
 * Hook to fetch called numbers for a space.
 * Returns Set<number> when asSet is true, CalledNumber[] otherwise.
 */
export function useCalledNumbers(
  spaceId: string,
  options: UseCalledNumbersOptionsSet
): ReturnType<typeof useQuery<Set<number>>>;
export function useCalledNumbers(
  spaceId: string,
  options?: UseCalledNumbersOptionsArray
): ReturnType<typeof useQuery<CalledNumber[]>>;
export function useCalledNumbers(
  spaceId: string,
  options?: UseCalledNumbersOptions
) {
  const { asSet = false, retry = 1 } = options || {};

  return useQuery({
    queryFn: async () => {
      const supabase = createClient();

      if (asSet) {
        // For Set<number> - only fetch the values
        const { data, error } = await supabase
          .from("called_numbers")
          .select("value")
          .eq("space_id", spaceId)
          .order("called_at", { ascending: true });

        if (error) {
          console.error("Error fetching called numbers:", error);
          throw error;
        }

        return new Set((data || []).map((n) => n.value));
      }
      // For CalledNumber[] - fetch full objects
      const { data, error } = await supabase
        .from("called_numbers")
        .select("id, space_id, value, called_at")
        .eq("space_id", spaceId)
        .order("called_at", { ascending: true });

      if (error) {
        console.error("Error fetching called numbers:", error);
        throw error;
      }

      return (data || []) as CalledNumber[];
    },
    queryKey: asSet
      ? ["called-numbers-set", spaceId]
      : ["called-numbers-array", spaceId],
    retry,
  });
}
