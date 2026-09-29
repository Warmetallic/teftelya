'use strict';
// ---------- проба арта (ветка art-probe-fridge): фон «Холодильник» из картинок — место, увиденное глазами тефтели ----------
// Владелец (2026-09-25): «должен быть прям хороший нарисованный холодильник, как будто мы внутри; у Pixar почти всё
// реалистично, только мультяшно». Картинки сгенерированы локально (SDXL DreamShaper XL Lightning, OpenRAIL++; фон вещей
// вырезан rembg) — assets/art/<тема>/*.webp. Код собирает из них слои: задник камеры холодильника, вещи на стеклянных
// полках, размытый передний план; запекает один раз (свет ламп, холодная тонировка, размытие глубины) и двигает с
// параллаксом. Пока картинки грузятся или их нет (тесты в Node), рисуется старый фон темы.
const ART_SRC = { fridge: ['back', 'watermelon', 'milk', 'eggs', 'pickles', 'grapes', 'broccoli', 'yogurt', 'bottle'] };
const ART_IMG = {};             // тема → { имя: Image } когда всё загружено; null — грузится; false — не вышло
const ART = {};                 // тема → { back: [слои], front: [слои], anim } или null
const ART_WAIT = {};            // тема → [resolve…] тех, кто ждёт её картинки (artPrepare)
const ART_WAIT_MS = 3000;       // экран загрузки ждёт картинки текущей темы не дольше этого (спека v2.2c §6)
const FOG = [18, 36, 58];       // холодная глубина холодильника
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function artSettle(theme, v) { ART_IMG[theme] = v; for (const r of ART_WAIT[theme] || []) r(); ART_WAIT[theme] = []; }
function artLoad(theme) {
  if (ART_IMG[theme] !== undefined || typeof Image === 'undefined' || !ART_SRC[theme]) return;
  const imgs = {}, names = ART_SRC[theme]; let left = names.length; ART_IMG[theme] = null;
  for (const n of names) { const im = new Image(); im.onload = () => { if (--left === 0 && ART_IMG[theme] !== false) artSettle(theme, imgs); }; im.onerror = () => artSettle(theme, false); im.src = 'assets/art/' + theme + '/' + n + '.webp'; imgs[n] = im; }
}
for (const t in ART_SRC) artLoad(t); // в браузере грузим сразу при старте
// дождаться картинок темы (не дольше maxMs) и испечь её слои — зовётся с экрана загрузки и при переходе на башню, чтобы
// запекание (≈ 0.4 с) не попадало в первый кадр игры; без картинок остаётся старый фон
function artPrepare(theme, maxMs = ART_WAIT_MS) {
  if (ART_IMG[theme] === undefined) artLoad(theme);
  const wait = ART_IMG[theme] === null && maxMs > 0 ? new Promise(res => { (ART_WAIT[theme] = ART_WAIT[theme] || []).push(res); setTimeout(res, maxMs); }) : Promise.resolve();
  return wait.then(() => { artGet(theme); });
}
// прогрев: печёт по одной ещё не испечённой теме с пришедшими картинками за вызов; true — всё готово, звать больше не нужно
function artWarm() {
  for (const t in ART_SRC) if (!(t in ART) && ART_IMG[t]) { artGet(t); return false; }
  for (const t in ART_SRC) if (!(t in ART) && ART_IMG[t] === null) return false;
  return true;
}
// размытие глубины резкости: три прохода box-blur ≈ гаусс в premultiplied alpha; по вертикали по кругу — слой повторяется без шва
function artBlur(g, w, h, r) {
  const img = g.getImageData(0, 0, w, h), d = img.data, n = w * h, ch = [0, 1, 2, 3].map(() => new Float32Array(n)), tmp = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = d[i * 4 + 3] / 255; ch[0][i] = d[i * 4] * a; ch[1][i] = d[i * 4 + 1] * a; ch[2][i] = d[i * 4 + 2] * a; ch[3][i] = d[i * 4 + 3]; }
  const k = 1 / (2 * r + 1);
  for (const c of ch) for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) { const o = y * w; let acc = 0; for (let i = -r; i <= r; i++) acc += c[o + Math.min(w - 1, Math.max(0, i))];
      for (let x = 0; x < w; x++) { tmp[o + x] = acc * k; acc += c[o + Math.min(w - 1, x + r + 1)] - c[o + Math.max(0, x - r)]; } }
    for (let x = 0; x < w; x++) { let acc = 0; for (let i = -r; i <= r; i++) acc += tmp[((i % h) + h) % h * w + x];
      for (let y = 0; y < h; y++) { c[y * w + x] = acc * k; acc += tmp[((y + r + 1) % h) * w + x] - tmp[(((y - r) % h) + h) % h * w + x]; } }
  }
  for (let i = 0; i < n; i++) { const a = ch[3][i], inv = a > 0.5 ? 255 / a : 0; d[i * 4] = ch[0][i] * inv; d[i * 4 + 1] = ch[1][i] * inv; d[i * 4 + 2] = ch[2][i] * inv; d[i * 4 + 3] = a; }
  g.putImageData(img, 0, 0);
}
// слой: T — высота повтора в пикселях поля, S — пикселей холста на пиксель поля (2 — резко на экранах с двойной
// плотностью), p — параллакс (1 = как мир), blur — радиус размытия в пикселях холста, paint рисует в координатах поля
function artLayer({ T, S = 1, p, blur = 0, alpha = 1 }, paint) {
  const c = document.createElement('canvas'); c.width = Math.round(W * S); c.height = Math.round(T * S); const g = c.getContext('2d');
  g.scale(S, S); paint(g, T); g.setTransform(1, 0, 0, 1, 0, 0);
  if (blur > 0) artBlur(g, c.width, c.height, blur);
  return { c, p, T, alpha };
}
function artDraw(layers, b) {
  for (const l of layers) {
    const off = ((-camY * l.p) % l.T + l.T) % l.T; ctx.globalAlpha = l.alpha;
    for (let y = off - l.T * Math.ceil((off - b.y0) / l.T); y < b.y1; y += l.T) ctx.drawImage(l.c, 0, y, W, l.T);
  }
  ctx.globalAlpha = 1;
}
function artGet(theme) {
  if (theme in ART) return ART[theme];
  if (ART_IMG[theme] === undefined) artLoad(theme);
  const im = ART_IMG[theme];
  if (im === null || im === undefined) return null;   // ещё грузится или картинок нет — пока старый фон
  try { ART[theme] = im && ART_BAKE[theme] ? ART_BAKE[theme](im) : null; } catch (e) { ART[theme] = null; }
  return ART[theme];
}
function artBg(theme, b) { // фон темы из картинок; false — арта нет, рисует старый фон
  const a = artGet(theme); if (!a) return false;
  ctx.fillStyle = a.base; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  artDraw(a.back, b); if (a.anim) a.anim(b);
  return true;
}
function artFg(theme) { const a = ART[theme]; if (a && a.front) artDraw(a.front, fieldBounds()); } // передний план поверх мира

