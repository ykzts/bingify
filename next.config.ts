import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Note: cacheComponents is not enabled globally because this app uses
  // authentication (cookies/headers) extensively in layouts and pages, which is
  // not compatible with static prerendering. However, "use cache" directives
  // in server actions still provide caching benefits for data fetching functions.
  experimental: {
    globalNotFound: true,
    turbopackUseSystemTlsCerts: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "lh3.googleusercontent.com",
        protocol: "https",
      },
      {
        hostname: "*.googleusercontent.com",
        protocol: "https",
      },
      {
        hostname: "static-cdn.jtvnw.net",
        protocol: "https",
      },
    ],
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

const withMDX = createMDX({});

export default withNextIntl(withMDX(nextConfig));
