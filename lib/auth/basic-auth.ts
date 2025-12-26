import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function createUnauthorizedResponse() {
  return new NextResponse("Unauthorized", {
    headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
    status: 401,
  });
}

export function checkBasicAuth(req: NextRequest): NextResponse | null {
  if (process.env.ENABLE_BASIC_AUTH !== "true") {
    return null;
  }

  // Validate required environment variables
  if (!(process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD)) {
    console.error(
      "BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must be set when ENABLE_BASIC_AUTH is true"
    );
    return createUnauthorizedResponse();
  }

  const basicAuth = req.headers.get("authorization");
  if (!basicAuth) {
    return createUnauthorizedResponse();
  }

  const parts = basicAuth.split(" ");
  if (parts.length !== 2 || parts[0] !== "Basic") {
    return createUnauthorizedResponse();
  }

  const authValue = parts[1];
  if (!authValue) {
    return createUnauthorizedResponse();
  }

  try {
    const decodedAuth = atob(authValue);
    const colonIndex = decodedAuth.indexOf(":");

    if (colonIndex === -1) {
      return createUnauthorizedResponse();
    }

    const user = decodedAuth.substring(0, colonIndex);
    const pwd = decodedAuth.substring(colonIndex + 1);

    if (
      user !== process.env.BASIC_AUTH_USER ||
      pwd !== process.env.BASIC_AUTH_PASSWORD
    ) {
      return createUnauthorizedResponse();
    }
  } catch {
    return createUnauthorizedResponse();
  }

  return null;
}
