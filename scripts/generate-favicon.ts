import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

async function generateFavicon() {
  const svgPath = join(process.cwd(), "public", "favicon.svg");
  const icoPath = join(process.cwd(), "app", "favicon.ico");

  const svgBuffer = readFileSync(svgPath);
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map((size) => sharp(svgBuffer).resize(size, size).png().toBuffer()),
  );

  // Build a proper ICO container with multiple resolutions for better rendering
  const icoBuffer = await toIco(pngBuffers);

  writeFileSync(icoPath, icoBuffer);

  console.log("✅ favicon.ico generated successfully");
}

generateFavicon().catch((error) => {
  console.error("❌ Failed to generate favicon:", error);
  process.exit(1);
});
