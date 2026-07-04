// Generate PWA icons dari SVG inline. Jalankan sekali: npm run icons
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" rx="${pad ? 0 : 96}" fill="#4c5bf5"/>
  <g transform="translate(${pad ? 96 : 64},${pad ? 96 : 64}) scale(${pad ? 0.625 : 0.75})">
    <path d="M64 96c0-35 29-64 64-64h256c35 0 64 29 64 64v160c0 35-29 64-64 64H192l-96 80v-80c-18 0-32-29-32-64V96z"
      fill="#ffffff"/>
    <circle cx="176" cy="176" r="24" fill="#4c5bf5"/>
    <circle cx="256" cy="176" r="24" fill="#4c5bf5"/>
    <circle cx="336" cy="176" r="24" fill="#4c5bf5"/>
  </g>
</svg>`;

await mkdir("public/icons", { recursive: true });

for (const size of [192, 512]) {
  await sharp(Buffer.from(svg(false)))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
}
await sharp(Buffer.from(svg(true)))
  .resize(512, 512)
  .png()
  .toFile("public/icons/icon-maskable-512.png");

console.log("Icons generated in public/icons/");
