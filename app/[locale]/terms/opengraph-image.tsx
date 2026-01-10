import { ImageResponse } from "next/og";
import { loadMDXContent } from "@/lib/components/mdx-content";

export const alt = "Bingify Terms of Service";
export const size = {
  height: 630,
  width: 1200,
};
export const contentType = "image/png";

function getDefaultTitle(locale: string): string {
  return locale === "ja" ? "利用規約" : "Terms of Service";
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  let title: string;
  try {
    const module = await loadMDXContent(locale, "terms");
    title =
      module.metadata?.title && module.metadata.title !== "Content Not Found"
        ? module.metadata.title
        : getDefaultTitle(locale);
  } catch {
    title = getDefaultTitle(locale);
  }

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.95)",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "32px",
          padding: "80px 64px",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 80,
            fontWeight: "bold",
            gap: "24px",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#a78bfa",
              borderRadius: "20px",
              display: "flex",
              height: "100px",
              justifyContent: "center",
              width: "100px",
            }}
          >
            <span style={{ color: "white", fontSize: 60 }}>B</span>
          </div>
          <span style={{ color: "#1f2937" }}>Bingify</span>
        </div>

        <div
          style={{
            color: "#1f2937",
            fontSize: 56,
            fontWeight: "bold",
            lineHeight: 1.2,
            textAlign: "center",
          }}
        >
          {title}
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
