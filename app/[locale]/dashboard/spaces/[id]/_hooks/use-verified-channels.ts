import { useQuery } from "@tanstack/react-query";
import { getVerifiedSocialChannels } from "../_actions/get-user-channel";

/**
 * 操作者の検証済みソーシャルチャンネルIDを取得するReact Queryフック
 * DBに保存されている検証済みIDを返す
 */
export function useVerifiedSocialChannels() {
  return useQuery({
    queryFn: async () => {
      const verified = await getVerifiedSocialChannels();
      return verified;
    },
    queryKey: ["verified-social-channels"],
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
}
