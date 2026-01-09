# PWA Icon Generation Guide

This document explains how to generate the required icons for Hub's Progressive Web App (PWA) functionality.

## Required Icons

The Hub PWA requires icons in the following sizes:

### Standard PWA Icons (for manifest.json)
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

### Apple Touch Icons
- `apple-touch-icon.png` (180x180)

### Microsoft Tile Icons
- `icon-70x70.png`
- `icon-150x150.png`
- `icon-310x310.png`
- `icon-310x150.png` (wide)

### Shortcut Icons
- `study.png` (96x96)
- `ideas.png` (96x96)
- `code.png` (96x96)
- `chat.png` (96x96)

### Apple Splash Screens (optional but recommended)
- `apple-splash-2048-2732.png` (iPad Pro 12.9")
- `apple-splash-1668-2388.png` (iPad Pro 11")
- `apple-splash-1536-2048.png` (iPad 10.2")
- `apple-splash-1125-2436.png` (iPhone X/XS)
- `apple-splash-1242-2688.png` (iPhone XS Max)

## Generating Icons

### Option 1: Using the SVG Source

A source SVG file is provided at `public/icons/icon.svg`. You can use this to generate all required sizes.

#### Using ImageMagick (recommended)

```bash
# Navigate to the icons directory
cd apps/web/public/icons

# Generate standard PWA icons
for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done

# Generate Apple touch icon
convert icon.svg -resize 180x180 apple-touch-icon.png

# Generate Microsoft tile icons
convert icon.svg -resize 70x70 icon-70x70.png
convert icon.svg -resize 150x150 icon-150x150.png
convert icon.svg -resize 310x310 icon-310x310.png

# Wide tile (needs different aspect ratio - create from 310 height)
convert icon.svg -resize 310x150 -gravity center -background "#0c0a09" -extent 310x150 icon-310x150.png
```

#### Using Sharp (Node.js)

```javascript
const sharp = require('sharp');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  for (const size of sizes) {
    await sharp(inputPath)
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `icon-${size}x${size}.png`));
    
    console.log(`Generated icon-${size}x${size}.png`);
  }
  
  // Apple touch icon
  await sharp(inputPath)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  
  console.log('Generated apple-touch-icon.png');
}

generateIcons().catch(console.error);
```

### Option 2: Using Online Tools

You can use online PWA icon generators:

1. **PWA Asset Generator**: https://pwa-asset-generator.nicstage.workers.dev/
2. **RealFaviconGenerator**: https://realfavicongenerator.net/
3. **Favicon.io**: https://favicon.io/

Upload the source SVG and download the generated icon pack.

### Option 3: Using pwa-asset-generator (npm)

```bash
# Install globally
npm install -g pwa-asset-generator

# Generate icons
npx pwa-asset-generator ./public/icons/icon.svg ./public/icons \
  --background "#0c0a09" \
  --padding "10%" \
  --type png \
  --favicon
```

## Favicon Generation

For the favicon, you can use the same SVG:

```bash
# Using ImageMagick
convert icon.svg -resize 32x32 ../favicon.ico

# Or create a multi-size ICO file
convert icon.svg \
  \( -clone 0 -resize 16x16 \) \
  \( -clone 0 -resize 32x32 \) \
  \( -clone 0 -resize 48x48 \) \
  -delete 0 -alpha on -colors 256 ../favicon.ico
```

## Screenshots for manifest.json

The manifest.json includes screenshot entries. To capture these:

1. Run the app locally: `npm run dev`
2. Open browser DevTools
3. Use device emulation for consistent sizes:
   - Desktop: 1920x1080
   - Mobile: 390x844 (iPhone 14 size)
4. Take full-page screenshots
5. Save as:
   - `public/screenshots/desktop.png`
   - `public/screenshots/mobile.png`

## Verification

After generating icons, verify the PWA configuration:

1. Open Chrome DevTools
2. Go to Application tab
3. Click on "Manifest" in the sidebar
4. Check that all icons load correctly
5. Use Lighthouse to audit PWA compliance

### Lighthouse PWA Audit

```bash
# Using Lighthouse CLI
npx lighthouse http://localhost:3000 --only-categories=pwa --view
```

## Icon Design Guidelines

- Use simple, recognizable shapes
- Ensure good contrast on both light and dark backgrounds
- Include safe area padding (recommended 10-20%)
- For maskable icons, keep important content within the safe zone (center 80%)
- Test icons on different devices and screen sizes

## Troubleshooting

### Icons not appearing
1. Clear browser cache and service worker
2. Check file paths in manifest.json
3. Verify MIME types are correct (image/png)

### Blurry icons
1. Ensure source SVG is high quality
2. Use sharp edges, avoid anti-aliasing in small sizes
3. Consider providing @2x versions for retina displays

### Installation prompt not showing
1. Check HTTPS is enabled (or localhost)
2. Verify manifest.json is valid
3. Ensure service worker is registered
4. Check browser compatibility