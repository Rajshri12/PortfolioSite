// One-off: generate PWA PNG icons from the flame SVG. Run: node scripts/gen-icons.mjs
import sharp from "sharp";

const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='#1e293b'/><path d='M16 4 C16 4 10 10 10 17 C10 21.4 12.7 25 16 25 C19.3 25 22 21.4 22 17 C22 10 16 4 16 4Z' fill='#f59e0b'/><path d='M16 10 C16 10 13 14 13 18 C13 20.2 14.3 22 16 22 C17.7 22 19 20.2 19 18 C19 14 16 10 16 10Z' fill='#fde68a'/><ellipse cx='16' cy='19' rx='2.5' ry='3' fill='#fff7ed' opacity='0.9'/></svg>`;
const b = Buffer.from(svg);

await sharp(b, { density: 1200 }).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(b, { density: 1200 }).resize(512, 512).png().toFile("public/icons/icon-512.png");
// maskable: flame scaled into the safe zone (80%) on full-bleed slate background
const safe = Buffer.from(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='#1e293b'/><g transform='translate(16 16) scale(0.78) translate(-16 -16)'><rect width='32' height='32' rx='0' fill='#1e293b'/><path d='M16 4 C16 4 10 10 10 17 C10 21.4 12.7 25 16 25 C19.3 25 22 21.4 22 17 C22 10 16 4 16 4Z' fill='#f59e0b'/><path d='M16 10 C16 10 13 14 13 18 C13 20.2 14.3 22 16 22 C17.7 22 19 20.2 19 18 C19 14 16 10 16 10Z' fill='#fde68a'/><ellipse cx='16' cy='19' rx='2.5' ry='3' fill='#fff7ed' opacity='0.9'/></g></svg>`);
await sharp(safe, { density: 2400 }).resize(512, 512).png().toFile("public/icons/icon-maskable-512.png");
console.log("icons done");
