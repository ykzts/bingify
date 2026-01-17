import { useQuery } from "@tanstack/react-query";
import type { OAuthProvider } from "@/lib/oauth/token-storage";
import { checkOAuthTokenAvailability } from "../../_actions/space-join";

export function useOAuthTokenCheck(provider: OAuthProvider, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: async () => {
      const result = await checkOAuthTokenAvailability(provider);
      return result.available;
    },
    queryKey: ["oauth-token-check", provider],
  });
}
