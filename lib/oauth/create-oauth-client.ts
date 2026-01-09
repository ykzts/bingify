import { OAuth2Client } from "google-auth-library";

/**
 * OAuthアクセストークンからOAuth2Clientを作成する
 *
 * YouTube Data APIでOAuth認証を使用する場合、アクセストークン文字列を直接渡すのではなく、
 * OAuth2Clientオブジェクトを作成して認証情報を設定する必要があります。
 *
 * @param accessToken - OAuthアクセストークン
 * @returns 設定済みのOAuth2Clientインスタンス
 */
export function createOAuth2ClientFromToken(accessToken: string): OAuth2Client {
  const oauth2Client = new OAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
  });
  return oauth2Client;
}
