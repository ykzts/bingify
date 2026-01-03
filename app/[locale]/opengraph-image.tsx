import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const alt = "Bingify";
export const size = {
  height: 630,
  width: 1200,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

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
            color: "#4b5563",
            fontSize: 32,
            textAlign: "center",
          }}
        >
          {t("description")}
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
