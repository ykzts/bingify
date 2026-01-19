import { useQuery } from "@tanstack/react-query";
import { checkUserNameSet } from "../../_actions/space-join";

export function useUserNameCheck(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: async () => {
      const result = await checkUserNameSet();
      return result.hasName;
    },
    queryKey: ["user-name-check"],
  });
}