// ---------- кисти ----------
function glowE(g, x, y, r, sy, c, a) { // мягкое пятно света-эллипс
  g.save(); g.translate(x, y); g.scale(1, sy); const gr = g.createRadialGradient(0, 0, 2, 0, 0, r);
  gr.addColorStop(0, rgb(c, a)); gr.addColorStop(0.45, rgb(c, a * 0.45)); gr.addColorStop(1, rgb(c, 0)); g.fillStyle = gr; g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
}
function glassShelf(g, y, depth) { // стеклянная полка: верх в перспективе, белая кромка, тень под полкой
  let gr = g.createLinearGradient(0, y - depth, 0, y); gr.addColorStop(0, 'rgba(190,225,240,0.10)'); gr.addColorStop(1, 'rgba(205,235,248,0.26)');
  g.fillStyle = gr; g.fillRect(0, y - depth, W, depth);
  gr = g.createLinearGradient(0, y, 0, y + 14); gr.addColorStop(0, '#f4f8fa'); gr.addColorStop(0.35, '#cfd9df'); gr.addColorStop(1, '#8e9ca6');
  g.fillStyle = gr; g.fillRect(0, y, W, 14); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(0, y, W, 2);
  gr = g.createLinearGradient(0, y + 14, 0, y + 80); gr.addColorStop(0, 'rgba(0,10,24,0.45)'); gr.addColorStop(1, 'rgba(0,10,24,0)'); g.fillStyle = gr; g.fillRect(0, y + 14, W, 66);
}
// вещь на полке: низ на base, высота h в пикселях поля; мягкая контактная тень
function prop(g, im, cx, base, h) {
  const w = im.width * h / im.height;
  glowE(g, cx, base - 2, w * 0.62, 0.14, [0, 8, 20], 0.6);
  g.drawImage(im, cx - w / 2, base - h, w, h);
}

