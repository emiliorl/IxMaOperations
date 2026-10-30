const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateLogos() {
  const publicDir = path.join(__dirname, '..', 'public');

  // Option 1: Dark Slate text for standard Google Workspace (light header theme)
  const svgLightHeader = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="36 20 506 160" width="304" height="96">
  <defs>
    <linearGradient id="jadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2DD4BF" />
      <stop offset="100%" stop-color="#0D9488" />
    </linearGradient>
  </defs>
  <!-- Hexagonal Isometric Core (Ix + Ma) -->
  <g transform="translate(8, 0)">
    <!-- Left Hemisphere: Mayan 'Ix' Step-Fret (Greca) Earth Foundation -->
    <path d="M 94 20 L 30 57 L 30 143 L 94 180 L 94 154 L 52 130 L 52 70 L 94 46 Z" fill="#0D9488" />
    <!-- Inner Mayan Greca Step Hook -->
    <path d="M 94 64 L 68 79 L 68 121 L 94 136 L 94 118 L 83 111 L 83 89 L 94 82 Z" fill="#2DD4BF" opacity="0.9" />
    <!-- Three Mayan Jaguar / Tensor Silicon Nodes (Triad) -->
    <rect x="61" y="96" width="8" height="8" rx="1.5" fill="#F59E0B" />
    <rect x="73" y="83" width="8" height="8" rx="1.5" fill="#2DD4BF" />
    <rect x="73" y="109" width="8" height="8" rx="1.5" fill="#2DD4BF" />
    <!-- Right Hemisphere: Taiwan 'Ma' Kinetic Semiconductor Wafer Blades -->
    <polygon points="106,36 170,73 170,97 106,60" fill="#2DD4BF" />
    <polygon points="106,74 170,111 170,135 106,98" fill="#0D9488" />
    <polygon points="106,112 156,141 132,155 106,140" fill="#2DD4BF" opacity="0.85" />
    <!-- Central Virgo Precision Diamond Node (Bridges Ix & Ma) -->
    <polygon points="100,86 112,100 100,114 88,100" fill="#F59E0B" />
  </g>
  <!-- Custom Integrated Typography with High Contrast Dark Slate for Light Backgrounds -->
  <g transform="translate(224, 0)">
    <!-- 'I' -->
    <path d="M 0 54 H 28 V 70 H 20 V 138 H 0 V 54 Z" fill="#0F172A" />
    <rect x="0" y="34" width="20" height="12" rx="2" fill="#0D9488" />
    <!-- 'x' -->
    <polygon points="44,74 63,74 114,138 95,138" fill="#0F172A" />
    <polygon points="95,74 114,74 63,138 44,138" fill="#2DD4BF" />
    <polygon points="79,95 90,106 79,117 68,106" fill="#F59E0B" />
    <!-- 'M' -->
    <path d="M 134 138 V 54 H 156 L 182 94 L 208 54 H 230 V 138 H 210 V 84 L 182 125 L 154 84 V 138 H 134 Z" fill="#0F172A" />
    <!-- 'a' -->
    <path d="M 254 88 C 254 76 266 71 284 71 C 304 71 316 78 316 95 V 138 H 298 V 129 C 292 136 283 139 272 139 C 257 139 248 130 248 118 C 248 104 259 98 280 98 H 298 V 94 C 298 87 292 84 282 84 C 273 84 268 87 266 92 L 254 88 Z M 281 109 C 270 109 265 112 265 118 C 265 123 270 126 278 126 C 290 126 298 120 298 112 V 109 H 281 Z" fill="#0F172A" />
    <!-- 'OPERATIONS' Sub-header -->
    <rect x="0" y="158" width="48" height="3" rx="1.5" fill="#0D9488" />
    <circle cx="58" cy="159.5" r="2.5" fill="#F59E0B" />
    <text x="72" y="164" fill="#334155" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="700" letter-spacing="0.38em">OPERATIONS</text>
  </g>
</svg>`;

  // 1. Primary: Transparent background, dark text (Recommended for standard Google Workspace)
  const logoLightHeaderBuffer = await sharp(Buffer.from(svgLightHeader))
    .resize(304, 96)
    .extend({
      top: 18,
      bottom: 18,
      left: 8,
      right: 8,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'google-workspace-logo-dark-text.png'));

  // 2. White background version (in case non-transparent is preferred)
  await sharp(Buffer.from(svgLightHeader))
    .resize(304, 96)
    .extend({
      top: 18,
      bottom: 18,
      left: 8,
      right: 8,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'google-workspace-logo-white-bg.png'));

  // 3. Original dark-mode version (white text on dark background #0B1120)
  const originalSvg = fs.readFileSync(path.join(publicDir, 'logo.svg'), 'utf8');
  await sharp(Buffer.from(originalSvg))
    .resize(304, 96)
    .extend({
      top: 18,
      bottom: 18,
      left: 8,
      right: 8,
      background: { r: 11, g: 17, b: 32, alpha: 1 }
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'google-workspace-logo-dark-bg.png'));

  console.log('Generated all 3 variants successfully.');
}

generateLogos().catch(console.error);
