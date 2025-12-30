import { useQuery } from "@tanstack/react-query";
import { checkUserParticipation, getParticipantCount } from "../../actions";

export function useParticipantInfo(spaceId: string) {
  return useQuery({
    queryFn: () => getParticipantCount(spaceId),
    queryKey: ["participant-info", spaceId],
  });
}

export function useUserParticipation(spaceId: string) {
  return useQuery({
    queryFn: () => checkUserParticipation(spaceId),
    queryKey: ["user-participation", spaceId],
  });
}