// ---------- тема «Холодильник» ----------
const ART_BAKE = {
  fridge(im) {
    const back = [
      artLayer({ T: 702, S: 2, p: 0.2 }, (g, T) => { // камера холодильника: задник, тёплые лампы, холодная глубина, тень по краям
        g.drawImage(im.back, 0, 0, W, T);
        g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(150,175,205)'; g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
        for (const dy of [-T, 0, T]) for (const [lx, ly] of [[150, 110], [330, 460]]) glowE(g, lx, ly + dy, 300, 0.6, [255, 236, 200], 0.28);
        g.fillStyle = rgb(FOG, 0.3); g.fillRect(0, 0, W, T);
        for (const [x0, x1] of [[0, 110], [W, W - 110]]) { const eg = g.createLinearGradient(x0, 0, x1, 0); eg.addColorStop(0, 'rgba(0,6,16,0.55)'); eg.addColorStop(1, 'rgba(0,6,16,0)'); g.fillStyle = eg; g.fillRect(Math.min(x0, x1), 0, 110, T); }
      }),
      artLayer({ T: 2400, S: 1.5, p: 0.6, blur: 2 }, (g, T) => { // вещи на стеклянных полках: мир глазами тефтели
        const base = s => s - 18;
        for (const s of [800, 1600]) glassShelf(g, s, 36);
        glassShelf(g, T - 14, 36); g.save(); g.translate(0, -T); glassShelf(g, T - 14, 36); g.restore(); // полка на стыке повтора: низ тайла и её продолжение сверху
        prop(g, im.watermelon, 120, base(800), 300); prop(g, im.eggs, 380, base(800), 150);
        prop(g, im.pickles, 95, base(1600), 290); prop(g, im.grapes, 240, base(1600), 230); prop(g, im.milk, 400, base(1600), 390);
        prop(g, im.broccoli, 115, base(T - 14), 300); prop(g, im.yogurt, 290, base(T - 14), 150); prop(g, im.bottle, 410, base(T - 14), 300);
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(120,160,210,0.16)'; g.fillRect(0, 0, W, T); g.fillStyle = rgb(FOG, 0.22); g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
      }),
    ];
    const front = [artLayer({ T: 1600, S: 1, p: 1.35, blur: 7, alpha: 0.75 }, (g, T) => { // передний план: размытые бутылки у самого края
      for (const y0 of [620, 1420]) prop(g, im.bottle, 4, y0, 420);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgb(FOG, 0.35); g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
    })];
    return {
      base: 'rgb(28,48,70)', back, front,
      anim(b) { // холодный пар медленно плывёт поперёк
        for (let i = 0; i < 3; i++) { const y = ((i * 310 - camY * 0.45) % 930 + 930) % 930 - 40, x = ((tGame * (9 + i * 5) + i * 170) % 760) - 140;
          glowE(ctx, x, y, 220, 0.28, [205, 232, 255], 0.06); }
      },
    };
  },
};
expose({ ART, ART_IMG, ART_WAIT_MS, artPrepare, artWarm, artBg, artFg, artBlur });
