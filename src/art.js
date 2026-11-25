'use strict';
// Сцены из выбранного листа палитр. Для холодильника сохранены отдельные слои и движение пара.
const ART_SRC = {
  fridge: ['back', 'watermelon', 'milk', 'eggs', 'pickles', 'broccoli', 'yogurt', 'bottle'], // без винограда: гроздь «стояла» на полке
  kitchen: ['scene'],
  oven: ['scene'],
  cellar: ['scene'],
  feast: ['scene'],
};
const ART_IMG = {};             // тема → { имя: Image } когда всё загружено; null — грузится; false — не вышло
const ART = {};                 // тема → { base, back: [слои], anim } или null; поверх мира арт ничего не рисует
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
// память телефона: испечёнными живут только тема текущей башни и тема следующей (≈ 19 МБ холстов на тему), остальные выбрасываются
function artNext() { return tower ? themeFor(tower.tp.N + 1).id : null; }
function artEvict(keep) { const cur = tower ? tower.tp.theme : null; for (const t in ART) if (t !== keep && t !== cur && t !== artNext()) delete ART[t]; } // текущую не трогать: иначе перепечётся в кадре (финальное ревью)
// прогрев между кадрами вне игры (титул, финиш, смерть): сначала текущая тема, если её ещё нет (картинки опоздали к старту),
// потом следующая; true — готово (или картинок нет), звать больше не нужно; false — звать ещё. В игре не печёт: стоп ≈ 0.4 с в кадре
function artWarm() {
  const todo = [tower ? tower.tp.theme : null, artNext()].filter(t => t && !(t in ART) && ART_IMG[t] !== false && ART_IMG[t] !== undefined);
  if (!todo.length) return true;         // печь нечего (и без картинок вовсе — таймер гаснет сразу)
  if (state === 'play') return false;    // в игре ждём экрана вне игры
  if (ART_IMG[todo[0]] === null) return false; // картинки ещё грузятся
  artGet(todo[0]); return false;
}
// T — шаг повтора в координатах поля, S — плотность текстуры, p — скорость параллакса.
function artLayer({ T, S, p }, paint) {
  const c = document.createElement('canvas');
  c.width = Math.round(W * S); c.height = Math.round(T * S);
  const g = c.getContext('2d');
  g.scale(S, S); paint(g, T);
  return { c, p, T };
}
function artDraw(layers, b) {
  ctx.globalAlpha = 1;
  for (const l of layers) {
    const off = ((-camY * l.p) % l.T + l.T) % l.T;
    for (let y = off - l.T * Math.ceil((off - b.y0) / l.T); y < b.y1; y += l.T) ctx.drawImage(l.c, 0, y, W, l.T + 1); // +1: повторы внахлёст, без волосяного шва при дробном масштабе
  }
}
function artGet(theme) {
  if (theme in ART) return ART[theme];
  if (ART_IMG[theme] === undefined) artLoad(theme);
  const im = ART_IMG[theme];
  if (im === null || im === undefined) return null;   // ещё грузится или картинок нет — пока старый фон
  try {
    ART[theme] = im ? (im.scene ? { scene: im.scene, base: '#211b18' } : bakeFridge(im)) : null;
  } catch (e) {
    console.warn('Ошибка подготовки фона:', theme, e);
    ART[theme] = null;
  }
  artEvict(theme);
  return ART[theme];
}
function artBg(theme, b) { // фон темы из картинок — только уже испечённой (печёт artPrepare/artWarm, не кадр игры); false — старый фон
  const a = ART[theme]; if (!a) return false;
  ctx.fillStyle = a.base; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  if (a.scene) {
    // Весь видимый столб заполнен одной комнатой. При подъёме камера плавно открывает верх картины.
    const im = a.scene, height = b.y1 - b.y0;
    const scale = Math.max(W / im.width, (height + 64) / im.height);
    const width = W / scale, visible = height / scale;
    const progress = clamp(-camY / tower.tp.height, 0, 1);
    ctx.drawImage(im, (im.width - width) / 2, (im.height - visible) * (1 - progress), width, visible, 0, b.y0, W, height);
  } else {
    artDraw(a.back, b); a.anim(b);
  }
  return true;
}
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
function prop(g, im, cx, base, h) {
  const w = im.width * h / im.height;
  glowE(g, cx, base - 2, w * 0.62, 0.14, [0, 8, 20], 0.6);
  g.drawImage(im, cx - w / 2, base - h, w, h);
}

// ---------- тема «Холодильник» ----------
function bakeFridge(im) {
  const back = [
    artLayer({ T: 702, S: 2, p: 0.2 }, (g, T) => { // камера холодильника: задник, тёплые лампы, холодная глубина, тень по краям
      g.drawImage(im.back, 0, 0, W, T);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = 'rgb(150,175,205)'; g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
      for (const dy of [-T, 0, T]) for (const [lx, ly] of [[150, 110], [330, 460]]) glowE(g, lx, ly + dy, 300, 0.6, [255, 236, 200], 0.28);
      g.fillStyle = rgb(FOG, 0.3); g.fillRect(0, 0, W, T);
      for (const [x0, x1] of [[0, 110], [W, W - 110]]) { const eg = g.createLinearGradient(x0, 0, x1, 0); eg.addColorStop(0, 'rgba(0,6,16,0.55)'); eg.addColorStop(1, 'rgba(0,6,16,0)'); g.fillStyle = eg; g.fillRect(Math.min(x0, x1), 0, 110, T); }
    }),
    // 800 × 4000 пикселей: на стекле видны мелкие детали, слой помещается в холст высотой 4096.
    artLayer({ T: 2400, S: 5 / 3, p: 0.6 }, (g, T) => { // вещи на стеклянных полках: мир глазами тефтели
      const base = s => s - 18;
      for (const s of [800, 1600]) glassShelf(g, s, 36);
      glassShelf(g, T - 14, 36); g.save(); g.translate(0, -T); glassShelf(g, T - 14, 36); g.restore(); // полка на стыке повтора: низ тайла и её продолжение сверху
      // размеры вещей — в одном масштабе, ≈ 12 px поля на сантиметр (плейтест 30.09: «почему брокколи больше бутылки молока?»)
      prop(g, im.watermelon, 120, base(800), 300); prop(g, im.eggs, 380, base(800), 130);
      prop(g, im.pickles, 95, base(1600), 215); prop(g, im.yogurt, 240, base(1600), 100); prop(g, im.milk, 400, base(1600), 290);
      prop(g, im.broccoli, 110, base(T - 14), 180); prop(g, im.yogurt, 250, base(T - 14), 100); prop(g, im.bottle, 410, base(T - 14), 310);
      g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(120,160,210,0.16)'; g.fillRect(0, 0, W, T); g.fillStyle = rgb(FOG, 0.22); g.fillRect(0, 0, W, T); g.globalCompositeOperation = 'source-over';
    }),
  ];
  return {
    base: 'rgb(28,48,70)', back,
    anim(b) { // холодный пар медленно плывёт поперёк
      for (let i = 0; i < 3; i++) { const y = ((i * 310 - camY * 0.45) % 930 + 930) % 930 - 40, x = ((tGame * (9 + i * 5) + i * 170) % 760) - 140;
        glowE(ctx, x, y, 220, 0.28, [205, 232, 255], 0.06); }
    },
  };
}
expose({ ART, ART_IMG, ART_SRC, ART_WAIT_MS, artPrepare, artWarm, artBg });
