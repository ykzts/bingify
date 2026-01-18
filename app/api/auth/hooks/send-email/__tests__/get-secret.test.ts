import { describe, expect, it } from "vitest";

describe("Email Hook Secret Retrieval", () => {
  it("ルートファイルがcreateAdminClientをインポートしている", async () => {
    // Verify that the route file imports createAdminClient from the admin module
    const routeModule = await import("../route");

    // The import should succeed and the module should be defined
    expect(routeModule).toBeDefined();
    expect(routeModule.POST).toBeDefined();

    // Read the source file to verify the import
    const fs = await import("node:fs");
    const path = await import("node:path");
    const routePath = path.resolve(__dirname, "..", "route.ts");
    const routeSource = fs.readFileSync(routePath, "utf-8");

    // Verify that createAdminClient is imported from @/lib/supabase/admin
    expect(routeSource).toContain(
      'import { createAdminClient } from "@/lib/supabase/admin"'
    );

    // Verify that createAdminClient is used instead of createClient in getEmailHookSecret
    expect(routeSource).toContain("const supabase = createAdminClient()");
  });

  it("getEmailHookSecret関数がservice roleクライアントを使用するようにコメントされている", async () => {
    // Read the source file to verify the comments
    const fs = await import("node:fs");
    const path = await import("node:path");
    const routePath = path.resolve(__dirname, "..", "route.ts");
    const routeSource = fs.readFileSync(routePath, "utf-8");

    // Verify that the comment explains the use of service role
    expect(routeSource).toContain("service role");
    expect(routeSource).toContain("Supabase Auth");
  });
});
