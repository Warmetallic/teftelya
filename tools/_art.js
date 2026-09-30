// Картинки арта для снимков в Node: node-canvas не читает WebP, поэтому assets/art/<тема>/*.webp декодирует sharp в PNG,
// а loadImage из canvas делает из них Image. Кладёт их в dbg.ART_IMG — как будто браузер уже всё загрузил.
const fs = require('fs'), path = require('path'), sharp = require('sharp'), { loadImage } = require('canvas');
const ROOT = path.join(__dirname, '..', 'assets', 'art');
async function loadArt(dbg) {
  if (!fs.existsSync(ROOT)) return;
  for (const theme of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, theme); if (!fs.statSync(dir).isDirectory()) continue;
    const imgs = {};
    for (const f of fs.readdirSync(dir)) if (f.endsWith('.webp')) imgs[f.slice(0, -5)] = await loadImage(await sharp(path.join(dir, f)).png().toBuffer());
    dbg.ART_IMG[theme] = imgs;
  }
}
module.exports = { loadArt };
