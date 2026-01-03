import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { getSpacePublicInfo } from "../_lib/actions";

export const alt = "Bingify Space";
export const size = {
  height: 630,
  width: 1200,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  // Fetch space information
  const publicInfo = await getSpacePublicInfo(id);

  // Use title if available, otherwise fall back to share_key
  const spaceTitle = publicInfo?.title || publicInfo?.share_key || "Space";
  const spaceDescription = publicInfo?.description || t("ogSpaceSubtitle");

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
          maxWidth: "900px",
        }}
      >
        {/* Logo and Bingify branding */}
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 48,
            fontWeight: "bold",
            gap: "16px",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#a78bfa",
              borderRadius: "16px",
              display: "flex",
              height: "64px",
              justifyContent: "center",
              width: "64px",
            }}
          >
            <span style={{ color: "white", fontSize: 40 }}>B</span>
          </div>
          <span style={{ color: "#1f2937" }}>Bingify</span>
        </div>

        {/* Space Title */}
        <div
          style={{
            color: "#1f2937",
            fontSize: 56,
            fontWeight: "bold",
            textAlign: "center",
            maxWidth: "800px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {spaceTitle}
        </div>

        {/* Space Description */}
        <div
          style={{
            color: "#4b5563",
            fontSize: 28,
            textAlign: "center",
            maxWidth: "800px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {spaceDescription}
        </div>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
