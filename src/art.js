'use strict';
// ---------- проба арта (ветка art-probe-fridge): фон «Холодильник» из картинок — место, увиденное глазами тефтели ----------
// Владелец (2026-09-25): «должен быть прям хороший нарисованный холодильник, как будто мы внутри; у Pixar почти всё
// реалистично, только мультяшно». Картинки сгенерированы локально (SDXL DreamShaper XL Lightning, OpenRAIL++; фон вещей
// вырезан rembg) — assets/art/<тема>/*.webp. Код собирает из них слои: задник камеры холодильника, вещи на стеклянных
// полках, размытый передний план; запекает один раз (свет ламп, холодная тонировка, размытие глубины) и двигает с
// параллаксом. Пока картинки грузятся или их нет (тесты в Node), рисуется старый фон темы.
const ART_SRC = {
  fridge: ['back', 'watermelon', 'milk', 'eggs', 'pickles', 'grapes', 'broccoli', 'yogurt', 'bottle'],
  kitchen: ['back', 'pot', 'board', 'grater', 'flour', 'towel', 'kettle', 'spoon'],
  oven: ['back', 'buns', 'chicken', 'pie', 'potato', 'tongs', 'mitt'],
  sink: ['back', 'soap', 'plates', 'cup', 'brush', 'foam'], // без губки: жёлто-зелёный брусок не отличить от платформы-сыра
  feast: ['back', 'cake', 'fruit', 'glass', 'gift', 'crackers', 'candle'],
};
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
function artLayer({ T, S = 1, p, blur = 0, alpha = 1, wobble = 0 }, paint) {
  const c = document.createElement('canvas'); c.width = Math.round(W * S); c.height = Math.round(T * S); const g = c.getContext('2d');
  g.scale(S, S); paint(g, T); g.setTransform(1, 0, 0, 1, 0, 0);
  if (blur > 0) artBlur(g, c.width, c.height, blur);
  return { c, p, T, alpha, wobble };
}
function artDraw(layers, b) {
  for (const l of layers) {
    const off = ((-camY * l.p) % l.T + l.T) % l.T, wy = l.wobble ? Math.sin(tGame * 5) * l.wobble : 0; ctx.globalAlpha = l.alpha; // wobble — дрожащий жар
    for (let y = off - l.T * Math.ceil((off - b.y0) / l.T); y < b.y1; y += l.T) ctx.drawImage(l.c, 0, y + wy, W, l.T);
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
function tileTops(T, p, b) { const off = ((-camY * p) % T + T) % T, out = []; for (let y = off - T * Math.ceil((off - b.y0) / T); y < b.y1; y += T) out.push(y); return out; } // где на экране начинаются повторы слоя
function fog(g, c, a, W_, T) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = rgb(c, a); g.fillRect(0, 0, W_, T); g.globalCompositeOperation = 'source-over'; } // утопить нарисованное в глубину темы

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
function counter(g, y) { // столешница из досок: верхняя кромка со светом, торец в тени, тень на стену под ней
  let gr = g.createLinearGradient(0, y, 0, y + 46); gr.addColorStop(0, '#b87d48'); gr.addColorStop(0.12, '#a86e3c'); gr.addColorStop(1, '#6e4524');
  g.fillStyle = gr; g.fillRect(0, y, W, 46); g.fillStyle = 'rgba(255,238,210,0.55)'; g.fillRect(0, y, W, 3);
  g.strokeStyle = 'rgba(60,35,15,0.35)'; g.lineWidth = 1.5; for (const x of [130, 300, 420]) { g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x + 6, y + 46); g.stroke(); }
  gr = g.createLinearGradient(0, y + 46, 0, y + 110); gr.addColorStop(0, 'rgba(40,24,10,0.45)'); gr.addColorStop(1, 'rgba(40,24,10,0)'); g.fillStyle = gr; g.fillRect(0, y + 46, W, 64);
}
function cabinetShelf(g, y) { // полка навесного шкафа: кремовая доска, светлая кромка, тень на стену
  let gr = g.createLinearGradient(0, y - 18, 0, y); gr.addColorStop(0, '#f1e6d2'); gr.addColorStop(1, '#c9b89c'); g.fillStyle = gr; g.fillRect(0, y - 18, W, 18);
  g.fillStyle = 'rgba(255,250,240,0.8)'; g.fillRect(0, y - 18, W, 2);
  gr = g.createLinearGradient(0, y, 0, y + 50); gr.addColorStop(0, 'rgba(40,24,10,0.4)'); gr.addColorStop(1, 'rgba(40,24,10,0)'); g.fillStyle = gr; g.fillRect(0, y, W, 50);
}
function rail(g, y) { // рейлинг с крючками
  let gr = g.createLinearGradient(0, y - 4, 0, y + 4); gr.addColorStop(0, '#e8ecef'); gr.addColorStop(0.5, '#9aa4ac'); gr.addColorStop(1, '#5c666e'); g.fillStyle = gr; g.fillRect(0, y - 4, W, 8);
  g.strokeStyle = '#8f9aa2'; g.lineWidth = 4; g.lineCap = 'round'; for (const x of [70, 200, 330, 440]) { g.beginPath(); g.moveTo(x, y + 4); g.lineTo(x, y + 22); g.arc(x - 6, y + 22, 6, 0, Math.PI); g.stroke(); }
}
function ovenRack(g, y) { // решётка духовки: две хромированные трубки с перекладинами, тень вниз
  const bar = (yy, h) => { const gr = g.createLinearGradient(0, yy, 0, yy + h); gr.addColorStop(0, '#f2f4f6'); gr.addColorStop(0.45, '#a9b1b8'); gr.addColorStop(1, '#4d565e'); g.fillStyle = gr; g.fillRect(0, yy, W, h); };
  bar(y, 9); bar(y + 22, 7);
  g.strokeStyle = '#8b949c'; g.lineWidth = 5; for (let x = 18; x < W; x += 36) { g.beginPath(); g.moveTo(x, y + 9); g.lineTo(x, y + 22); g.stroke(); }
  const gr = g.createLinearGradient(0, y + 29, 0, y + 90); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, y + 29, W, 61);
}
function sinkFloor(g, y) { // дно мойки: шлифованная сталь с бликом, тень на стенку
  let gr = g.createLinearGradient(0, y, 0, y + 40); gr.addColorStop(0, '#dfe6ea'); gr.addColorStop(0.3, '#aab6bf'); gr.addColorStop(1, '#6b7981'); g.fillStyle = gr; g.fillRect(0, y, W, 40);
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, y, W, 2); g.fillStyle = 'rgba(255,255,255,0.12)'; for (let x = 0; x < W; x += 3) g.fillRect(x, y + 6, 1, 30);
  gr = g.createLinearGradient(0, y + 40, 0, y + 100); gr.addColorStop(0, 'rgba(10,24,34,0.45)'); gr.addColorStop(1, 'rgba(10,24,34,0)'); g.fillStyle = gr; g.fillRect(0, y + 40, W, 60);
}
function dishRack(g, y) { // сушилка: проволочная решётка под ярусом выше
  g.strokeStyle = '#c9d3d9'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.moveTo(0, y + 16); g.lineTo(W, y + 16); g.stroke();
  g.lineWidth = 2; for (let x = 12; x < W; x += 24) { g.beginPath(); g.moveTo(x, y - 26); g.lineTo(x, y + 16); g.stroke(); }
}
function tableEdge(g, y) { // край стола под скатертью: складка с тенью, ниже — свисающий подол
  let gr = g.createLinearGradient(0, y - 10, 0, y + 6); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, y - 10, W, 16);
  gr = g.createLinearGradient(0, y + 4, 0, y + 70); gr.addColorStop(0, 'rgba(10,20,12,0.55)'); gr.addColorStop(1, 'rgba(10,20,12,0)'); g.fillStyle = gr; g.fillRect(0, y + 4, W, 66);
}
function stand(g, cx, y, w) { // подставка-блюдо под торт и фрукты
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(cx, y + 6, w * 0.55, 12, 0, 0, 7); g.fill();
  const gr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); gr.addColorStop(0, '#b9c0c6'); gr.addColorStop(0.5, '#f4f6f8'); gr.addColorStop(1, '#8e969d'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, y, w / 2, 10, 0, 0, 7); g.fill();
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
ART_BAKE.kitchen = function (im) { // кухня: плитка над столешницей, дневной свет из окна слева, вещи на столешнице под полкой шкафа
  const KF = [92, 64, 38], tiers = [800, 1600, 2400];
  const back = [
    artLayer({ T: 702, S: 2, p: 0.2 }, (g, T) => {
      g.drawImage(im.back, 0, 0, W, T);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(232,214,190)'; g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
      for (const dy of [-T, 0, T]) glowE(g, 40, 260 + dy, 420, 0.9, [255, 244, 214], 0.28); // окно слева
      g.fillStyle = rgb(KF, 0.25); g.fillRect(0, 0, W, T);
      const eg = g.createLinearGradient(W, 0, W - 140, 0); eg.addColorStop(0, 'rgba(30,18,8,0.45)'); eg.addColorStop(1, 'rgba(30,18,8,0)'); g.fillStyle = eg; g.fillRect(W - 140, 0, 140, T);
    }),
    artLayer({ T: 2400, S: 1.5, p: 0.6, blur: 2 }, (g, T) => {
      const base = s => s - 2;
      for (const s of tiers) { const y = s === T ? T - 46 : s; counter(g, y); cabinetShelf(g, y - 470); rail(g, y - 400); }
      g.save(); g.translate(0, -T); cabinetShelf(g, T - 46 - 470); rail(g, T - 46 - 400); g.restore(); // продолжение верхней полки над стыком
      prop(g, im.pot, 130, base(800), 300); prop(g, im.board, 350, base(800), 220);
      prop(g, im.flour, 85, base(1600), 260); prop(g, im.kettle, 235, base(1600), 300); prop(g, im.grater, 400, base(1600), 300);
      prop(g, im.spoon, 100, base(T - 46), 280); prop(g, im.towel, 300, base(T - 46) - 60, 320); prop(g, im.board, 430, base(T - 46), 200);
      fog(g, [255, 236, 200], 0.1, W, T); fog(g, KF, 0.22, W, T);
    }),
  ];
  const front = [artLayer({ T: 1600, S: 1, p: 1.35, blur: 7, alpha: 0.7 }, (g, T) => { for (const y0 of [700, 1500]) prop(g, im.spoon, 6, y0, 330); fog(g, KF, 0.35, W, T); })]; // узкий стакан с ложками у края
  return {
    base: 'rgb(78,58,40)', back, front,
    anim(b) { // пар от чайника (второй ярус) поднимается и тает
      for (const ty of tileTops(2400, 0.6, b)) for (let i = 0; i < 4; i++) { const k = ((tGame * 0.35 + i * 0.25) % 1), y = ty + 1290 - k * 150, x = 262 + Math.sin(tGame * 1.3 + i) * 12;
        if (y > b.y0 - 60 && y < b.y1 + 60) glowE(ctx, x, y, 26 + k * 30, 0.8, [255, 250, 245], 0.16 * (1 - k)); }
    },
  };
};
ART_BAKE.oven = function (im) { // духовка: чёрная эмаль, вещи на хромированных решётках, приглушённый жар снизу, угольки
  const OF = [40, 18, 8], tiers = [800, 1600, 2400];
  const back = [
    artLayer({ T: 702, S: 2, p: 0.2 }, (g, T) => {
      g.drawImage(im.back, 0, 0, W, T);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(150,128,118)'; g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
      for (const dy of [-T, 0, T]) glowE(g, W / 2, 640 + dy, 420, 0.5, [190, 92, 40], 0.22); // жар снизу яруса, ниже цвета опасности по насыщенности
      g.fillStyle = rgb(OF, 0.3); g.fillRect(0, 0, W, T);
    }),
    artLayer({ T: 2400, S: 1.5, p: 0.6, blur: 2 }, (g, T) => {
      for (const s of tiers) ovenRack(g, (s === T ? T - 30 : s) - 6);
      g.save(); g.translate(0, -T); ovenRack(g, T - 36); g.restore();
      const base = s => (s === T ? T - 30 : s) - 6;
      prop(g, im.buns, 150, base(800), 210); prop(g, im.mitt, 390, base(800), 190);
      prop(g, im.chicken, 140, base(1600), 290); prop(g, im.potato, 330, base(1600), 170); prop(g, im.tongs, 430, base(1600), 320);
      prop(g, im.pie, 150, base(T), 230); prop(g, im.potato, 330, base(T), 150); prop(g, im.buns, 420, base(T), 180);
      fog(g, [255, 150, 70], 0.1, W, T); fog(g, OF, 0.28, W, T);
    }),
  ];
  const front = [artLayer({ T: 1600, S: 1, p: 1.35, blur: 7, alpha: 0.7, wobble: 3 }, (g, T) => { for (const y0 of [650, 1450]) prop(g, im.tongs, 10, y0, 400); fog(g, OF, 0.4, W, T); })];
  return {
    base: 'rgb(28,16,12)', back, front,
    anim(b) { // угольки всплывают из глубины
      for (let i = 0; i < 8; i++) { const k = (tGame * (0.12 + i * 0.017) + i * 0.37) % 1, x = (i * 173 + 40 + Math.sin(tGame * 0.7 + i) * 18) % W, y = b.y1 - k * (b.y1 - b.y0);
        ctx.fillStyle = `rgba(230,${110 + (i % 3) * 25},50,${0.5 * (1 - k) * (0.6 + 0.4 * Math.sin(tGame * 6 + i))})`; ctx.beginPath(); ctx.arc(x, y, 2 + (i % 2), 0, 7); ctx.fill(); }
    },
  };
};
ART_BAKE.sink = function (im) { // раковина: стальная мойка, вещи на её дне и в сушилке, пена, пузыри всплывают
  const SF = [30, 60, 80], tiers = [800, 1600, 2400];
  const back = [
    artLayer({ T: 702, S: 2, p: 0.2 }, (g, T) => {
      g.drawImage(im.back, 0, 0, W, T);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(170,195,215)'; g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
      for (const dy of [-T, 0, T]) glowE(g, 120, 180 + dy, 300, 0.7, [225, 240, 250], 0.22);
      g.fillStyle = rgb(SF, 0.3); g.fillRect(0, 0, W, T);
    }),
    artLayer({ T: 2400, S: 1.5, p: 0.6, blur: 2 }, (g, T) => {
      const base = s => (s === T ? T - 40 : s);
      for (const s of tiers) { sinkFloor(g, base(s)); dishRack(g, base(s) - 430); }
      g.save(); g.translate(0, -T); dishRack(g, T - 40 - 430); g.restore();
      prop(g, im.plates, 130, base(800), 250); prop(g, im.cup, 350, base(800), 180); prop(g, im.foam, 430, base(800) - 100, 130);
      prop(g, im.soap, 90, base(1600), 340); prop(g, im.foam, 250, base(1600), 200); prop(g, im.brush, 400, base(1600), 300);
      prop(g, im.foam, 110, base(T), 170); prop(g, im.plates, 280, base(T), 220); prop(g, im.cup, 430, base(T), 160);
      fog(g, [160, 200, 230], 0.12, W, T); fog(g, SF, 0.22, W, T);
    }),
  ];
  const front = [artLayer({ T: 1600, S: 1, p: 1.35, blur: 7, alpha: 0.7 }, (g, T) => { for (const y0 of [600, 1400]) prop(g, im.soap, 6, y0, 400); fog(g, SF, 0.35, W, T); })];
  return {
    base: 'rgb(34,56,72)', back, front,
    anim(b) { // пузыри всплывают и лопаются у верха
      for (let i = 0; i < 7; i++) { const k = (tGame * (0.08 + i * 0.013) + i * 0.29) % 1, x = (i * 131 + 60 + Math.sin(tGame * 0.9 + i * 2) * 14) % W, y = b.y1 - k * (b.y1 - b.y0), r = 5 + (i % 3) * 4;
        ctx.strokeStyle = `rgba(225,245,255,${0.55 * (1 - k * k)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - k)})`; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, 7); ctx.fill(); }
    },
  };
};
ART_BAKE.feast = function (im) { // праздничный стол: скатерть, угощение на подставках, свечи и гирлянда дрожат
  const FF = [12, 34, 22], tiers = [800, 1600, 2400];
  const back = [
    artLayer({ T: 702, S: 2, p: 0.2 }, (g, T) => {
      g.drawImage(im.back, 0, 0, W, T);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(190,170,150)'; g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
      for (const dy of [-T, 0, T]) glowE(g, W / 2, 300 + dy, 380, 0.7, [255, 214, 150], 0.22);
      g.fillStyle = rgb(FF, 0.3); g.fillRect(0, 0, W, T);
    }),
    artLayer({ T: 2400, S: 1.5, p: 0.6, blur: 2 }, (g, T) => {
      const base = s => (s === T ? T - 8 : s);
      for (const s of tiers) tableEdge(g, base(s));
      stand(g, 130, base(800) - 6, 230); prop(g, im.cake, 130, base(800) - 8, 340); prop(g, im.glass, 330, base(800), 260); prop(g, im.crackers, 420, base(800), 120);
      stand(g, 300, base(1600) - 6, 200); prop(g, im.fruit, 300, base(1600) - 8, 220); prop(g, im.candle, 100, base(1600), 320); prop(g, im.gift, 430, base(1600), 220);
      prop(g, im.gift, 110, base(T), 250); prop(g, im.candle, 250, base(T), 280); prop(g, im.glass, 380, base(T), 240); prop(g, im.crackers, 440, base(T), 100);
      fog(g, [255, 200, 130], 0.1, W, T); fog(g, FF, 0.25, W, T);
    }),
  ];
  const front = [artLayer({ T: 1600, S: 1, p: 1.35, blur: 7, alpha: 0.7 }, (g, T) => { for (const y0 of [620, 1420]) prop(g, im.glass, 12, y0, 400); fog(g, FF, 0.35, W, T); })];
  return {
    base: 'rgb(18,40,28)', back, front,
    anim(b) { // огоньки свечей дрожат (ярусы 800: торт, 1600 и 2400: подсвечники), гирлянда на задней стенке мигает
      for (const ty of tileTops(2400, 0.6, b)) for (const [x, y] of [[130, 800 - 8 - 320], [100, 1600 - 300], [250, 2400 - 8 - 262]]) {
        const sy = ty + y; if (sy < b.y0 - 80 || sy > b.y1 + 80) continue; const f = 0.7 + 0.3 * Math.sin(tGame * 9 + x);
        glowE(ctx, x + Math.sin(tGame * 7 + y) * 2, sy, 60 * f, 1.2, [255, 200, 120], 0.22 * f); }
      for (const ty of tileTops(702, 0.2, b)) for (let i = 0; i < 9; i++) { const x = 30 + i * 52, y = ty + 60 + (i % 2) * 22; if (y < b.y0 - 10 || y > b.y1 + 10) continue;
        const on = 0.45 + 0.55 * Math.max(0, Math.sin(tGame * 1.1 + i * 1.7)); ctx.fillStyle = `rgba(${[255, 120, 200][i % 3]},${[210, 220, 160][i % 3]},${[120, 255, 230][i % 3]},${0.7 * on})`; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
    },
  };
};
expose({ ART, ART_IMG, ART_SRC, ART_WAIT_MS, artPrepare, artWarm, artBg, artFg, artBlur });
