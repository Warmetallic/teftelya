// Картинки арта для снимков в Node: node-canvas не читает WebP, поэтому assets/art/<тема>/*.webp декодирует sharp в PNG,
// а loadImage из canvas делает из них Image. Кладёт их в dbg.ART_IMG — как будто браузер уже всё загрузил.
const path = require('path'), sharp = require('sharp'), { loadImage } = require('canvas');
const ROOT = path.join(__dirname, '..', 'assets', 'art');
// Все кадры используют одни и те же неизменяемые исходные изображения.
const decoded = new Map();
function readImage(file) {
  if (!decoded.has(file)) decoded.set(file, file.endsWith('.webp')
    ? sharp(file).png().toBuffer().then(buffer => loadImage(buffer)) : loadImage(file));
  return decoded.get(file);
}
async function loadArt(dbg) {
  for (const name of ['pendulum','mallet','roller','grater'])
    dbg.trapSprites[name] = await readImage(path.join(ROOT,'traps',name+'.png'));
  for (const [theme, names] of Object.entries(dbg.ART_SRC)) {
    const imgs = {};
    for (const name of names) {
      const file = path.join(ROOT, theme, name + '.webp');
      imgs[name] = await readImage(file);
    }
    dbg.ART_IMG[theme] = imgs;
  }
}
module.exports = { loadArt };
