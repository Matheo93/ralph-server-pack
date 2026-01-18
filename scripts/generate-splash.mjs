#!/usr/bin/env node
/**
 * Generate iOS and Android splash screen images for PWA
 * Uses sharp for image processing
 */

import sharp from "sharp"
import { mkdir, writeFile } from "fs/promises"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const SPLASH_DIR = join(ROOT, "public", "splash")

// iOS splash screen sizes (portrait)
const IOS_SIZES = [
  // iPhone SE, iPod touch
  { width: 640, height: 1136, name: "apple-splash-640-1136" },
  // iPhone 6/7/8
  { width: 750, height: 1334, name: "apple-splash-750-1334" },
  // iPhone 6+/7+/8+
  { width: 1242, height: 2208, name: "apple-splash-1242-2208" },
  // iPhone X/XS/11 Pro
  { width: 1125, height: 2436, name: "apple-splash-1125-2436" },
  // iPhone XR/11
  { width: 828, height: 1792, name: "apple-splash-828-1792" },
  // iPhone XS Max/11 Pro Max
  { width: 1242, height: 2688, name: "apple-splash-1242-2688" },
  // iPhone 12 mini/13 mini
  { width: 1080, height: 2340, name: "apple-splash-1080-2340" },
  // iPhone 12/12 Pro/13/13 Pro/14
  { width: 1170, height: 2532, name: "apple-splash-1170-2532" },
  // iPhone 12 Pro Max/13 Pro Max/14 Plus
  { width: 1284, height: 2778, name: "apple-splash-1284-2778" },
  // iPhone 14 Pro
  { width: 1179, height: 2556, name: "apple-splash-1179-2556" },
  // iPhone 14 Pro Max
  { width: 1290, height: 2796, name: "apple-splash-1290-2796" },
  // iPhone 15/15 Pro
  { width: 1179, height: 2556, name: "apple-splash-1179-2556-15" },
  // iPhone 15 Pro Max/15 Plus
  { width: 1290, height: 2796, name: "apple-splash-1290-2796-15" },
  // iPad Mini
  { width: 1536, height: 2048, name: "apple-splash-1536-2048" },
  // iPad Air
  { width: 1668, height: 2224, name: "apple-splash-1668-2224" },
  // iPad Pro 10.5"
  { width: 1668, height: 2388, name: "apple-splash-1668-2388" },
  // iPad Pro 11"
  { width: 1668, height: 2388, name: "apple-splash-1668-2388-11" },
  // iPad Pro 12.9"
  { width: 2048, height: 2732, name: "apple-splash-2048-2732" },
]

// Android splash (used as background_color in manifest, but we create one for consistency)
const ANDROID_SIZES = [
  { width: 512, height: 512, name: "android-splash-512" },
  { width: 1080, height: 1920, name: "android-splash-1080-1920" },
  { width: 1440, height: 2560, name: "android-splash-1440-2560" },
]

// Theme color - matches manifest.json
const THEME_COLOR = "#3b82f6"
const BACKGROUND_COLOR = "#ffffff"

// Icon SVG (simplified version for splash)
const ICON_SVG = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="256" fill="#3b82f6"/>
  <circle cx="256" cy="256" r="220" fill="#2563eb"/>
  <path d="M256 120L128 220V360C128 371 137 380 148 380H212V300C212 289 221 280 232 280H280C291 280 300 289 300 300V380H364C375 380 384 371 384 360V220L256 120Z" fill="white"/>
  <path d="M256 240C248 232 236 232 228 240C220 248 220 260 228 268L256 296L284 268C292 260 292 248 284 240C276 232 264 232 256 240Z" fill="#ef4444"/>
  <circle cx="380" cy="380" r="60" fill="#22c55e"/>
  <path d="M355 380L370 395L405 360" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

/**
 * Generate a splash screen image
 */
async function generateSplash(width, height, name) {
  // Icon size should be proportional but not too large
  const iconSize = Math.min(width, height) * 0.3
  const iconX = Math.round((width - iconSize) / 2)
  const iconY = Math.round((height - iconSize) / 2) - Math.round(height * 0.05) // Slightly above center

  // Create the icon at the right size
  const iconBuffer = await sharp(Buffer.from(ICON_SVG))
    .resize(Math.round(iconSize), Math.round(iconSize))
    .png()
    .toBuffer()

  // App name text (rendered as SVG)
  const textSvg = `<svg width="${width}" height="100" xmlns="http://www.w3.org/2000/svg">
    <text x="${width / 2}" y="60" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="600" fill="#1e3a5f">FamilyLoad</text>
  </svg>`

  const textBuffer = await sharp(Buffer.from(textSvg)).png().toBuffer()

  // Create background
  const background = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer()

  // Composite icon and text on background
  const result = await sharp(background)
    .composite([
      {
        input: iconBuffer,
        left: iconX,
        top: iconY,
      },
      {
        input: textBuffer,
        left: 0,
        top: Math.round(iconY + iconSize + 20),
      },
    ])
    .png({ quality: 90 })
    .toBuffer()

  const outputPath = join(SPLASH_DIR, `${name}.png`)
  await writeFile(outputPath, result)
  console.log(`✓ Generated ${name}.png (${width}x${height})`)
}

async function main() {
  console.log("Generating splash screens...")

  // Ensure directory exists
  await mkdir(SPLASH_DIR, { recursive: true })

  // Generate iOS splash screens
  console.log("\niOS Splash Screens:")
  for (const size of IOS_SIZES) {
    await generateSplash(size.width, size.height, size.name)
  }

  // Generate Android splash screens
  console.log("\nAndroid Splash Screens:")
  for (const size of ANDROID_SIZES) {
    await generateSplash(size.width, size.height, size.name)
  }

  console.log("\n✅ All splash screens generated!")
}

main().catch(console.error)
