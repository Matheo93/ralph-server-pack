#!/usr/bin/env node
/**
 * Generate PWA screenshots and maskable icons using sharp
 */

import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');
const screenshotsDir = join(publicDir, 'screenshots');

// Ensure directories exist
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

// FamilyLoad brand colors
const PRIMARY_COLOR = '#3b82f6';
const BACKGROUND_COLOR = '#ffffff';
const TEXT_COLOR = '#1e3a5f';

/**
 * Create a simple branded screenshot with text
 */
async function createScreenshot(width, height, filename, label) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f0f9ff"/>
          <stop offset="100%" style="stop-color:#e0f2fe"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <rect x="0" y="0" width="100%" height="60" fill="${PRIMARY_COLOR}"/>
      <text x="20" y="40" font-family="Arial, sans-serif" font-size="24" fill="white" font-weight="bold">FamilyLoad</text>
      <rect x="${width * 0.05}" y="80" width="${width * 0.9}" height="${height * 0.3}" rx="10" fill="white" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${width * 0.5}" y="${80 + height * 0.15}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.04}" fill="${TEXT_COLOR}" text-anchor="middle" font-weight="bold">Dashboard</text>
      <text x="${width * 0.5}" y="${80 + height * 0.2}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.025}" fill="#6b7280" text-anchor="middle">Gerez vos taches familiales</text>
      <rect x="${width * 0.05}" y="${height * 0.5}" width="${width * 0.4}" height="${height * 0.15}" rx="8" fill="${PRIMARY_COLOR}"/>
      <text x="${width * 0.25}" y="${height * 0.5 + height * 0.09}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.03}" fill="white" text-anchor="middle">Taches du jour</text>
      <rect x="${width * 0.5}" y="${height * 0.5}" width="${width * 0.45}" height="${height * 0.15}" rx="8" fill="#10b981"/>
      <text x="${width * 0.725}" y="${height * 0.5 + height * 0.09}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.03}" fill="white" text-anchor="middle">Charge mentale</text>
      <rect x="${width * 0.05}" y="${height * 0.7}" width="${width * 0.9}" height="${height * 0.2}" rx="8" fill="white" stroke="#e5e7eb" stroke-width="1"/>
      <text x="${width * 0.5}" y="${height * 0.82}" font-family="Arial, sans-serif" font-size="${Math.min(width, height) * 0.03}" fill="${TEXT_COLOR}" text-anchor="middle">${label}</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(screenshotsDir, filename));

  console.log(`Created: screenshots/${filename}`);
}

/**
 * Create maskable icon with safe zone padding (adds background padding for safe zone)
 */
async function createMaskableIcon(size, filename) {
  // For maskable icons, the safe zone is the inner 80% circle
  // We need to add 10% padding on each side
  const padding = Math.floor(size * 0.1);
  const iconSize = size - (padding * 2);

  // Create a background with the icon centered
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${PRIMARY_COLOR}"/>
      <circle cx="${size/2}" cy="${size/2}" r="${iconSize * 0.35}" fill="white"/>
      <text x="${size/2}" y="${size/2 + size * 0.08}" font-family="Arial, sans-serif" font-size="${size * 0.25}" fill="${PRIMARY_COLOR}" text-anchor="middle" font-weight="bold">F</text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(iconsDir, filename));

  console.log(`Created: icons/${filename}`);
}

async function main() {
  console.log('Generating PWA assets...\n');

  // Generate screenshots
  await createScreenshot(1280, 720, 'dashboard.png', 'Vue d\'ensemble - Desktop');
  await createScreenshot(750, 1334, 'mobile.png', 'Vue mobile - Smartphone');
  await createScreenshot(1024, 768, 'tablet.png', 'Vue tablette');

  // Generate maskable icons
  await createMaskableIcon(192, 'icon-192-maskable.png');
  await createMaskableIcon(512, 'icon-512-maskable.png');

  console.log('\nDone! All PWA assets generated.');
}

main().catch(console.error);
