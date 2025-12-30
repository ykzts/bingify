import { useQuery } from "@tanstack/react-query";
import { getOrCreateBingoCard } from "../bingo-actions";

export function useBingoCard(spaceId: string) {
  return useQuery({
    queryFn: async () => {
      const result = await getOrCreateBingoCard(spaceId);
      if (!result.success || !result.card) {
        throw new Error(result.error || "Failed to load bingo card");
      }
      return result.card;
    },
    queryKey: ["bingo-card", spaceId],
    retry: 2,
  });
}
