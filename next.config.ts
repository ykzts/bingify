import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    globalNotFound: true,
    serverActions: {
      bodySizeLimit: "2mb",
    },
    turbopackUseSystemTlsCerts: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "*.googleusercontent.com",
        protocol: "https",
      },
      {
        hostname: "yt3.ggpht.com",
        protocol: "https",
      },
      {
        hostname: "static-cdn.jtvnw.net",
        protocol: "https",
      },
      ...(process.env.NODE_ENV === "development"
        ? [
            {
              hostname: "127.0.0.1",
              port: "54321",
              protocol: "http" as const,
            },
          ]
        : []),
      {
        hostname: "*.supabase.co",
        protocol: "https",
      },
    ],
  },
  output: "standalone",
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

const withMDX = createMDX({});

export default withNextIntl(withMDX(nextConfig));
