import sharp from "sharp"
import { readFileSync } from "fs"
import { join } from "path"

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const svgPath = join(process.cwd(), "public/icons/icon.svg")
const outputDir = join(process.cwd(), "public/icons")

async function generateIcons() {
  const svg = readFileSync(svgPath)

  for (const size of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(outputDir, `icon-${size}.png`))
    console.log(`Generated icon-${size}.png`)
  }

  // Apple touch icon (180x180)
  await sharp(svg)
    .resize(180, 180)
    .png()
    .toFile(join(outputDir, "apple-touch-icon.png"))
  console.log("Generated apple-touch-icon.png")

  // Favicon (32x32)
  await sharp(svg)
    .resize(32, 32)
    .png()
    .toFile(join(outputDir, "favicon-32.png"))
  console.log("Generated favicon-32.png")

  // Shortcut icons (same base icon for now)
  await sharp(svg)
    .resize(96, 96)
    .png()
    .toFile(join(outputDir, "shortcut-task.png"))
  await sharp(svg)
    .resize(96, 96)
    .png()
    .toFile(join(outputDir, "shortcut-today.png"))
  await sharp(svg)
    .resize(96, 96)
    .png()
    .toFile(join(outputDir, "shortcut-charge.png"))
  console.log("Generated shortcut icons")
}

generateIcons().catch(console.error)
