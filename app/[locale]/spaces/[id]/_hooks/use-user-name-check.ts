import { useQuery } from "@tanstack/react-query";
import { checkUserNameSet } from "../../_actions/space-join";

export function useUserNameCheck(enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: async () => {
      const result = await checkUserNameSet();
      
      // Log errors for debugging but don't throw to avoid breaking the UI
      if (result.error) {
        console.error("Error checking user name:", result.error);
      }
      
      // Return false if there's an error to be safe (treat as name not set)
      return result.hasName;
    },
    queryKey: ["user-name-check"],
    // Don't retry on error - if check fails, assume name not set for safety
    retry: false,
  });
}
