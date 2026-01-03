import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

async function generateFavicon() {
  const svgPath = join(process.cwd(), "public", "favicon.svg");
  const icoPath = join(process.cwd(), "app", "favicon.ico");

  const svgBuffer = readFileSync(svgPath);

  // Generate PNG at 256x256 (the largest size)
  // const pngBuffer = await sharp(svgBuffer).resize(256, 256).png().toBuffer();

  // For ICO format, we'll generate a 32x32 PNG which is the most common favicon size
  const icoBuffer = await sharp(svgBuffer).resize(32, 32).png().toBuffer();

  // Write as .ico (actually a PNG, which works for modern browsers)
  writeFileSync(icoPath, icoBuffer);

  console.log("✅ favicon.ico generated successfully");
}

generateFavicon().catch((error) => {
  console.error("❌ Failed to generate favicon:", error);
  process.exit(1);
});
