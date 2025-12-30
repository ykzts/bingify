import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Participant {
  bingo_status: "none" | "reach" | "bingo";
  id: string;
  joined_at: string;
  profiles?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  user_id: string;
}

export function useParticipants(spaceId: string) {
  return useQuery({
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("participants")
        .select(
          `
          id,
          user_id,
          bingo_status,
          joined_at,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `
        )
        .eq("space_id", spaceId)
        .order("joined_at", { ascending: true });

      if (error) {
        console.error("Error fetching participants:", error);
        throw error;
      }

      // Sort by bingo status and joined_at
      const participants = data || [];
      participants.sort((a, b) => {
        const statusOrder: Record<"bingo" | "reach" | "none", number> = {
          bingo: 0,
          none: 2,
          reach: 1,
        };
        const statusDiff =
          statusOrder[a.bingo_status as "bingo" | "reach" | "none"] -
          statusOrder[b.bingo_status as "bingo" | "reach" | "none"];
        if (statusDiff !== 0) {
          return statusDiff;
        }
        return (
          new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        );
      });

      return participants as unknown as Participant[];
    },
    queryKey: ["participants", spaceId],
  });
}
