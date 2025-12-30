import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CalledNumber {
  called_at: string;
  id: string;
  space_id: string;
  value: number;
}

export function useCalledNumbers(spaceId: string) {
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

      return (data || []) as CalledNumber[];
    },
    queryKey: ["called-numbers", spaceId],
  });
}
