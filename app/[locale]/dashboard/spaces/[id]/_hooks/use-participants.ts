import { useQuery } from "@tanstack/react-query";
import { getParticipants } from "../_actions/space-operations";

export interface Participant {
  bingo_status: "none" | "reach" | "bingo";
  id: string;
  joined_at: string | null;
  profiles?: {
    avatar_url: string | null;
    full_name: string | null;
  } | null;
  user_id: string;
}

export function useParticipants(spaceId: string) {
  return useQuery({
    queryFn: async () => {
      const result = await getParticipants(spaceId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    queryKey: ["participants", spaceId],
  });
}
