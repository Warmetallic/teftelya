// Картинки арта для снимков в Node: node-canvas не читает WebP, поэтому assets/art/<тема>/*.webp декодирует sharp в PNG,
// а loadImage из canvas делает из них Image. Кладёт их в dbg.ART_IMG — как будто браузер уже всё загрузил.
const path = require('path'), sharp = require('sharp'), { loadImage } = require('canvas');
const ROOT = path.join(__dirname, '..', 'assets', 'art');
async function loadArt(dbg) {
  for (const [theme, names] of Object.entries(dbg.ART_SRC)) {
    const imgs = {};
    for (const name of names) {
      const file = path.join(ROOT, theme, name + '.webp');
      imgs[name] = await loadImage(await sharp(file).png().toBuffer());
    }
    dbg.ART_IMG[theme] = imgs;
  }
}
module.exports = { loadArt };
