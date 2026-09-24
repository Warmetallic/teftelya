# Тефтеля v2.1.1 «Читаемость» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Игра объясняет себя картинкой. Жизни видны на самой Тефе, урон единый, берсерк стал суперсилой по тапу, масло льют сверху, башня собрана из фрагментов, где прыжок в воздухе нужен, опасное узнаётся по цвету.

**Architecture:** Модули остаются обычными скриптами с общей областью видимости, порядок задаёт `index.html`. `streak.js` заменяется на `power.js`, `hazards.js` получает налив сверху, `tower.js` переписан на фрагменты с безопасным путём, `tefa.js` рисует жизни и кэширует тела уровней. Модули ниже `game.js` возвращают события, а `game.js` применяет урон, лечение и очки шкалы. Бот `tools/bot.js` ходит по безопасному пути генератора в тестах и снимках.

**Tech Stack:** Vanilla JS и Canvas 2D без бандлера. Node 22 для headless-тестов (`tools/_env.js`). node-canvas для снимков (`npm run shot`). `tools/build.js` склеивает всё в один `dist/index.html` и `dist/teftelya.zip`.

**Spec:** `docs/specs/2026-09-24-v2-1-1-readability-design.md` (главнее спеки v2 `docs/specs/2026-09-23-v2-core-loop-design.md` там, где они расходятся). Уточнения, найденные при подготовке плана, записываются в её §16 задачей 8.

## Как читать план

- План написан по прототипу. Каждую задачу сначала сделали во временной копии ветки. Там тесты задачи падали до реализации и проходили после, `npm test` был зелёным на каждом из восьми коммитов, снимки рисовались. Код ниже снят с этих коммитов без перепечатки.
- База задачи 1 — коммит спеки `8a85008`, база каждой следующей — результат предыдущей.
- Правка файла дана диффом. Его можно сохранить в файл и применить из корня репозитория командой `git apply файл` или перенести руками по контексту.
- Новый файл и файл, в котором меняется больше половины строк, даны целиком. Их содержимое заменяется полностью.
- Порядок задач важен: каждая опирается на имена из блока **Interfaces** предыдущих.

## Global Constraints

- Спека v2.1.1 главнее спеки v2 там, где они расходятся.
- Зависимости только вниз: модули ниже `game.js` возвращают события и не пишут его состояние (спека §11).
- `src/streak.js` заменяется на `src/power.js` на том же месте порядка скриптов (§11).
- Сохранение: схема v4 без изменения версии, `UP_MAX` получает ключ `fury: 2`, отсутствующий ключ равен 0, слияние — максимум по ключу (§10).
- Каждая опасность снимает один кусок, мгновенно убивает только падение за экран; `dmg(N)` удаляется (§7.1).
- Шкала (§4.1):
  - `POWER_FULL = 30`;
  - +1 за первую посадку на платформу за забег, +1 за еду, +2 за еду в полёте, +3 за отставшую муху;
  - удар отнимает `POWER_FULL · 0.25 · [1, 0.5, 0.25][«Стойкость»]`;
  - «Кураж» умножает очки на `1 + 0.15·уровень`, потолок 2.
- Лимит и берсерк (§4.2, §4.3): `berserkLimit() = 1 + up.fury`, потолок 2; длительность `6 + 0.5·«Аппетит»` с.
- Тап по Тефе (§3.4): работает на платформе и в воздухе, заряды не тратит. При неполной шкале, исчерпанном лимите и идущем берсерке это обычный прыжок. Первый тап после паузы только снимает паузу.
- Налив масла (§7.2):
  - первый налив не раньше 5 с после старта башни и 4 с после нового чекпоинта;
  - интервал `max(3, 9 − 0.3·(N − 1))` ± 1 с;
  - предупреждение 0.6 с, затем 4 капли с интервалом 0.08 с, скорость 700 px/с;
  - капля попадает при расстоянии меньше `r + 8`;
  - пятно шириной 36 px живёт 1 с и жжёт стоящую рядом Тефу;
  - с башни 6 иногда второй налив через 0.4 с в другом столбе;
  - в берсерке капли съедаются, пятна не жгут.
- Сыр: через 0.5 с после посадки крошится и пропадает, через 3 с отрастает, урона не наносит (§6.3).
- Платформы (§6.3):
  - башня 1: тарелка ≈ 50 %, сковородка ≈ 25 % с ряда 3, поднос ≈ 25 %;
  - с башни 2: 50 / 20 / 15 % плюс сыр ≈ 15 %;
  - ширина 100–140 px в башне 1, дальше уже, не меньше 80 px.
- Пропасть не больше 3 пустых рядов, до башни 4 — 2 (§6.2).
- Русские строки о Тефе без гендерных форм (§9).
- Все числа черновые (§15), но в коде ровно те, что в этом плане.
- `npm test` — одиннадцать скриптов. Ожидаемый шум — ровно два блока `YaGames.init failed, using stub …` от `test_sdk`.
- Каждый модуль заканчивается `expose({…})`. `Object.assign` для DBG не годится: он вызывает геттеры один раз.
- Листы дизайна `shots/design_tefa_*.png` не перезаписывать.
- Порт 8080 занят BuildLocal. Игровой сервер, если нужен, поднимать только на 8765 и гасить после проверки.
- Коммиты с трейлером `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Слияние в `main` и push — только после «да» владельца.

## Review Focus

Случаи, которые спека подразумевает, но которые до подготовки плана не проверял ни один тест; сверху самые вероятные. Тест для каждого уже вписан в задачу, которая владеет кодом.

1. Тап по Тефе при неполной шкале, во время берсерка и после исчерпанного лимита должен остаться обычным прыжком и потратить заряд (§3.4). Тест: задача 3, `tools/smoke.js`, проверки «неполная шкала», «во время берсерка», «лимит исчерпан».
2. Тап по Тефе в воздухе при полной шкале включает силу и не тратит заряд (§3.4). Тест: задача 3, `tools/smoke.js`, проверка «Тефа в воздухе» перед тапом.
3. Первый тап после паузы, даже по Тефе с полной шкалой, только снимает паузу (§3.4). Тест: задача 3, `tools/smoke.js`, «и не суперсила, даже по Тефе с полной шкалой».
4. В берсерке пятно масла не жжёт стоящую на нём Тефу (§7.2). Тест: задача 4, `tools/test_hazards.js`, «в берсерке пятно не жжёт».
5. С башни 6 второй налив идёт в другом столбе на 0.4 с позже, до башни 6 столб один, а первый столб целится по ходу Тефы (§7.2). Тест: задача 4, `tools/test_hazards.js`, «столб по ходу», «с башни 6 бывает два столба», «до башни 6 столб один».

## Карта файлов

| Файл | Задачи | Что меняется |
|---|---|---|
| `src/game.js` | 1, 2, 3, 4, 5 | лечение и урон 1, таймер заживления, шкала и активация, передышки налива, событие сыра |
| `src/hazards.js` | 1, 3, 4 | события `eaten` и `hit` лопастей, удвоенный шанс мухи, налив сверху |
| `src/tower.js` | 1, 4, 6 | без `dmg`, без масла, генератор фрагментов с путём и шансом ножа |
| `src/tefa.js` | 2 | жизни-укусы, лица состояний, свечение, берсерк, заживление, кэш тел и сырого фарша |
| `src/ball.js` | 2, 5 | `HEAL_T` и `healT`; прицел от высоты цели |
| `src/render.js` | 2, 3, 4, 5, 7 | Тефа без ободка, шкала, налив, сыр, еда новых форм, акценты опасностей, обводка надписей |
| `src/power.js` | 3 (новый) | шкала, лимит, берсерк, скрытая серия для мух |
| `src/streak.js` | 3 (удалить) | — |
| `src/main.js` | 3 | тап по Тефе, клавиша E |
| `src/save.js` | 3 | `UP_MAX.fury = 2` |
| `src/i18n.js` | 3, 4 | подсказки титула, `tapTefa` вместо `streak` |
| `src/platforms.js` | 5 | сыр: крошение и отрастание |
| `src/fx.js` | 7 | надписи в поле, без наложений |
| `index.html`, `package.json` | 3 | `power.js` и `test_power.js` вместо `streak` |
| `tools/bot.js` | 6 (новый) | бот по безопасному пути |
| `tools/test_*.js`, `tools/smoke.js` | 1–7 | тесты задач; `test_power.js` новый, `test_streak.js` удалить |
| `tools/shot.js`, `tools/shot_tefa.js` | 2, 3, 6, 8 | лист состояний Тефы, сцены берсерка, бот, новые сцены |
| `README.md`, `docs/DEVLOG.md`, спека | 8 | правила v2.1.1, запись сессии 7, §16 |

---

## Task 1. Урон и лечение (спека §5, §7.1)

Каждая опасность снимает ровно один кусок, лопасти больше не убивают сразу. Еда не лечит. Башня, «Продолжить» и «С чекпоинта» начинаются с полной массой, новый чекпоинт лечит до полной, в берсерке съеденная муха или капля масла возвращает кусок.

**Files:**
- Modify: `src/game.js`
- Modify: `src/hazards.js`
- Modify: `src/tower.js`
- Test: `tools/test_game.js`
- Test: `tools/test_hazards.js`
- Test: `tools/test_tower.js`

**Interfaces:**
- Consumes: `massMax()`, `coinsFor(kind)`, `burst(...)`, `popText(...)` — всё уже есть в `game.js` и `fx.js`.
- Produces:
  - `heal(n)` в `game.js` → число реально вылеченных кусков, масса не выше `massMax()`; открыт в DBG. Задача 2 добавит в него таймер заживления.
  - `MASS_BASE = 4`; `CONTINUE_MIN_MASS` удалён.
  - События `updateHazards`: `{ type: 'eaten', what: 'fly' | 'oil', x, y }` в берсерке и `{ type: 'hit', reason: 'blades', x, y }`; события `kill` больше нет.
  - `towerParams(N)` без поля `dmg`.

- [ ] **Шаг 1. Тесты**

Внести правки тестов. Код игры в этом шаге не трогать.

- Правка `tools/test_game.js`:

````diff
diff --git a/tools/test_game.js b/tools/test_game.js
--- a/tools/test_game.js
+++ b/tools/test_game.js
@@ -1,4 +1,4 @@
-// node tools/test_game.js — забег v2.1: старт, прыжок и заряды, посадка и серия, урон и смерть, продолжить, чекпоинт, финиш и рейтинг, еда, берсерк, мухи, god-режим
+// node tools/test_game.js — забег: старт, прыжок и заряды, посадка и серия, урон и смерть, лечение, продолжить, чекпоинт, финиш и рейтинг, еда, берсерк, мухи, god-режим
 const assert = require('assert');
 const noop = () => {};
 const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
@@ -8,9 +8,9 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   const steps = (n, dt = 0.016) => { for (let i = 0; i < n; i++) d.update(dt); };
   const untilOn = (id, n = 120) => { for (let i = 0; i < n; i++) { d.update(0.016); if (ball.onPlatform === id) return true; } return false; };
   const dropOn = (p) => { ball.onPlatform = null; ball.x = p.x; ball.y = p.y - ball.r - 30; ball.vx = 0; ball.vy = 200; d.setCamY(p.y - 500); };
-  // старт башни 1: Тефа на стартовой тарелке, масса 3 из 4, 3 заряда
+  // старт башни 1: Тефа на стартовой тарелке с полной массой 4 из 4, 3 заряда
   d.startTower(1); d.state = 'play';
-  assert.strictEqual(d.tower.tp.N, 1); assert.strictEqual(ball.mass, 3); assert.strictEqual(d.massMax(), 4); assert.strictEqual(ball.charges, 3);
+  assert.strictEqual(d.tower.tp.N, 1); assert.strictEqual(ball.mass, 4, 'башня начинается с полной массой'); assert.strictEqual(d.massMax(), 4); assert.strictEqual(ball.charges, 3);
   assert.strictEqual(ball.onPlatform, 0); assert.strictEqual(ball.y, -ball.r); assert.ok(d.run.foodTotal > 0); assert.strictEqual(d.run.deaths, 0);
   // прыжок тратит заряд; в воздухе ещё два; без зарядов — нет
   assert.ok(d.jumpTo(300, -200)); assert.strictEqual(ball.charges, 2); assert.strictEqual(ball.onPlatform, null); assert.ok(ball.vy < 0);
@@ -22,17 +22,17 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id)); assert.strictEqual(d.streak.n, 1, 'та же платформа серию не растит'); d.setGod(false);
   // урон: −1 масса, неуязвимость, серия обнулена, отброс; повтор в неуязвимости не проходит; ноль массы — смерть с банком монет
   d.setRunCoins(7); const earned0 = d.save.earned; d.YG.gameplayStart();
-  assert.ok(d.damage(1, 'oil', ball.x + 10, ball.y)); assert.strictEqual(ball.mass, 2); assert.ok(d.run.invuln > 0.9); assert.strictEqual(d.streak.n, 0); assert.strictEqual(ball.onPlatform, null);
+  assert.ok(d.damage(1, 'oil', ball.x + 10, ball.y)); assert.strictEqual(ball.mass, 3); assert.ok(d.run.invuln > 0.9); assert.strictEqual(d.streak.n, 0); assert.strictEqual(ball.onPlatform, null);
   assert.strictEqual(d.damage(1, 'oil', ball.x, ball.y), false, 'в неуязвимости урона нет');
   d.run.invuln = 0; d.damage(5, 'knife', ball.x, ball.y); assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.run.reason, 'knife'); assert.strictEqual(d.run.deaths, 1);
   assert.strictEqual(d.save.earned, earned0 + 7, 'монеты забега в сохранении'); assert.strictEqual(d.YG.log.at(-1), 'stop');
-  // продолжить: на последней платформе, масса ≥ 2, неуязвимость 1.5 с, usedContinue; падение за экран; с чекпоинта
-  d.continueRun(); assert.strictEqual(d.state, 'play'); assert.ok(ball.alive); assert.strictEqual(ball.onPlatform, p1.id); assert.strictEqual(ball.mass, 2); assert.ok(d.run.invuln >= 1.5); assert.strictEqual(d.run.usedContinue, 1);
+  // продолжить: на последней платформе, полная масса, неуязвимость 1.5 с, usedContinue; падение за экран; с чекпоинта
+  d.continueRun(); assert.strictEqual(d.state, 'play'); assert.ok(ball.alive); assert.strictEqual(ball.onPlatform, p1.id); assert.strictEqual(ball.mass, 4, 'продолжение с полной массой'); assert.ok(d.run.invuln >= 1.5); assert.strictEqual(d.run.usedContinue, 1);
   ball.onPlatform = null; ball.y = d.camY + 854 + 200; d.update(0.016); assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.run.reason, 'fall'); assert.strictEqual(d.run.deaths, 2);
-  d.run.cp = 1; d.restartFromCp(); assert.strictEqual(d.state, 'play'); assert.strictEqual(ball.onPlatform, d.platforms.find(p => p.cp === 1).id); assert.strictEqual(ball.mass, 3); assert.strictEqual(d.run.deaths, 2, 'смерти остаются');
-  // чекпоинт: посадка на платформу с cp пишет run.cp и save.cp
-  d.startTower(1); d.state = 'play'; const cp1 = d.platforms.find(p => p.cp === 1); dropOn(cp1); steps(20);
-  assert.strictEqual(ball.onPlatform, cp1.id); assert.strictEqual(d.run.cp, 1); assert.strictEqual(JSON.parse(g.store.get('teft_save')).cp, 1, 'чекпоинт сохранён');
+  d.run.cp = 1; d.restartFromCp(); assert.strictEqual(d.state, 'play'); assert.strictEqual(ball.onPlatform, d.platforms.find(p => p.cp === 1).id); assert.strictEqual(ball.mass, 4, 'с чекпоинта — полная масса'); assert.strictEqual(d.run.deaths, 2, 'смерти остаются');
+  // чекпоинт: посадка на платформу с cp пишет run.cp и save.cp и лечит до полной
+  d.startTower(1); d.state = 'play'; const cp1 = d.platforms.find(p => p.cp === 1); ball.mass = 2; dropOn(cp1); steps(20);
+  assert.strictEqual(ball.onPlatform, cp1.id); assert.strictEqual(d.run.cp, 1); assert.strictEqual(ball.mass, 4, 'чекпоинт лечит до полной'); assert.strictEqual(JSON.parse(g.store.get('teft_save')).cp, 1, 'чекпоинт сохранён');
   // финиш: крыша → finish, рейтинг S, награда, летопись, следующая башня
   d.startTower(1); d.state = 'play'; d.YG.gameplayStart(); const roof = d.platforms.find(p => p.roof);
   d.run.foodEaten = d.run.foodTotal; d.setRunCoins(10); dropOn(roof); steps(20);
@@ -49,10 +49,9 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   const tp = d.towerParams(1), R = r => d.ratingFor(Object.assign({ deaths: 0, time: 10, foodEaten: 10, foodTotal: 10, usedContinue: 0 }, r), tp).letter;
   assert.strictEqual(R({}), 'S'); assert.strictEqual(R({ deaths: 1 }), 'A'); assert.strictEqual(R({ deaths: 1, time: 999 }), 'B'); assert.strictEqual(R({ deaths: 1, time: 999, foodEaten: 1 }), 'C'); assert.strictEqual(R({ usedContinue: 1 }), 'D');
   assert.strictEqual(R({ foodEaten: 8 }), 'S', '80% еды хватает'); assert.strictEqual(R({ foodEaten: 7 }), 'A'); assert.strictEqual(d.bonusCoins(3, 'A'), 90);
-  // еда: +1 масса до максимума, монеты с множителем башни и специй, серия +1
+  // еда: монеты с множителем башни и специй, серия +1; массу еда не возвращает (спека v2.1.1 §5)
   d.startTower(1); d.state = 'play'; const it = d.items[0]; ball.mass = 2; it.x = ball.x; it.y = ball.y; d.update(0.016);
-  assert.ok(it.dead); assert.strictEqual(ball.mass, 3); assert.strictEqual(d.run.foodEaten, 1); assert.strictEqual(d.run.runCoins, d.coinsFor(it.kind)); assert.strictEqual(d.streak.n, 1);
-  ball.mass = 4; const it2 = d.items[1]; it2.x = ball.x; it2.y = ball.y; d.update(0.016); assert.strictEqual(ball.mass, 4, 'выше максимума не растёт');
+  assert.ok(it.dead); assert.strictEqual(ball.mass, 2, 'еда не лечит'); assert.strictEqual(d.run.foodEaten, 1); assert.strictEqual(d.run.runCoins, d.coinsFor(it.kind)); assert.strictEqual(d.streak.n, 1);
   d.save.up.spice = 4; assert.strictEqual(d.coinsFor('meat'), Math.round(3 * 1.2)); d.save.up.spice = 0;
   // берсерк: серия до порога → неуязвимость, монеты ×2, муха съедается
   d.startTower(1); d.state = 'play'; for (let i = 0; i < 12; i++) d.streakAdd(1); assert.ok(d.isBerserk());
@@ -78,13 +77,13 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   for (let i = 0; i < 12; i++) d.streakAdd(1); assert.ok(d.isBerserk());
   { const m0 = ball.mass; steps(190); // 3.04 с — дольше таймера сковородки башни 3 (1.85 с) и короче берсерка (6 с)
     assert.strictEqual(ball.mass, m0, 'в берсерке масса на сковородке не меняется'); assert.strictEqual(ball.onPlatform, pan2.id, 'и подброса нет'); }
-  // лопасти в неуязвимости не убивают: после удара и «Продолжить» есть 1–1.5 с
+  // лопасти снимают один кусок, как любая опасность; в неуязвимости — ничего (спека v2.1.1 §7.1)
   d.startTower(3); d.state = 'play'; for (const it of d.items) it.dead = true;
   const bl = d.hazards.find(h => h.type === 'blades'); assert.ok(bl, 'в башне 3 есть лопасти');
   d.hazards.length = 0; d.hazards.push(bl); // остальные опасности убрать: проверяем только лопасти
   const inBlades = () => { ball.x = bl.x; ball.y = bl.y; ball.onPlatform = null; ball.vy = 0; d.setCamY(bl.y - 400); };
-  d.run.invuln = 1.5; inBlades(); d.update(0.016); assert.strictEqual(d.state, 'play', 'в неуязвимости лопасти не убивают');
-  d.run.invuln = 0; inBlades(); d.update(0.016); assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.run.reason, 'blades');
+  d.run.invuln = 1.5; inBlades(); d.update(0.016); assert.strictEqual(ball.mass, 4, 'в неуязвимости лопасти не ранят');
+  d.run.invuln = 0; inBlades(); d.update(0.016); assert.strictEqual(d.state, 'play', 'лопасти не убивают сразу'); assert.strictEqual(ball.mass, 3, 'снят один кусок');
   // «Продолжить»: серия и берсерк смерть не переживают
   d.startTower(1); d.state = 'play'; d.streakAdd(5); assert.strictEqual(d.streak.n, 5);
   d.die('fall'); d.continueRun(); assert.strictEqual(d.streak.n, 0, 'серия обнулена');
````

- Правка `tools/test_hazards.js`:

````diff
diff --git a/tools/test_hazards.js b/tools/test_hazards.js
--- a/tools/test_hazards.js
+++ b/tools/test_hazards.js
@@ -1,4 +1,4 @@
-// node tools/test_hazards.js — муха (предупреждение, погоня, укус, отставание, съедание), масло, нож, лопасти, политика влёта
+// node tools/test_hazards.js — муха (предупреждение, погоня, укус, отставание, съедание), масло, нож, лопасти (кусок, не смерть), политика влёта
 const assert = require('assert');
 const noop = () => {};
 const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
@@ -19,8 +19,8 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   assert.strictEqual(d.flyChase(), 6); d.save.up.repel = 20; assert.strictEqual(d.flyChase(), d.FLY_CHASE_MIN, 'репеллент не ниже минимума'); d.save.up.repel = 0;
   // в берсерке муху съедают
   d.resetFlies(); ball.x = 240; ball.y = -500; d.spawnFly(false); env.berserk = true; ev = [];
-  for (let i = 0; i < 400 && !ev.some(e => e.type === 'flyEaten'); i++) ev.push(...run([], 1));
-  assert.ok(ev.some(e => e.type === 'flyEaten'), 'съедена'); env.berserk = false;
+  for (let i = 0; i < 400 && !ev.some(e => e.type === 'eaten'); i++) ev.push(...run([], 1));
+  assert.ok(ev.some(e => e.type === 'eaten' && e.what === 'fly'), 'съедена'); env.berserk = false;
   // политика влёта: лень 3 с — всегда; берсерк — никогда; лимит 3; серия < 6 — никогда; серия ≥ 6 — по вероятности
   d.resetFlies(); assert.strictEqual(d.flyWanted(0.016, 0, 3.1, false), true); assert.strictEqual(d.flyWanted(0.016, 20, 3.1, true), false);
   assert.strictEqual(d.flyWanted(0.016, 0, 0, false), false); assert.strictEqual(d.flyWanted(0.016, 5, 0, false), false);
@@ -31,15 +31,17 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   ball.x = 240; ball.y = -560; run([oil], Math.ceil(d.OIL_T / 0.016) + 1); assert.ok(oil.drops.length >= 1, 'капля появилась');
   ev = run([oil], 60); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'oil'), 'капля попала');
   ball.x = 100; oil.drops = []; oil.t = d.OIL_T; ev = run([oil], 200); assert.ok(!ev.some(e => e.type === 'hit')); assert.ok(oil.drops.every(dr => dr.y <= -500), 'капли не ниже пола');
+  env.berserk = true; ball.x = 240; ball.y = -560; oil.drops = [{ y: -560, splat: 0, dead: false }]; ev = run([oil], 1);
+  assert.ok(ev.some(e => e.type === 'eaten' && e.what === 'oil'), 'в берсерке капля съедена'); env.berserk = false;
   // нож: фазы по кругу; бьёт только в ударе и только под собой
   assert.strictEqual(d.knifePhase(0).phase, 'rest'); assert.strictEqual(d.knifePhase(1.3).phase, 'wind'); assert.strictEqual(d.knifePhase(1.95).phase, 'strike');
   const knife = { id: 2, type: 'knife', x: 240, y: -500, t: 0, phase: 'rest', by: -650 };
   ball.x = 240; ball.y = -560; ev = run([knife], 70); assert.ok(!ev.some(e => e.type === 'hit'), 'в паузе не бьёт');
   ev = run([knife], 70); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'knife'), 'удар'); assert.ok(d.knifeY(knife) <= -500 - 20 + 1);
   ball.x = 120; knife.t = 0; ev = run([knife], 140); assert.ok(!ev.some(e => e.type === 'hit'), 'мимо по x');
-  // лопасти: смерть; в берсерке — разлетаются
+  // лопасти: снимают кусок, как любая опасность (спека v2.1.1 §7.1); в берсерке — разлетаются
   const bl = { id: 3, type: 'blades', x: 240, y: -560, ang: 0, gone: false };
-  ball.x = 240; ball.y = -560; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'kill' && e.reason === 'blades'));
+  ball.x = 240; ball.y = -560; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'blades'), 'лопасти ранят'); assert.ok(!ev.some(e => e.type === 'kill'), 'и не убивают сразу');
   env.berserk = true; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'smash') && bl.gone, 'в берсерке снесены'); env.berserk = false;
   ball.x = 240; ball.y = -700; const bl2 = { id: 4, type: 'blades', x: 240, y: -560, ang: 0, gone: false }; ev = run([bl2], 5); assert.ok(!ev.length, 'вне радиуса не задевают'); assert.ok(bl2.ang > 0, 'крутятся');
   console.log('test_hazards ok');
````

- Правка `tools/test_tower.js`:

````diff
diff --git a/tools/test_tower.js b/tools/test_tower.js
--- a/tools/test_tower.js
+++ b/tools/test_tower.js
@@ -9,7 +9,7 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   assert.notStrictEqual(JSON.stringify(t1.platforms), JSON.stringify(t2.platforms), 'другая башня — другая раскладка');
   // параметры роста
   const p1 = d.towerParams(1), p9 = d.towerParams(9), p50 = d.towerParams(50);
-  assert.strictEqual(p1.rows, 45); assert.strictEqual(p1.dmg, 1); assert.strictEqual(p9.dmg, 2); assert.strictEqual(p50.rows, 160);
+  assert.strictEqual(p1.rows, 45); assert.strictEqual(p50.rows, 160); assert.strictEqual(p9.dmg, undefined, 'урон не растёт с номером башни');
   assert.ok(p9.pHaz > p1.pHaz && p9.heat > p1.heat && p9.flySpeed > p1.flySpeed); assert.strictEqual(p1.par, 45 * 2.4);
   assert.strictEqual(p1.height, 45 * d.ROW_H);
   // структура: старт, крыша, чекпоинты, ряды через ROW_H
````

- [ ] **Шаг 2. Убедиться, что тесты падают**

Run: `npm test`

Expected: FAIL. `test_tower` падает первым после `test_jump ok`: `AssertionError [ERR_ASSERTION]: урон не растёт с номером башни` (`2 !== undefined`).

- [ ] **Шаг 3. Реализация**

- Правка `src/game.js`:

````diff
diff --git a/src/game.js b/src/game.js
--- a/src/game.js
+++ b/src/game.js
@@ -1,9 +1,8 @@
 'use strict';
 // ---------- забег по башне: прыжок в точку, урон, смерть, чекпоинты, финиш и рейтинг ----------
-const MASS_BASE = 4;            // максимум массы без прокачки; старт башни с максимума − 1
+const MASS_BASE = 4;            // максимум массы без прокачки; башня начинается с полной массой (спека v2.1.1 §5)
 const INVULN_HIT = 1;           // с неуязвимости после удара
 const INVULN_CONT = 1.5;        // с неуязвимости после «Продолжить»
-const CONTINUE_MIN_MASS = 2;
 const DOUBLE_MIN_COINS = 10;    // «Монеты ×2» предлагаем от этой суммы
 const BONUS_MULT = { S: 2, A: 1.5, B: 1.2, C: 1, D: 0.8 };
 const FOOD_SHARE = 0.8;         // доля еды башни для галочки рейтинга
@@ -14,6 +13,12 @@ let run = null;                 // состояние забега, см. newRun
 let god = false;                // тесты (smoke): без урона и смерти от падения
 function massMax() { return MASS_BASE + ((save.up && save.up.meat) || 0); }
 function chargesMax() { return 3 + ((save.up && save.up.charge) || 0); }
+// лечение (спека v2.1.1 §5): чекпоинт, «Продолжить» и съеденная в берсерке муха или капля масла; еда не лечит
+function heal(n) {
+  const m0 = ball.mass; ball.mass = Math.min(massMax(), ball.mass + n);
+  if (ball.mass > m0) burst(ball.x, ball.y - ball.r * 0.5, '#ffe08a', 10, 160, 0.5, 3);
+  return ball.mass - m0;
+}
 function newRun() { return { time: 0, runCoins: 0, bankedCoins: 0, deaths: 0, usedContinue: 0, usedDouble: false, foodEaten: 0, foodTotal: 0, cp: 0, lastLandId: 0, campT: 0, flyCd: 0, invuln: 0, reason: '', rating: null, bonus: 0, progress: 0, finished: false }; }
 function cpPlatform(k) { return tower.platforms.find(p => k ? p.cp === k : p.start) || tower.platforms[0]; }
 function placeAt(p) {
@@ -26,7 +31,7 @@ function startTower(N, fromCp = 0) {
   tower = buildTower(N); run = newRun(); run.foodTotal = tower.items.length;
   if (fromCp && !tower.platforms.some(p => p.cp === fromCp)) fromCp = 0; // битый чекпоинт из сохранения
   resetStreak(); resetFlies(); resetFx();
-  ball.mass = massMax() - 1; ball.r = radiusFor(ball.mass);
+  ball.mass = massMax(); ball.r = radiusFor(ball.mass);
   run.cp = fromCp; if (fromCp) run.deaths = 1;
   placeAt(cpPlatform(fromCp));
   camY = ball.y - H * 0.6; tGame = 0; camShake = 0;
@@ -48,7 +53,6 @@ function applyStreak(evn) {
 function eat(it) {
   it.dead = true; run.foodEaten++;
   const gain = coinsFor(it.kind); run.runCoins += gain;
-  if (ball.mass < massMax()) ball.mass++;
   ball.mouth = 1; pulse(140);
   burst(it.x, it.y, FOOD_COLOR[it.kind], 12, 260, 0.5, 5); popText(it.x, it.y - 20, '+' + gain, '#ffe08a', isBerserk());
   sfx.eat(); applyStreak(streakAdd(1));
@@ -69,15 +73,15 @@ function die(reason) {
   sfx.die(); camShake = 16; burst(ball.x, ball.y, '#b9542f', 40, 380, 0.9, 6);
   bank(); persist(); YG.gameplayStop();
 }
-// «Продолжить» за rewarded: на последней платформе, масса не меньше CONTINUE_MIN_MASS; рейтинг башни станет D
+// «Продолжить» за rewarded: на последней платформе с полной массой (еда больше не лечит); рейтинг башни станет D
 function continueRun() {
-  ball.mass = Math.max(ball.mass, CONTINUE_MIN_MASS); ball.r = radiusFor(ball.mass); // масса и радиус до посадки: placeAt сажает Тефу по ball.r
+  ball.mass = massMax(); ball.r = radiusFor(ball.mass); // масса и радиус до посадки: placeAt сажает Тефу по ball.r
   placeAt(platformById(tower.platforms, run.lastLandId) || cpPlatform(run.cp));
   resetStreak(); resetFlies(); run.invuln = INVULN_CONT; run.usedContinue++; camShake = 0; tGame = 0; state = 'play'; // серия и берсерк смерть не переживают
 }
 // «С чекпоинта» бесплатно: смерти уже посчитаны в die(); капли масла и мухи сброшены
 function restartFromCp() {
-  ball.mass = massMax() - 1; ball.r = radiusFor(ball.mass); placeAt(cpPlatform(run.cp));
+  ball.mass = massMax(); ball.r = radiusFor(ball.mass); placeAt(cpPlatform(run.cp));
   resetStreak(); resetFlies(); resetFx(); for (const h of tower.hazards) if (h.type === 'oil') h.drops = [];
   camY = ball.y - H * 0.6; tGame = 0; state = 'play';
 }
@@ -100,7 +104,7 @@ function finishTower() {
   ball.onPlatform = tower.platforms.find(p => p.roof).id;
   state = 'finish'; tGame = 0; sfx.big(); camShake = 8; YG.gameplayStop();
 }
-function reachCheckpoint(p) { run.cp = p.cp; save.cp = p.cp; persist(); popText(p.x, p.y - 40, T('checkpoint', p.cp), '#8ff0a4', true); sfx.buy(); }
+function reachCheckpoint(p) { run.cp = p.cp; save.cp = p.cp; heal(massMax()); persist(); popText(p.x, p.y - 40, T('checkpoint', p.cp), '#8ff0a4', true); sfx.buy(); }
 function onLand(p, vy) {
   ball.charges = chargesMax();
   if (vy > 80) { squash(Math.min(vy, 900) * 0.5); crumbs(ball.x, ball.y + ball.r); }
@@ -115,7 +119,7 @@ function updateRun(dt) {
   if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.6; } else if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.6; }
   for (const e of updatePlatforms(dt, tower.platforms, tp)) if (e.type === 'burn') {
     if (isBerserk()) continue; // спека §4.4: в берсерке Тефа не горит — ни урона, ни подброса; таймер сковородки уже сброшен в platforms.js
-    damage(tp.dmg, 'pan', e.p.x, e.p.y + 40);
+    damage(1, 'pan', e.p.x, e.p.y + 40);
     if (!ball.alive) return;
     ball.onPlatform = null; ball.vy = -700; ball.vx = 0; // спека §3.2: автопрыжок строго вверх — боковой отброс урона сдувал с узкой сковородки в пропасть
   }
@@ -129,10 +133,9 @@ function updateRun(dt) {
   run.flyCd = Math.max(0, run.flyCd - dt);
   if (run.flyCd <= 0 && flyWanted(dt, streak.n, run.campT, isBerserk())) { spawnFly(); run.flyCd = FLY_CD; run.campT = 0; }
   for (const e of updateHazards(dt, tower.hazards, { tp, berserk: isBerserk(), invuln: run.invuln })) {
-    if (e.type === 'hit') damage(tp.dmg, e.reason, e.x, e.y);
-    else if (e.type === 'kill') { if (!god && run.invuln <= 0) { burst(ball.x, ball.y, '#b9542f', 30, 400, 0.8, 6); die(e.reason); } } // после удара и «Продолжить» лопасти не убивают 1–1.5 с
+    if (e.type === 'hit') damage(1, e.reason, e.x, e.y); // каждая опасность снимает один кусок; сразу убивает только падение
     else if (e.type === 'flyGaveUp') { applyStreak(streakAdd(3)); popText(e.h.x, e.h.y, T('flyGone'), 'rgba(255,255,255,0.7)'); }
-    else if (e.type === 'flyEaten') { const gain = coinsFor('meat'); run.runCoins += gain; if (ball.mass < massMax()) ball.mass++; burst(e.h.x, e.h.y, '#2b2b2b', 10, 200, 0.4, 3); popText(e.h.x, e.h.y, '+' + gain, '#ffe08a', true); sfx.eat(); }
+    else if (e.type === 'eaten') { const gain = coinsFor('meat'); run.runCoins += gain; heal(1); burst(e.x, e.y, e.what === 'fly' ? '#2b2b2b' : '#ff9a2a', 10, 200, 0.4, 3); popText(e.x, e.y, '+' + gain, '#ffe08a', true); sfx.eat(); }
     else if (e.type === 'smash') { run.runCoins += 2; burst(e.x, e.y, '#ddd', 14, 300, 0.5, 4); sfx.hit(); }
     if (!ball.alive) return;
   }
@@ -160,6 +163,6 @@ function update(dt) {
 expose({
   get state() { return state; }, set state(v) { state = v; }, get tower() { return tower; }, get run() { return run; }, get camY() { return camY; },
   get platforms() { return tower ? tower.platforms : []; }, get hazards() { return tower ? tower.hazards : []; }, get items() { return tower ? tower.items : []; },
-  setRunCoins(n) { run.runCoins = n; }, setGod(v) { god = !!v; }, setCamY(v) { camY = v; }, massMax, chargesMax, coinsFor,
+  setRunCoins(n) { run.runCoins = n; }, setGod(v) { god = !!v; }, setCamY(v) { camY = v; }, massMax, chargesMax, coinsFor, heal,
   startTower, jumpTo, damage, die, continueRun, restartFromCp, restartTower, nextTower, finishTower, doubleCoins, ratingFor, bonusCoins, update,
 });
````

- Правка `src/hazards.js`:

````diff
diff --git a/src/hazards.js b/src/hazards.js
--- a/src/hazards.js
+++ b/src/hazards.js
@@ -1,5 +1,5 @@
 'use strict';
-// ---------- опасности: муха (наводится), масло (капает), нож (гильотина в разрыве), лопасти (смерть) ----------
+// ---------- опасности: муха (наводится), масло (капает), нож (гильотина в разрыве), лопасти; каждая снимает один кусок ----------
 const FLY_CHASE = 6, FLY_CHASE_MIN = 1.5, FLY_WARN = 0.7, FLY_MAX = 3, FLY_CD = 2, CAMP_T = 3;
 const OIL_DROP_V = 420, OIL_R = 8;
 const KNIFE_REST = 1.2, KNIFE_WIND = 0.6, KNIFE_STRIKE = 0.3; // сумма = KNIFE_CYCLE
@@ -28,7 +28,8 @@ function knifeY(h) { // верх лезвия: пауза наверху (by), 
   const { phase, k } = knifePhase(h.t), top = h.by, bottom = h.y - 80;
   return phase === 'rest' ? top : phase === 'wind' ? top - 14 * Math.sin(k * Math.PI) : top + (bottom - top) * Math.sin(k * Math.PI);
 }
-// env: { tp, berserk, invuln }. События: hit {reason,x,y} | kill {reason} | flyGaveUp {h} | flyEaten {h} | smash {h,x,y}
+// env: { tp, berserk, invuln }. События: hit {reason,x,y} | flyGaveUp {h} | eaten {what,x,y} | smash {h,x,y}.
+// В берсерке муха и капля масла съедаются (eaten — game.js лечит на кусок), нож и лопасти ломаются (smash).
 function updateHazards(dt, hazards, env) {
   const ev = [], tp = env.tp, R = ball.r;
   for (const f of flies) {
@@ -37,7 +38,7 @@ function updateHazards(dt, hazards, env) {
     f.chaseT += dt; f.phase += dt * 7;
     const dx = ball.x - f.x, dy = ball.y - f.y, dist = Math.hypot(dx, dy) || 1, sp = tp.flySpeed;
     f.x += (dx / dist) * sp * dt + Math.cos(f.phase) * 60 * dt; f.y += (dy / dist) * sp * dt + Math.sin(f.phase * 1.3) * 60 * dt;
-    if (dist < R + 12) { f.gone = true; ev.push(env.berserk ? { type: 'flyEaten', h: f } : { type: 'hit', reason: 'fly', x: f.x, y: f.y }); continue; }
+    if (dist < R + 12) { f.gone = true; ev.push(env.berserk ? { type: 'eaten', what: 'fly', x: f.x, y: f.y } : { type: 'hit', reason: 'fly', x: f.x, y: f.y }); continue; }
     if (f.chaseT >= flyChase()) { f.gone = true; ev.push({ type: 'flyGaveUp', h: f }); }
   }
   flies = flies.filter(f => !f.gone);
@@ -50,7 +51,7 @@ function updateHazards(dt, hazards, env) {
         if (dr.splat > 0) { dr.splat -= dt; if (dr.splat <= 0) dr.dead = true; continue; }
         dr.y += OIL_DROP_V * dt;
         if (dr.y >= h.floorY) { dr.y = h.floorY; dr.splat = 0.5; continue; }
-        if (Math.hypot(ball.x - h.x, ball.y - dr.y) < R + OIL_R) { dr.dead = true; ev.push(env.berserk ? { type: 'smash', h, x: h.x, y: dr.y } : { type: 'hit', reason: 'oil', x: h.x, y: dr.y }); }
+        if (Math.hypot(ball.x - h.x, ball.y - dr.y) < R + OIL_R) { dr.dead = true; ev.push(env.berserk ? { type: 'eaten', what: 'oil', x: h.x, y: dr.y } : { type: 'hit', reason: 'oil', x: h.x, y: dr.y }); }
       }
       h.drops = h.drops.filter(dr => !dr.dead);
     } else if (h.type === 'knife') {
@@ -62,7 +63,7 @@ function updateHazards(dt, hazards, env) {
     } else if (h.type === 'blades') {
       h.ang += dt * 6 * tp.speedMul;
       if (Math.hypot(ball.x - h.x, ball.y - h.y) < R + BLADES_R) {
-        if (env.berserk) { h.gone = true; ev.push({ type: 'smash', h, x: h.x, y: h.y }); } else ev.push({ type: 'kill', reason: 'blades' });
+        if (env.berserk) { h.gone = true; ev.push({ type: 'smash', h, x: h.x, y: h.y }); } else ev.push({ type: 'hit', reason: 'blades', x: h.x, y: h.y });
       }
     }
   }
````

- Правка `src/tower.js`:

````diff
diff --git a/src/tower.js b/src/tower.js
--- a/src/tower.js
+++ b/src/tower.js
@@ -12,7 +12,7 @@ const FOOD_COLOR = { ketchup: '#e3342f', pasta: '#f6c343', meat: '#b5452b' };
 function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
 function towerParams(N) {
   const rows = Math.min(40 + 5 * N, 160);
-  return { N, rows, height: rows * ROW_H, dmg: 1 + Math.floor((N - 1) / 8), heat: Math.min(0.05 * N, 1.5), speedMul: 1 + 0.03 * N, flySpeed: 220 + 5 * N,
+  return { N, rows, height: rows * ROW_H, heat: Math.min(0.05 * N, 1.5), speedMul: 1 + 0.03 * N, flySpeed: 220 + 5 * N,
     pHaz: Math.min(0.15 + 0.02 * N, 0.6), pPan: Math.min(0.1 + 0.02 * N, 0.5), pTray: N >= 2 ? 0.15 : 0, foodPerRow: Math.max(0.35, 0.8 - 0.01 * N),
     par: rows * 2.4, coinMul: 1 + 0.05 * (N - 1), theme: 'kitchen' };
 }
````

- [ ] **Шаг 4. Убедиться, что всё зелёное**

Run: `npm test`

Expected: одиннадцать строк `… ok` (`test_core` … `test_render`, `smoke`), из шума только два блока `YaGames.init failed, using stub …` от `test_sdk`.

- [ ] **Шаг 5. Коммит**

````bash
git add src/game.js src/hazards.js src/tower.js tools/test_game.js tools/test_hazards.js tools/test_tower.js
git commit -m "feat: любая опасность снимает один кусок, лечение только в берсерке и на чекпоинте" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
````

---

## Task 2. Жизни на самой Тефе (спека §3.1, §3.2)

Тефа сама показывает жизни четырьмя состояниями стиля A листа 5: полная, один укус, два укуса с каплей пота, последний кусок с испугом и красным миганием. Светлого ободка больше нет. При лечении укус зарастает за 0.3 с. Тела уровней и сырой фарш кэшируются: кадр заживления без кэша стоил в Chrome около 10 мс, из кэша около 0.3 мс.

**Files:**
- Modify: `src/ball.js`
- Modify: `src/game.js`
- Modify: `src/render.js`
- Modify: `src/tefa.js`
- Modify: `tools/shot_tefa.js`
- Test: `tools/test_render.js`

**Interfaces:**
- Consumes: `heal(n)` из задачи 1.
- Produces:
  - `drawTefa(c, x, y, r, pose)`: новые поля позы `hp: { cur, max }`, `tint` 0..1 (красное мигание последнего куска), `charged` (шкала полна), `heal` 0..1 (доля заросшего укуса).
  - `tefaHpLevel(cur, max)` → 0 полная, 1 минус кусок, 2 два укуса, 3 последний кусок.
  - `HEAL_T = 0.3` и поле `ball.healT` в `ball.js`; `heal()` ставит `ball.healT = HEAL_T`.
  - В DBG: `tefaCacheSize`.

- [ ] **Шаг 1. Тесты**

Внести правки тестов. Код игры в этом шаге не трогать.

- Правка `tools/test_render.js`:

````diff
diff --git a/tools/test_render.js b/tools/test_render.js
--- a/tools/test_render.js
+++ b/tools/test_render.js
@@ -7,6 +7,8 @@ const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(St
   for (const size of [[480, 854], [1280, 720]]) {
     const g = require('./_env')(ctx, { width: size[0], height: size[1] }); const d = g.dbg(); await d.YG.init(); await d.loadSave();
     d.drawTefa(ctx, 100, 100, 40, { sx: 1.1, sy: 0.9, tilt: 0.2, face: 0.5, mouth: 0.5, blink: true, hot: 0.5, berserk: true, alpha: 0.5 });
+    for (const cur of [4, 3, 2, 1]) for (const extra of [{}, { heal: 0.5 }, { tint: 1 }, { charged: true }, { berserk: true }, { blink: true, mouth: 0.8, face: -1, hot: 0.7 }])
+      d.drawTefa(ctx, 100, 100, 40, Object.assign({ hp: { cur, max: 4 } }, extra)); // все состояния жизней с эффектами
     d.startTower(3); d.state = 'title'; d.drawBg(); d.drawWorld(); d.titleScreen(); d.loadingScreen();
     d.state = 'play'; d.spawnFly(true); d.popText(240, 0, '+5', '#fff', true); for (let i = 0; i < 30; i++) d.update(0.016);
     for (const h of d.hazards) { h.y = d.ball.y; if (h.type === 'oil') h.drops.push({ y: h.y + 30, splat: 0, dead: false }, { y: h.floorY, splat: 0.3, dead: false }); if (h.type === 'knife') h.phase = 'wind'; }
@@ -15,6 +17,11 @@ const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(St
     d.YG.adStub = { kind: 'rewarded', until: 0 }; d.adStubScreen(); d.YG.adStub = null; d.adStubScreen();
   }
   const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave(); d.startTower(1);
+  // уровни жизней по таблице спеки v2.1.1 §3.2: последний кусок — паника при любом максимуме
+  const lv = (c, m) => d.tefaHpLevel(c, m);
+  assert.deepStrictEqual([lv(4, 4), lv(3, 4), lv(2, 4), lv(1, 4)], [0, 1, 2, 3]);
+  assert.deepStrictEqual([lv(6, 6), lv(5, 6), lv(4, 6), lv(3, 6), lv(2, 6), lv(1, 6)], [0, 1, 1, 2, 2, 3]);
+  // Тефа рисуется без светлого ободка: ни одного stroke-эллипса вокруг неё в drawWorld нет (проверяется глазами на снимках)
   // титул: башня, тема, кнопка «Играть»; с чекпоинтом — строка чекпоинта
   texts.length = 0; d.state = 'title'; d.titleScreen(); assert.ok(texts.includes('Башня 1') && texts.includes('Кухня')); assert.deepStrictEqual(d.buttons.map(b => b.id), ['play']);
   d.save.cp = 1; texts.length = 0; d.titleScreen(); assert.ok(texts.includes('Чекпоинт 1')); d.save.cp = 0;
@@ -38,5 +45,16 @@ const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(St
   d.setLang('tr'); texts.length = 0; d.deadScreen(true); assert.ok(texts.includes('Pat!'));
   d.setLang('ru'); for (const k of ['die.fall', 'die.fly', 'die.blades', 'die.pan', 'die.oil', 'die.knife']) assert.ok(!/упал|сгорел|умер/i.test(d.T(k)), k);
   assert.strictEqual(d.fmtTime(75), '1:15');
+  // заживление в браузере берёт тело и сырой фарш из кэша: без кэша кадр — около 28 тысяч операций рисования
+  // (зерно заново, ~10 мс в Chrome), из кэша — около 1200 (контуры укуса и две готовые картинки)
+  let ops = 0; const cctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop })
+    : ['save', 'restore', 'translate', 'rotate', 'scale', 'setTransform', 'setLineDash'].includes(k) ? noop : () => { ops++; }, set: () => true });
+  document.createElement = () => ({ width: 0, height: 0, getContext: () => cctx }); // canvas-заглушка включает кэш
+  const healPose = h => ({ hp: { cur: 3, max: 4 }, heal: h }), cache0 = d.tefaCacheSize;
+  d.drawTefa(cctx, 100, 100, 40, healPose(0.3)); // первый кадр печёт тело уровня и сырой фарш
+  assert.ok(d.tefaCacheSize - cache0 <= 2, 'заживление добавляет в кэш не больше двух картинок');
+  ops = 0; d.drawTefa(cctx, 100, 100, 40, healPose(0.6));
+  assert.ok(ops < 3000, 'кадр заживления из кэша, без зерна: ' + ops + ' операций');
+  delete document.createElement;
   console.log('test_render ok');
 })().catch(e => { console.error(e); process.exit(1); });
````

- [ ] **Шаг 2. Убедиться, что тесты падают**

Run: `npm test`

Expected: FAIL. `test_render` падает первым после `test_game ok`: `TypeError: d.tefaHpLevel is not a function`.

- [ ] **Шаг 3. Реализация**

- Правка `src/ball.js`:

````diff
diff --git a/src/ball.js b/src/ball.js
--- a/src/ball.js
+++ b/src/ball.js
@@ -5,13 +5,14 @@ const JUMP_MIN_H = 100, JUMP_MAX_H = 280; // высота дуги (px) от н
 const VX_MAX = 420;                       // px/с — предел горизонтальной скорости прыжка
 const AIM_MARGIN = 24;                    // низ Тефы поднимается на столько выше точки тапа, чтобы сесть на платформу, а не пролететь сквозь
 const MASS_R0 = 26, MASS_RK = 4, MASS_RCAP = 8; // радиус 26 + 4·(масса−1); для радиуса масса не больше 8
+const HEAL_T = 0.3;             // с — сколько зарастает укус при лечении
 const ball = {
   x: W / 2, y: 0, vx: 0, vy: 0,
   mass: 3, r: 34,
   charges: 3, onPlatform: null, // id платформы, на которой стоит; null — в воздухе
   sq: 0, sqv: 0,                // сквош: > 0 сплющена, < 0 вытянута
   tilt: 0, tiltv: 0,            // наклон, рад
-  face: 0, mouth: 0, blink: 0, hot: 0,
+  face: 0, mouth: 0, blink: 0, hot: 0, healT: 0, // healT — остаток анимации заживления укуса
   alive: true,
 };
 function radiusFor(m) { return MASS_R0 + MASS_RK * (clamp(m, 1, MASS_RCAP) - 1); }
@@ -32,5 +33,6 @@ function updateBody(dt) {
   const tt = clamp(ball.vx / 900, -0.35, 0.35);
   ball.tiltv += ((tt - ball.tilt) * 160 - ball.tiltv * 8) * dt; ball.tilt += ball.tiltv * dt;
   ball.r = lerp(ball.r, radiusFor(ball.mass), 1 - Math.pow(0.01, dt));
+  ball.healT = Math.max(0, ball.healT - dt);
 }
-expose({ ball, aimJump, radiusFor, GRAV, JUMP_MIN_H, JUMP_MAX_H, VX_MAX, AIM_MARGIN });
+expose({ ball, aimJump, radiusFor, GRAV, JUMP_MIN_H, JUMP_MAX_H, VX_MAX, AIM_MARGIN, HEAL_T });
````

- Правка `src/game.js`:

````diff
diff --git a/src/game.js b/src/game.js
--- a/src/game.js
+++ b/src/game.js
@@ -16,7 +16,7 @@ function chargesMax() { return 3 + ((save.up && save.up.charge) || 0); }
 // лечение (спека v2.1.1 §5): чекпоинт, «Продолжить» и съеденная в берсерке муха или капля масла; еда не лечит
 function heal(n) {
   const m0 = ball.mass; ball.mass = Math.min(massMax(), ball.mass + n);
-  if (ball.mass > m0) burst(ball.x, ball.y - ball.r * 0.5, '#ffe08a', 10, 160, 0.5, 3);
+  if (ball.mass > m0) { ball.healT = HEAL_T; burst(ball.x, ball.y - ball.r * 0.5, '#ffe08a', 10, 160, 0.5, 3); } // укус зарастает на Тефе
   return ball.mass - m0;
 }
 function newRun() { return { time: 0, runCoins: 0, bankedCoins: 0, deaths: 0, usedContinue: 0, usedDouble: false, foodEaten: 0, foodTotal: 0, cp: 0, lastLandId: 0, campT: 0, flyCd: 0, invuln: 0, reason: '', rating: null, bonus: 0, progress: 0, finished: false }; }
````

- Правка `src/render.js`:

````diff
diff --git a/src/render.js b/src/render.js
--- a/src/render.js
+++ b/src/render.js
@@ -102,16 +102,20 @@ function chunk(x, y, rx, ry) { // кусок фарша (частицы урон
   g.addColorStop(0, '#e89a6c'); g.addColorStop(0.5, '#c0583a'); g.addColorStop(1, '#833218');
   ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill();
 }
+// Тефа сама показывает жизни (спека v2.1.1 §3.2): укусы, лицо, мигание последнего куска, заживление; ободка больше нет
 function drawTefaBall() {
-  const x = ball.x, y = ball.y - camY, bz = isBerserk(), r = ball.r * (bz ? 1.6 : 1);
+  const bz = isBerserk(), r = ball.r * (bz ? 1.6 : 1);
+  const x = ball.x, y = ball.y - camY + ball.r - r; // берсерк крупнее от нижней точки: низ Тефы остаётся на платформе
   const st = tower ? platformById(tower.platforms, ball.onPlatform) : null;
   if (st) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, st.y - camY + 6, r * 0.9, 8, 0, 0, 7); ctx.fill(); } // тень на платформе
   const pose = { sx: 1 + ball.sq, sy: 1 - ball.sq, tilt: ball.tilt, face: ball.face, mouth: ball.mouth, blink: ball.blink > 0, hot: ball.hot, berserk: bz,
-    alpha: run && run.invuln > 0 && Math.floor(tGame * 12) % 2 === 0 ? 0.45 : 1 };
-  ctx.save(); ctx.strokeStyle = 'rgba(255,230,200,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y - r * 0.08, r * 1.27, r * 1.1, 0, 0, 7); ctx.stroke(); ctx.restore(); // светлый ободок по силуэту (тело шире, чем выше), иначе прячется под телом: Тефа не сливается с тёмной кухней
+    alpha: run && run.invuln > 0 && Math.floor(tGame * 12) % 2 === 0 ? 0.45 : 1,
+    hp: { cur: ball.mass, max: massMax() },
+    tint: ball.mass === 1 ? 0.5 + 0.5 * Math.sin(tGame * Math.PI * 3) : 0, // последний кусок мигает ≈ 1.5 раза в секунду
+    heal: ball.healT > 0 ? 1 - ball.healT / HEAL_T : 0 };
   drawTefa(ctx, x, y, r, pose);
-  const cm = chargesMax(); // заряды над головой
-  for (let i = 0; i < cm; i++) { ctx.fillStyle = i < ball.charges ? '#f6c343' : 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(x - (cm - 1) * 7 + i * 14, y - r * 1.16 - 14, 4, 0, 7); ctx.fill(); }
+  const cm = chargesMax(), top = y - r * 1.16 - 14 - (bz ? r * 0.55 : 0); // заряды над головой; в берсерке выше пламени
+  for (let i = 0; i < cm; i++) { ctx.fillStyle = i < ball.charges ? '#f6c343' : 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(x - (cm - 1) * 7 + i * 14, top, 4, 0, 7); ctx.fill(); }
 }
 function drawHUD() {
   const mm = massMax();
````

- Заменить `src/tefa.js` целиком (правок больше половины файла):

````js
'use strict';
// ---------- Тефа: утверждённый вариант (лист 4, A «В томате») и состояния жизней (лист 5, стиль «укусы») ----------
// Порт из tools/design_tefa.js: тело с зерном, томатная глазурь и лужица, лицо (round4); укусы по уровню жизней,
// лица состояний, красное мигание последнего куска, свечение полной шкалы, огонь берсерка, заживление укуса (round5).
// Стиль «трещины» листа 5 не переносился: владелец выбрал укусы. Позы — трансформацией контекста, не по точкам.
const TEFA_TAU = Math.PI * 2;
// параметры варианта A (V4('A', 'В томате', …) из tools/design_tefa.js) вместе с его палитрой T4
const TEFA_VARIANT = {
  grain: 0.055,        // размер зерна фарша в долях радиуса
  sx: 1.04, sy: 0.96,  // тефтеля чуть шире, чем выше
  flat: 0.9,           // плоский след сковороды снизу
  seed: 27,            // сид шума: зёрна и подпалины ложатся ровно как на листе
  T: { crev: '#2a120a', shade: '#4a2010', base: '#7a3b22', warm: '#9c4a2c', lit: '#c4875a',
    hot: '#d9a070', fat: '#e8cfa8', char: '#241008', sauce: '#c0361f' },
  // SAUCE4.base: w — ширина шапки глазури, dips — [сдвиг, длина] капель, coat — плотность тонкой глазури
  sauce: { w: 0.4, dips: [[-0.3, 0.46], [0.04, 0.28], [0.32, 0.52]], coat: 0.34 },
};
// низ силуэта у инструмента на r·sy·flat = 0.864·r, поэтому рисуем радиусом r·TEFA_FIT:
// тогда низ Тефы ровно на y + r (стоит на платформе), верх на ≈ y − r·1.11, ширина ≈ 2r·1.25
const TEFA_FIT = 1 / (TEFA_VARIANT.sy * TEFA_VARIANT.flat);
// сырой фарш на срезе укуса: те же роли цветов, что у палитры тела, только розовое (RAW5)
const TEFA_RAW = { crev: '#a4473a', shade: '#b0524a', base: '#c96b5e', warm: '#dc8576', lit: '#f2ae9f', hot: '#ffd5c6', fat: '#fff1e6', char: '#74291f' };
// укусы в порядке потери: [угол от центра, радиус укуса, вынос центра за край] в долях r (BITES5). Стоят по краю мимо
// глаз, рта и плоского низа и не пересекаются: even-odd клип вернул бы пересечение обратно в тело
const TEFA_BITES = [[-0.66, 0.4, 0.06], [2.75, 0.37, 0.06], [-2.3, 0.33, 0.06]];
const TEFA_BAND = 0.15;                     // ширина среза с сырым фаршем в долях r
const TEFA_SAUCE_K = [1, 0.8, 0.62, 0.46];  // шапка глазури сжимается к макушке с каждым куском
// искры полной шкалы: [угол, удаление в долях r, размер]; макушку не занимают — там точки зарядов (SPARKS5)
const TEFA_SPARKS = [[-2.85, 1.22, 0.1], [-2.35, 1.38, 0.14], [-2.0, 1.55, 0.07], [-1.12, 1.55, 0.08], [-0.78, 1.36, 0.14], [-0.28, 1.25, 0.09], [0.25, 1.28, 0.06], [2.95, 1.3, 0.06]];

const tefaRng = s => () => (s = (s * 1664525 + 1013904223) >>> 0, s / 4294967296); // стабильный «шум»
const tefaHexa = (h, a) => `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`;
// Смесь возвращает 'rgb(...)', а не hex. Вложенный вызов tefaMix(tefaMix(...), …) парсит такую строку
// как hex, получает NaN — и canvas молча игнорирует такой fillStyle, оставляя предыдущий цвет (тёмную
// щель между зёрнами). Ровно из-за этого тело тёмно-красное и ровное, а светятся только карамельные
// макушки зёрен. Это часть выбранного облика: не чинить.
const tefaMix = (a, b, t) => {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b);
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
};
const tefaEll = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TEFA_TAU); c.fill(); };
const tefaLw = (r, k) => Math.max(1.2, r * k); // линия не тоньше 1.2 px даже в мелком размере

// неправильная клякса — одно зерно фарша (7 точек со случайным радиусом, сглажены кривыми)
function tefaBlob(c, x, y, rad, elong, rot, R) {
  const n = 7, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TEFA_TAU, rr = rad * (0.68 + R() * 0.56); pts.push([Math.cos(a) * rr * elong, Math.sin(a) * rr]); }
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) { const q = pts[i], w = pts[(i + 1) % n]; c.quadraticCurveTo(q[0], q[1], (q[0] + w[0]) / 2, (q[1] + w[1]) / 2); }
  c.closePath(); c.fill(); c.restore();
}
// силуэт: низкочастотная кривизна + мелкие бугры от самих зёрен + плоская фаска снизу
function tefaSil(c, x, y, r) {
  const v = TEFA_VARIANT, N = 150; c.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = i / N * TEFA_TAU;
    let rad = r * (1 + 0.03 * Math.sin(a * 2 + v.seed) + 0.02 * Math.sin(a * 3.3 - v.seed * 1.7) + 0.012 * Math.sin(a * 5.1 + 2));
    rad += Math.max(1.1, r * 0.02) * (Math.sin(a * 13 + v.seed * 3) * 0.6 + Math.sin(a * 19 - v.seed) * 0.4); // бугристый край
    const px = Math.cos(a) * rad * v.sx;
    const py = Math.min(Math.sin(a) * rad * v.sy, r * v.sy * v.flat); // плоский след сковороды снизу
    i ? c.lineTo(x + px, y + py) : c.moveTo(x + px, y + py);
  }
  c.closePath();
}
const tefaTopY = (y, r) => y - r * TEFA_VARIANT.sy * 0.92; // макушка — на неё садится шапка глазури

// поле зёрен: джиттерная сетка, LOD — при малом r зерно крупнее, чтобы фактура читалась и на 52 px.
// T — палитра: корочка по умолчанию, сырой фарш TEFA_RAW на срезах укусов
function tefaGrains(c, x, y, r, R, T = TEFA_VARIANT.T) {
  const v = TEFA_VARIANT, gr = r * (v.grain + 0.12 * Math.max(0, 1 - r / 70)), step = gr * 1.2;
  const darkBase = tefaMix(T.base, T.warm, 0.4);
  for (let gy = -r * v.sy - step; gy <= r * v.sy + step; gy += step)
    for (let gx = -r * v.sx - step; gx <= r * v.sx + step; gx += step) {
      const jx = gx + (R() - 0.5) * step * 0.85 + (Math.round(gy / step) % 2) * step * 0.5, jy = gy + (R() - 0.5) * step * 0.85;
      const nx = jx / (r * v.sx), ny = jy / (r * v.sy);
      if (Math.hypot(nx, ny) > 1.15) continue;
      const rad = gr * (0.6 + R() * 0.6), rot = R() * TEFA_TAU, elong = 1 + R() * 0.7;
      let L = 0.6 - 0.32 * (nx * 0.5 + ny * 0.85) - Math.hypot(nx, ny) * 0.2 + (R() - 0.5) * 0.3; // свет сверху-слева
      L = clamp(L, 0, 1);
      c.fillStyle = tefaHexa(T.crev, 0.45); tefaBlob(c, x + jx + rad * 0.26, y + jy + rad * 0.32, rad * 1.02, elong, rot, R); // щель между зёрнами
      c.fillStyle = tefaMix(tefaMix(darkBase, T.warm, R() * 0.7), T.lit, L); tefaBlob(c, x + jx, y + jy, rad, elong, rot, R); // тело зерна (см. tefaMix)
      if (L > 0.5) { c.fillStyle = tefaMix(T.lit, T.hot, (L - 0.5) * 1.8); tefaBlob(c, x + jx - rad * 0.2, y + jy - rad * 0.24, rad * 0.5, elong, rot, R); } // карамельная макушка
      if (R() < 0.045) { c.fillStyle = tefaHexa(T.fat, 0.7); tefaBlob(c, x + jx, y + jy, rad * 0.34, 1.5, rot, R); } // прожилка жира
    }
}
function tefaChar(c, x, y, r, R) { // подпалины сверху и с одного бока, мягкий край
  const v = TEFA_VARIANT, T = v.T;
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI * (0.15 + R() * 0.9), d = r * (0.2 + R() * 0.6);
    const px = x + Math.cos(a) * d * v.sx, py = y + Math.sin(a) * d * v.sy, rad = r * (0.18 + R() * 0.2);
    const g = c.createRadialGradient(px, py, rad * 0.2, px, py, rad);
    g.addColorStop(0, tefaHexa(T.char, 0.42)); g.addColorStop(1, tefaHexa(T.char, 0));
    c.fillStyle = g; tefaEll(c, px, py, rad, rad * 0.78, R() * TEFA_TAU);
  }
}
function tefaSheen(c, x, y, r, R) { // мокрый жирный блеск: много мелких бликов, а не одно белое пятно
  const v = TEFA_VARIANT;
  for (let i = 0; i < 34; i++) {
    const a = R() * TEFA_TAU, d = r * Math.sqrt(R()) * 0.94;
    const px = Math.cos(a) * d * v.sx, py = Math.sin(a) * d * v.sy;
    if ((-px / r * 0.5 - py / r * 0.9) < 0.1 + R() * 0.55) continue; // только сверху-слева
    c.fillStyle = `rgba(255,232,202,${0.25 + R() * 0.4})`;
    tefaEll(c, x + px, y + py, Math.max(0.7, r * (0.012 + R() * 0.02)), Math.max(0.5, r * 0.007), R() * TEFA_TAU);
  }
}
// шапка соуса: волнистый верх с каплями, путь строится отдельно — по нему же ставятся кончики капель
function tefaPourPath(c, x, y, r, w, dips) {
  const ty = tefaTopY(y, r), pts = [[-w, 0.2]].concat(dips).concat([[w, 0.18]]);
  c.beginPath(); c.moveTo(x + r * pts[0][0], ty + r * pts[0][1]);
  for (let i = 1; i < pts.length; i++) { // фестоны между каплями
    const p = pts[i - 1], q = pts[i], mx = (p[0] + q[0]) / 2;
    c.quadraticCurveTo(x + r * mx, ty + r * (Math.min(p[1], q[1]) - 0.13), x + r * q[0], ty + r * q[1]);
  }
  c.lineTo(x + r * w, ty - r * 0.4); c.lineTo(x - r * w, ty - r * 0.4); c.closePath();
  return ty;
}
function tefaPour(c, x, y, r, col, w, dips) {
  c.save(); tefaSil(c, x, y, r); c.clip(); c.fillStyle = col; const ty = tefaPourPath(c, x, y, r, w, dips); c.fill();
  for (const [dx, len] of dips) tefaEll(c, x + r * dx, ty + r * (len - 0.05), r * 0.05, r * 0.05); // кончики капель
  c.fillStyle = 'rgba(255,255,255,0.3)'; tefaEll(c, x - r * 0.12, ty + r * 0.07, r * w * 0.5, r * 0.05, -0.25); c.restore();
}
// томатная глазурь: шапка с фестонами сверху, общий томатный тон по телу и лужица соуса у низа; S — рецепт глазури
function tefaSauce(c, x, y, r, pool, S = TEFA_VARIANT.sauce) {
  const T = TEFA_VARIANT.T;
  tefaPour(c, x, y, r, T.sauce, S.w, S.dips);
  c.save(); tefaSil(c, x, y, r); c.clip();
  c.fillStyle = tefaHexa(T.sauce, S.coat); c.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8); // тонкая глазурь, фактура просвечивает
  if (pool) {
    c.fillStyle = tefaHexa(T.sauce, 0.9); c.beginPath(); // плотная лужица у самого низа
    c.moveTo(x - r * 1.3, y + r * 0.66);
    c.bezierCurveTo(x - r * 0.5, y + r * 0.52, x - r * 0.1, y + r * 0.8, x + r * 0.4, y + r * 0.62);
    c.bezierCurveTo(x + r * 0.8, y + r * 0.52, x + r * 1.0, y + r * 0.7, x + r * 1.3, y + r * 0.6);
    c.lineTo(x + r * 1.3, y + r * 1.5); c.lineTo(x - r * 1.3, y + r * 1.5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,190,150,0.45)'; c.lineWidth = tefaLw(r, 0.018); // глянец по кромке соуса
    c.beginPath(); c.moveTo(x - r * 0.9, y + r * 0.63);
    c.bezierCurveTo(x - r * 0.4, y + r * 0.5, x - r * 0.05, y + r * 0.78, x + r * 0.4, y + r * 0.61); c.stroke();
  }
  c.fillStyle = 'rgba(255,205,170,0.4)'; tefaEll(c, x - r * 0.34, y - r * 0.5, r * 0.18, r * 0.06, -0.3); // мокрый блик на глазури
  c.restore();
}
// рецепт глазури для уровня жизней: шапка и капли сжимаются к макушке (sauce5 стиля A: плотность прежняя)
function tefaSauceFor(lvl) {
  const S = TEFA_VARIANT.sauce, k = TEFA_SAUCE_K[lvl];
  return lvl ? { w: S.w * k, dips: S.dips.map(([dx, len]) => [dx * k, len * k]), coat: S.coat } : S;
}
// мясо без глазури: масса → зёрна → подпалины → затемнение к краю → блеск
function tefaMeat(c, x, y, r) {
  const v = TEFA_VARIANT, T = v.T, R = tefaRng(v.seed * 7919 + 13);
  tefaSil(c, x, y, r);
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, T.warm); g.addColorStop(0.7, tefaMix(T.shade, T.base, 0.6)); g.addColorStop(1, T.crev);
  c.fillStyle = g; c.fill();
  c.save(); tefaSil(c, x, y, r); c.clip();
  tefaGrains(c, x, y, r, R);
  tefaChar(c, x, y, r, R);
  const rim = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.62, x, y + r * 0.1, r * 1.2);
  rim.addColorStop(0, tefaHexa(T.crev, 0)); rim.addColorStop(1, tefaHexa(T.crev, 0.55)); // затемнение к краю
  c.fillStyle = rim; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  tefaSheen(c, x, y, r, R);
  c.restore();
}

// ---------- жизни: уровень, укусы, срезы, заживление (спека v2.1.1 §3.2) ----------
// 0 — полная, 1 — минус кусок, 2 — два укуса, 3 — последний кусок (паника при любой «Мясистости»)
function tefaHpLevel(cur, max) {
  if (cur >= max) return 0;
  if (cur <= 1) return 3;
  return cur / max >= 0.6 ? 1 : 2;
}
function tefaBite(x, y, r, i, grown) { // grown — сколько укуса уже заросло: 0 — целиком, 1 — укуса нет
  const v = TEFA_VARIANT, [a, b, off] = TEFA_BITES[i];
  return { cx: x + Math.cos(a) * r * v.sx * (1 + off), cy: y + Math.sin(a) * r * v.sy * (1 + off),
    b: r * (off + (b - off) * (1 - (grown || 0))), ph: i * 1.3 };
}
function tefaBitesOf(x, y, r, lvl) { const out = []; for (let i = 0; i < lvl; i++) out.push(tefaBite(x, y, r, i)); return out; }
function tefaBitePath(c, B, grow) { // круг укуса со следами зубов: скруглённые выемки, между ними острые зубчики
  const br = B.b + (grow || 0), N = 180;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TEFA_TAU, rr = br * (0.93 + 0.07 * Math.abs(Math.sin(a * 9 + B.ph)));
    const px = B.cx + Math.cos(a) * rr, py = B.cy + Math.sin(a) * rr;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}
function tefaClipOutBites(c, x, y, r, bites) { // дальше всё рисуется мимо укусов: прямоугольник минус круги (even-odd)
  c.beginPath(); c.rect(x - r * 3, y - r * 3, r * 6, r * 6);
  for (const B of bites) tefaBitePath(c, B);
  c.clip('evenodd');
}
function tefaRawMince(c, x, y, r, seed) { // заливка сырым фаршем в текущем клипе: розовая основа и то же зерно
  const g = c.createLinearGradient(x - r * 0.6, y - r * 0.8, x + r * 0.6, y + r * 0.8);
  g.addColorStop(0, TEFA_RAW.lit); g.addColorStop(1, TEFA_RAW.shade); // свет сверху-слева, как у корочки
  c.fillStyle = g; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  tefaGrains(c, x, y, r, tefaRng(TEFA_VARIANT.seed * 31 + seed), TEFA_RAW);
}
// срез укуса: полоса сырого фарша вдоль выкуса, тёмная кромка корочки по её внутреннему краю и соус, затёкший сверху
function tefaBiteRims(c, x, y, r, bites) {
  const T = TEFA_VARIANT.T, band = r * TEFA_BAND;
  c.save(); tefaSil(c, x, y, r); c.clip(); // внутри тела; сами укусы уже вырезаны внешним клипом
  c.beginPath(); for (const B of bites) tefaBitePath(c, B, band); c.clip();
  tefaRawMince(c, x, y, r, 7);
  c.strokeStyle = tefaHexa(T.crev, 0.75); c.lineWidth = tefaLw(r, 0.03); // кромка корочки
  c.beginPath(); for (const B of bites) tefaBitePath(c, B, band); c.stroke();
  c.lineCap = 'round';
  for (const B of bites) { // мазок соуса по верхней части среза и капля на его конце
    const toC = Math.atan2(y - B.cy, x - B.cx), dUp = Math.atan2(y - r - B.cy, x - B.cx) - toC;
    const side = Math.max(-0.75, Math.min(0.75, Math.atan2(Math.sin(dUp), Math.cos(dUp)))), mid = toC + side;
    const a1 = mid - Math.sign(side) * 0.45, rr = B.b + band * 0.45;
    c.strokeStyle = tefaHexa(T.sauce, 0.92); c.lineWidth = tefaLw(r, 0.06);
    c.beginPath(); c.arc(B.cx, B.cy, rr, Math.min(mid, a1), Math.max(mid, a1)); c.stroke();
    c.fillStyle = tefaHexa(T.sauce, 0.95); tefaEll(c, B.cx + Math.cos(a1) * rr, B.cy + Math.sin(a1) * rr + r * 0.02, r * 0.045, r * 0.06);
  }
  c.restore();
}
// укус зарастает: между прежним краем B0 и нынешним B — свежий фарш, по фронту роста золотая кромка.
// Внешний клип уже вырезал ещё открытую часть B; raw() заливает сырым фаршем текущий клип
function tefaHealFill(c, x, y, r, B0, B, raw) {
  c.save(); tefaSil(c, x, y, r); c.clip();
  c.beginPath(); tefaBitePath(c, B0); c.clip();
  raw();
  const g = c.createRadialGradient(B.cx, B.cy, B.b, B.cx, B.cy, B0.b * 1.02);
  g.addColorStop(0, 'rgba(255,214,120,0.8)'); g.addColorStop(0.5, 'rgba(255,214,120,0.35)'); g.addColorStop(1, 'rgba(255,214,120,0.12)');
  c.fillStyle = g; c.fillRect(B0.cx - B0.b * 1.1, B0.cy - B0.b * 1.1, B0.b * 2.2, B0.b * 2.2);
  c.strokeStyle = 'rgba(255,236,160,0.95)'; c.lineWidth = tefaLw(r, 0.035); // фронт роста
  c.beginPath(); tefaBitePath(c, B); c.stroke();
  c.restore();
  c.save(); tefaSil(c, x, y, r); c.clip(); // золотистая граница прежнего укуса на корочке
  c.strokeStyle = 'rgba(255,214,120,0.55)'; c.lineWidth = tefaLw(r, 0.022);
  c.beginPath(); tefaBitePath(c, B0); c.stroke();
  c.restore();
}
// тело целиком для уровня lvl: мясо и глазурь мимо укусов, красный тон последнего куска, срезы
function tefaBodyHp(c, x, y, r, pool, lvl, tint) {
  const bites = tefaBitesOf(x, y, r, lvl);
  c.save();
  if (bites.length) tefaClipOutBites(c, x, y, r, bites);
  tefaMeat(c, x, y, r);
  tefaSauce(c, x, y, r, pool, tefaSauceFor(lvl));
  if (tint) tefaTint(c, x, y, r, tint); // краснеет корочка; срезы рисуются после и остаются розовыми
  if (bites.length) tefaBiteRims(c, x, y, r, bites);
  c.restore();
}

// ---------- эффекты: мигание, пот, искры, свечение шкалы, огонь берсерка ----------
function tefaAlarm(c, x, y, r, t) { // красный ореол за телом: мигание видно на тёмной кухне
  const g = c.createRadialGradient(x, y, r * 1.0, x, y, r * 1.55);
  g.addColorStop(0, `rgba(255,56,40,${0.5 * t})`); g.addColorStop(1, 'rgba(255,56,40,0)');
  c.fillStyle = g; tefaEll(c, x, y, r * 1.55, r * 1.55);
}
function tefaTint(c, x, y, r, t) { // тело краснеет; лицо рисуется после и остаётся читаемым
  c.save(); tefaSil(c, x, y, r); c.clip();
  c.fillStyle = `rgba(255,50,34,${0.42 * t})`; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  c.restore();
}
function tefaSweat(c, x, y, r) { // капля пота у левого виска: голубая с бликом и тёмным контуром
  const s = r * 0.15; c.save(); c.translate(x - r * 0.8, y - r * 0.46); c.rotate(-0.35);
  c.beginPath(); c.moveTo(0, -s * 1.5); c.bezierCurveTo(s * 0.35, -s * 0.6, s, 0, s, s * 0.3);
  c.arc(0, s * 0.3, s, 0, Math.PI); c.bezierCurveTo(-s, 0, -s * 0.35, -s * 0.6, 0, -s * 1.5); c.closePath();
  c.fillStyle = '#bfe8ff'; c.fill(); c.strokeStyle = '#2d5d86'; c.lineWidth = tefaLw(r, 0.018); c.stroke();
  c.fillStyle = '#fff'; tefaEll(c, -s * 0.35, s * 0.1, s * 0.22, s * 0.35, 0.3);
  c.restore();
}
function tefaSparkle(c, x, y, s) { // золотая искра: четыре луча, мягкий ореол и светлая серединка
  const g = c.createRadialGradient(x, y, 0, x, y, s * 1.4);
  g.addColorStop(0, 'rgba(255,230,150,0.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  c.fillStyle = g; tefaEll(c, x, y, s * 1.4, s * 1.4);
  c.fillStyle = '#ffe07a'; c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? s * 0.22 : s;
    i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath(); c.fill(); c.fillStyle = '#fffbe8'; tefaEll(c, x, y, s * 0.2, s * 0.2);
}
function tefaChargeGlow(c, x, y, r) { // шкала полна: тёплое свечение за телом
  const g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 1.6);
  g.addColorStop(0, 'rgba(255,200,90,0.6)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  c.fillStyle = g; tefaEll(c, x, y, r * 1.6, r * 1.6);
}
function tefaChargeRim(c, x, y, r) { // золотой кант изнутри по краю — Тефа светится сама, а не просто стоит в ореоле
  c.save(); tefaSil(c, x, y, r); c.clip();
  const g = c.createRadialGradient(x, y + r * 0.1, r * 0.72, x, y + r * 0.1, r * 1.1);
  g.addColorStop(0, 'rgba(255,210,110,0)'); g.addColorStop(1, 'rgba(255,210,110,0.65)');
  c.fillStyle = g; c.fillRect(x - r * 1.5, y - r * 1.5, r * 3, r * 3);
  c.restore();
}
function tefaBerserkAura(c, x, y, r) { // огненная аура: три слоя языков пламени от края вверх-наружу (за телом)
  const v = TEFA_VARIANT, g = c.createRadialGradient(x, y, r * 0.8, x, y, r * 1.7);
  g.addColorStop(0, 'rgba(255,110,30,0.55)'); g.addColorStop(1, 'rgba(255,80,20,0)');
  c.fillStyle = g; tefaEll(c, x, y, r * 1.7, r * 1.7);
  for (const [col, k] of [['rgba(214,52,20,0.9)', 1], ['rgba(255,132,30,0.95)', 0.74], ['rgba(255,222,110,0.95)', 0.5]]) {
    const R = tefaRng(777); c.fillStyle = col; // один сид на все слои — языки вложены друг в друга
    for (let i = 0; i < 14; i++) {
      const t = i / 13, a = 2.75 + t * 3.93; // от нижне-левого бока через макушку к нижне-правому
      const ex = x + Math.cos(a) * r * v.sx * 0.9, ey = y + Math.sin(a) * r * v.sy * 0.9;
      let dx = Math.cos(a), dy = Math.sin(a) - 1.4; const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl; // наружу и вверх
      const len = r * (0.32 + 0.26 * Math.sin(t * Math.PI) + R() * 0.2) * k, w = r * (0.2 + R() * 0.06) * k;
      const nx = -dy, ny = dx, curl = (R() - 0.5) * 0.5; // поперёк языка; кончик чуть загнут
      c.beginPath(); c.moveTo(ex - nx * w, ey - ny * w);
      c.quadraticCurveTo(ex - nx * w * 0.6 + dx * len * 0.55, ey - ny * w * 0.6 + dy * len * 0.55, ex + dx * len + nx * len * curl * 0.3, ey + dy * len + ny * len * curl * 0.3);
      c.quadraticCurveTo(ex + nx * w * 0.6 + dx * len * 0.55, ey + ny * w * 0.6 + dy * len * 0.55, ex + nx * w, ey + ny * w);
      c.closePath(); c.fill();
    }
  }
}
function tefaEmbers(c, x, y, r) { // угольки над макушкой
  const R = tefaRng(99);
  for (let i = 0; i < 7; i++) {
    const px = x + (R() - 0.5) * r * 1.6, py = y - r * (1.25 + R() * 0.45), s = Math.max(1.2, r * (0.02 + R() * 0.02));
    c.fillStyle = `rgba(255,${(170 + R() * 70) | 0},60,${(0.6 + R() * 0.4).toFixed(2)})`; tefaEll(c, px, py, s, s);
  }
}

// ---------- лицо: mood из состояния, поверх — моргание, взгляд и открытый рот при еде ----------
// happy — утверждённое лицо; determined, worried, scared — жизни; ready — полная шкала; fierce — берсерк
function tefaFace(c, x, y, r, pose, mood) {
  const T = TEFA_VARIANT.T, ex = r * 0.30, ey = -r * 0.07, my = r * 0.31, mw = r * 0.27;
  const scared = mood === 'scared', er = Math.max(4.6, r * 0.185) * (scared ? 1.16 : 1);
  const g = c.createRadialGradient(x, y + r * 0.06, r * 0.1, x, y + r * 0.06, r * 0.66);
  g.addColorStop(0, tefaHexa(T.warm, 0.5)); g.addColorStop(1, tefaHexa(T.warm, 0));
  c.fillStyle = g; tefaEll(c, x, y + r * 0.06, r * 0.66, r * 0.52); // успокаиваем фактуру под лицом
  const look = clamp(pose.face || 0, -1, 1) * er * 0.42; // взгляд сдвигает зрачок с бликами
  // веко: [доля глаза под веком у внешнего края, насколько край ниже у переносицы] — собранный, готовый, злой взгляд
  const lid = { determined: [0.3, 0.22], ready: [0.26, 0.16], fierce: [0.34, 0.46] }[mood];
  const pr = scared ? 0.3 : mood === 'worried' ? 0.46 : 0.52; // испуг — зрачок-точка
  for (const s of [-1, 1]) {
    const cx = x + s * ex, cy = y + ey;
    c.fillStyle = tefaHexa(T.crev, 0.55); tefaEll(c, cx, cy + er * 0.1, er * 1.14, er * 1.12); // тень-посадка глаза
    if (pose.blink) { // закрытый глаз: веко цветом мяса и тёмная линия ресниц
      c.fillStyle = tefaMix(T.warm, T.lit, 0.3); tefaEll(c, cx, cy, er * 1.08, er * 1.04);
      c.strokeStyle = tefaHexa(T.char, 0.85); c.lineWidth = tefaLw(r, 0.03); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - er * 0.92, cy - er * 0.14);
      c.quadraticCurveTo(cx, cy + er * 0.38, cx + er * 0.92, cy - er * 0.14); c.stroke();
      continue;
    }
    c.fillStyle = '#fff'; tefaEll(c, cx, cy, er, er);
    if (mood === 'happy') { // утверждённое лицо дословно (drawFace4 листа 4): зрачок и два блика
      c.fillStyle = '#231610'; c.beginPath(); c.arc(cx + er * 0.08 + look, cy + er * 0.1, er * 0.52, 0, TEFA_TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx - er * 0.16 + look, cy - er * 0.2, er * 0.22, 0, TEFA_TAU); c.fill();
      c.beginPath(); c.arc(cx + er * 0.3 + look, cy + er * 0.3, er * 0.1, 0, TEFA_TAU); c.fill();
      continue;
    }
    const px = cx + (scared ? 0 : er * 0.08) + look, py = cy + (scared ? 0 : mood === 'worried' ? -er * 0.04 : er * 0.1);
    c.fillStyle = '#231610'; c.beginPath(); c.arc(px, py, er * pr, 0, TEFA_TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(px - er * pr * 0.46, py - er * pr * 0.58, er * pr * 0.42, 0, TEFA_TAU); c.fill(); // блики
    if (!scared) { c.beginPath(); c.arc(px + er * pr * 0.42, py + er * pr * 0.38, er * pr * 0.19, 0, TEFA_TAU); c.fill(); }
    if (lid) {
      const [h, tilt] = lid, xo = cx + s * er * 1.1, xi = cx - s * er * 1.1, yo = cy - er + er * 2 * h, yi = yo + er * tilt;
      c.save(); c.beginPath(); c.arc(cx, cy, er * 1.01, 0, TEFA_TAU); c.clip();
      c.fillStyle = tefaMix(T.warm, T.lit, 0.3); c.beginPath(); // веко цветом мяса
      c.moveTo(xo, yo); c.lineTo(xi, yi); c.lineTo(xi, cy - er * 1.3); c.lineTo(xo, cy - er * 1.3); c.closePath(); c.fill();
      c.restore();
      c.save(); c.beginPath(); c.arc(cx, cy, er * 1.12, 0, TEFA_TAU); c.clip(); // линия ресниц по краю века
      c.strokeStyle = tefaHexa(T.char, 0.9); c.lineWidth = tefaLw(r, 0.034); c.lineCap = 'round';
      c.beginPath(); c.moveTo(xo, yo); c.lineTo(xi, yi); c.stroke(); c.restore();
    }
  }
  // брови: [внешний край x, высота; внутренний край x, высота] в долях er от центра глаза; светлая подводка снизу
  const brow = { determined: [0.95, 1.5, 0.8, 1.26], ready: [0.95, 1.5, 0.8, 1.3], worried: [0.95, 1.38, 0.72, 1.74],
    scared: [0.95, 1.55, 0.7, 1.98], fierce: [1.05, 1.66, 0.82, 0.98] }[mood];
  if (brow) for (const s of [-1, 1]) {
    const cx = x + s * ex, cy = y + ey, [xo, ho, xi, hi] = brow;
    for (const [col, dy, w] of [['rgba(255,190,140,0.35)', er * 0.14, 0.06], ['#1b0c05', 0, mood === 'fierce' ? 0.068 : 0.052]]) {
      c.strokeStyle = col; c.lineWidth = tefaLw(r, w); c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + s * er * xo, cy - er * ho + dy); c.lineTo(cx - s * er * xi, cy - er * hi + dy); c.stroke();
    }
  }
  const my0 = y + my, warm = 'rgba(255,190,140,0.35)', dark = '#1b0c05';
  c.lineCap = 'round'; c.lineWidth = tefaLw(r, 0.06);
  const m = clamp(pose.mouth || 0, 0, 1);
  if (m > 0.1) { // открытый рот при еде — тёмный овал с тёплой подсветкой по нижней губе
    const mh = r * (0.045 + 0.145 * m);
    c.strokeStyle = warm;
    c.beginPath(); c.moveTo(x - mw * 0.95, my0); c.quadraticCurveTo(x, my0 + mh * 2.1 + r * 0.06, x + mw * 0.95, my0); c.stroke();
    c.fillStyle = dark; tefaEll(c, x, my0 + mh * 0.3, mw * 0.96, mh);
  } else if (mood === 'happy' || mood === 'ready') { // улыбка утверждённого лица
    c.strokeStyle = warm; c.beginPath(); c.moveTo(x - mw, my0 + r * 0.02); c.quadraticCurveTo(x, my0 + r * 0.24, x + mw, my0 + r * 0.02); c.stroke();
    c.strokeStyle = dark; c.beginPath(); c.moveTo(x - mw, my0 - r * 0.01); c.quadraticCurveTo(x, my0 + r * 0.21, x + mw, my0 - r * 0.01); c.stroke();
  } else if (mood === 'determined') { // сжатые губы: короткая прямая, уголки чуть вниз
    const line = dy => { c.beginPath(); c.moveTo(x - mw * 0.72, my0 + r * 0.09 + dy); c.quadraticCurveTo(x, my0 + r * 0.04 + dy, x + mw * 0.72, my0 + r * 0.09 + dy); c.stroke(); };
    c.strokeStyle = warm; line(r * 0.03); c.strokeStyle = dark; line(0);
  } else if (mood === 'worried') { // волнистая тревожная линия
    const wave = dy => {
      c.beginPath(); c.moveTo(x - mw * 0.78, my0 + r * 0.1 + dy);
      c.bezierCurveTo(x - mw * 0.4, my0 + r * 0.01 + dy, x - mw * 0.1, my0 + r * 0.01 + dy, x, my0 + r * 0.07 + dy);
      c.bezierCurveTo(x + mw * 0.1, my0 + r * 0.13 + dy, x + mw * 0.4, my0 + r * 0.13 + dy, x + mw * 0.78, my0 + r * 0.04 + dy); c.stroke();
    };
    c.strokeStyle = warm; wave(r * 0.03); c.strokeStyle = dark; wave(0);
  } else if (mood === 'scared') { // маленький открытый рот «о»
    c.fillStyle = warm; tefaEll(c, x, my0 + r * 0.1, r * 0.11, r * 0.13);
    c.fillStyle = dark; tefaEll(c, x, my0 + r * 0.08, r * 0.095, r * 0.115);
  } else if (mood === 'fierce') { // оскал: широкий открытый рот, сверху ряд зубов
    const mouth = () => { c.beginPath(); c.moveTo(x - mw * 1.08, my0 - r * 0.03); c.quadraticCurveTo(x, my0 + r * 0.07, x + mw * 1.08, my0 - r * 0.03);
      c.quadraticCurveTo(x, my0 + r * 0.4, x - mw * 1.08, my0 - r * 0.03); c.closePath(); };
    c.save(); c.translate(0, r * 0.03); c.fillStyle = warm; mouth(); c.fill(); c.restore(); // тёплая подсветка нижней губы
    c.fillStyle = dark; mouth(); c.fill();
    c.save(); mouth(); c.clip(); c.fillStyle = '#f6efe2'; c.fillRect(x - mw * 1.1, my0 - r * 0.1, mw * 2.2, r * 0.18);
    c.strokeStyle = tefaHexa(T.crev, 0.5); c.lineWidth = tefaLw(r, 0.012);
    for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(x + mw * k, my0); c.lineTo(x + mw * k, my0 + r * 0.08); c.stroke(); }
    c.restore();
  }
}

// ---------- кэш: зерно из сотен клякс слишком дорого рисовать каждый кадр ----------
// картинка печётся один раз на радиус (шаг 4 px) и масштаб экрана; тело — ещё на лужицу, уровень жизней и красный тон
const tefaCache = new Map(); // `${tag}:${rr}:${k}` → canvas; tag: `body:${pool}:${lvl}:${tint}` или `raw`
const TEFA_CACHE_MAX = 16;   // на телефоне с dpr 3 кэш с k = 3 и шагом радиуса 2 px доходил до 60 МБ; уровни жизней добавили ключей
function tefaCached(c, rd, tag, paint) { // paint(cc, r) рисует картинку с центром в (0, 0) для радиуса r
  const canCache = typeof document !== 'undefined' && typeof document.createElement === 'function';
  if (!canCache) { paint(c, rd); return; } // headless-стенд и node-canvas рисуют напрямую
  const k = Math.min(2, Math.max(1, Math.ceil((view.scale || 1) * (view.dpr || 1))));
  const rr = Math.max(4, Math.round(rd / 4) * 4), key = tag + ':' + rr + ':' + k;
  let cv = tefaCache.get(key);
  if (!cv) {
    const size = Math.ceil(rr * 3.2 * k);
    cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    const cc = cv.getContext('2d'); if (!cc) { paint(c, rd); return; }
    cc.setTransform(k, 0, 0, k, size / 2, size / 2);
    paint(cc, rr);
    if (tefaCache.size >= TEFA_CACHE_MAX) tefaCache.delete(tefaCache.keys().next().value);
    tefaCache.set(key, cv);
  }
  const half = rr * 1.6 * (rd / rr);
  c.drawImage(cv, -half, -half, half * 2, half * 2);
}
function tefaBodyCached(c, rd, pool, lvl, tint) { tefaCached(c, rd, 'body:' + (pool ? 1 : 0) + ':' + lvl + ':' + tint, (cc, r) => tefaBodyHp(cc, 0, 0, r, pool, lvl, tint)); }
// заживление 0.3 с тоже из кэша: тело нового уровня мимо ещё открытой части укуса B, в кольце между B0 и B — сырой фарш
function tefaHealCached(c, rd, pool, lvl, heal) {
  const B0 = tefaBite(0, 0, rd, lvl), B = tefaBite(0, 0, rd, lvl, heal); // был укус B0, сейчас B
  c.save(); tefaClipOutBites(c, 0, 0, rd, [B]);
  tefaBodyCached(c, rd, pool, lvl, 0);
  tefaHealFill(c, 0, 0, rd, B0, B, () => tefaCached(c, rd, 'raw', (cc, r) => tefaRawMince(cc, 0, 0, r, 11)));
  c.restore();
}
// (x, y) — центр столкновений, r — радиус столкновений; поза задаётся трансформацией контекста.
// pose: sx, sy, tilt, face, mouth, blink, hot 0..1, berserk, alpha, flag (лужица соуса; по умолчанию есть),
//   hp { cur, max } — жизни (по умолчанию полная), tint 0..1 — красное мигание последнего куска,
//   charged — шкала суперсилы полна, heal 0..1 — укус зарастает (0 и 1 — заживления нет)
function drawTefa(c, x, y, r, pose = {}) {
  const sx = pose.sx === undefined ? 1 : pose.sx, sy = pose.sy === undefined ? 1 : pose.sy;
  const rd = r * TEFA_FIT; // радиус в мерках инструмента
  const hp = pose.hp || { cur: 1, max: 1 }, lvl = tefaHpLevel(hp.cur, hp.max), pool = pose.flag !== false;
  const heal = pose.heal > 0 && pose.heal < 1 && lvl < 3 ? pose.heal : 0; // заживает укус № lvl: следующий после нынешних
  const tint = lvl === 3 ? clamp(pose.tint || 0, 0, 1) : 0;
  const mood = pose.berserk ? 'fierce' : lvl === 3 ? 'scared' : pose.charged ? 'ready' : ['happy', 'determined', 'worried'][lvl];
  const a0 = pose.alpha === undefined ? 1 : pose.alpha;
  c.save();
  c.globalAlpha = a0;
  c.translate(x, y + r); c.rotate(pose.tilt || 0); c.scale(sx, sy); c.translate(0, -r); // сквош от нижней точки
  if (pose.berserk) tefaBerserkAura(c, 0, 0, rd);
  if (pose.charged) tefaChargeGlow(c, 0, 0, rd);
  if (tint) tefaAlarm(c, 0, 0, rd, tint);
  if (heal) tefaHealCached(c, rd, pool, lvl, heal);
  else {
    tefaBodyCached(c, rd, pool, lvl, 0);
    if (tint) { c.globalAlpha = a0 * tint; tefaBodyCached(c, rd, pool, lvl, 1); c.globalAlpha = a0; } // смесь с красной версией = мигание
  }
  const hot = clamp(pose.hot || 0, 0, 1);
  if (hot > 0 || pose.charged) { // ожог и золотой кант ложатся на тело мимо укусов
    c.save(); const bites = tefaBitesOf(0, 0, rd, lvl); if (bites.length) tefaClipOutBites(c, 0, 0, rd, bites);
    if (hot > 0) { tefaSil(c, 0, 0, rd); c.fillStyle = `rgba(70,20,10,${hot * 0.55})`; c.fill(); } // ожог о сковородку
    if (pose.charged) tefaChargeRim(c, 0, 0, rd);
    c.restore();
  }
  tefaFace(c, 0, 0, rd, pose, mood);
  if (mood === 'worried') tefaSweat(c, 0, 0, rd);
  if (pose.charged) for (const [a, d, s] of TEFA_SPARKS) tefaSparkle(c, Math.cos(a) * rd * TEFA_VARIANT.sx * d, Math.sin(a) * rd * TEFA_VARIANT.sy * d, rd * s);
  if (heal) { // золотая искра у зарастающего укуса
    const B0 = tefaBite(0, 0, rd, lvl), a = Math.atan2(B0.cy, B0.cx);
    tefaSparkle(c, B0.cx - Math.cos(a) * B0.b * 0.35, B0.cy - Math.sin(a) * B0.b * 0.35, rd * 0.17);
    tefaSparkle(c, B0.cx + Math.cos(a + 1.2) * B0.b * 0.7, B0.cy + Math.sin(a + 1.2) * B0.b * 0.7, rd * 0.08);
  }
  if (pose.berserk) tefaEmbers(c, 0, 0, rd);
  c.restore();
}
expose({ drawTefa, tefaHpLevel, TEFA_VARIANT, TEFA_FIT, get tefaCacheSize() { return tefaCache.size; } });
````

- Заменить `tools/shot_tefa.js` целиком (правок больше половины файла):

````js
// node tools/shot_tefa.js — shots/tefa_port.png: drawTefa из игры в состояниях жизней и эффектах (радиус как в игре ×1.6)
// рядом с игровым размером; сравнивать глазами с shots/design_tefa_round5_hp.png (стиль A) и design_tefa_round4.png (A)
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const Wd = 1100, Hd = 760, real = createCanvas(Wd, Hd), ctx = real.getContext('2d');
const g = require('./_env')(ctx, { width: Wd, height: Hd }); const d = g.dbg();
ctx.fillStyle = '#2a201b'; ctx.fillRect(0, 0, Wd, Hd);
const plate = (x, y, w) => { ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.ellipse(x, y + 8, w / 2, 16, 0, 0, 7); ctx.fill(); };
const label = (s, x, y) => { ctx.fillStyle = '#fff'; ctx.font = '600 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(s, x, y); };
const rad = m => d.radiusFor(m), K = 1.6;
const cells = [
  ['полная', 4, {}], ['минус кусок', 3, {}], ['два укуса', 2, {}], ['последний кусок', 1, { tint: 1 }],
  ['шкала полна', 4, { charged: true }], ['берсерк', 4, { berserk: true }], ['лечение 0.5', 3, { heal: 0.5 }], ['еда + моргание', 2, { mouth: 0.8, blink: true }],
];
cells.forEach(([name, m, pose], i) => { const x = 140 + (i % 4) * 270, y = 150 + Math.floor(i / 4) * 280, r = rad(m) * K; plate(x, y + r, r * 3);
  d.drawTefa(ctx, x, y, r, Object.assign({ hp: { cur: m, max: 4 } }, pose)); label(name, x, y + r + 44); });
[4, 3, 2, 1].forEach((m, i) => { const x = 140 + i * 110, y = 680, r = rad(m); plate(x, y + r, r * 3); d.drawTefa(ctx, x, y, r, { hp: { cur: m, max: 4 }, tint: m === 1 ? 1 : 0 }); });
label('в игровом размере 1:1', 700, 690);
fs.writeFileSync(path.join(OUT, 'tefa_port.png'), real.toBuffer('image/png')); console.log('shots/tefa_port.png');
````

- [ ] **Шаг 4. Убедиться, что всё зелёное**

Run: `npm test`

Expected: одиннадцать строк `… ok` (`test_core` … `test_render`, `smoke`), из шума только два блока `YaGames.init failed, using stub …` от `test_sdk`.

- [ ] **Шаг 5. Посмотреть снимки**

Запустить `node tools/shot_tefa.js` и открыть `shots/tefa_port.png`. Сверить со стилем A листа `shots/design_tefa_round5_hp.png`:
  - полное состояние выглядит как раньше;
  - один, два и последний укус с сырым фаршем на срезе, глазури меньше с каждым куском;
  - у последнего куска испуганное лицо и красный тон;
  - кадр «лечение 0.5» показывает наполовину заросший укус с золотой кромкой.

Затем `npm run shot` и `shots/play.png`: вокруг Тефы нет светлого круга.

Открыть PNG и посмотреть глазами, а не описывать код. Листы `shots/design_tefa_*.png` не перезаписывать.

- [ ] **Шаг 6. Коммит**

````bash
git add src/ball.js src/game.js src/render.js src/tefa.js tools/shot_tefa.js tools/test_render.js
git commit -m "feat: жизни на самой Тефе — укусы, лицо, красное мигание последнего куска, заживление из кэша" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
````

---

## Task 3. Суперсила (спека §3.3, §3.4, §4, §9, §10, §11)

`src/power.js` заменяет `src/streak.js`. Шкала сверху слева копится за хорошую игру, берсерк включается тапом по Тефе или клавишей E, один раз на башню. Ветка «Запал» (`up.fury`) добавляет берсерки. HUD теряет серию и иконки массы. Скрытая серия для мух остаётся внутри `power`. Задача также закрепляет тестами случаи тапа из раздела «Review Focus».

**Files:**
- Modify: `index.html`
- Modify: `src/game.js`
- Modify: `src/hazards.js`
- Modify: `src/i18n.js`
- Modify: `src/main.js`
- Create: `src/power.js`
- Modify: `src/render.js`
- Modify: `src/save.js`
- Delete: `src/streak.js`
- Modify: `tools/shot.js`
- Test: `package.json`
- Test: `tools/smoke.js`
- Test: `tools/test_game.js`
- Test: `tools/test_hazards.js`
- Test: `tools/test_power.js`
- Test: `tools/test_render.js`
- Test: `tools/test_save.js`
- Delete test: `tools/test_streak.js`

**Interfaces:**
- Consumes: `heal(n)`, события `eaten` из задачи 1; `drawTefa` с `pose.charged` из задачи 2.
- Produces:
  - `power.js`:
    - состояние `power = { v, used, berserkT, flyStreak }`, константы `POWER_FULL = 30`, `POWER_HIT_LOSS = [0.25, 0.125, 0.0625]`, `BERSERK_T = 6`;
    - `berserkLimit()`, `berserkDur()`, `isBerserk()`, `powerSpent()`, `powerReady()`, `resetPower()`;
    - `powerAdd(pts)` → `'ready' | null`, `powerHit()`, `flyStreakAdd(k)`;
    - `activatePower()` → `boolean`, `endBerserk()`, `updatePower(dt)` → `'berserkEnd' | null`.
  - `game.js`: `tryActivatePower()` → `boolean`, `run.visited` (платформы, за которые уже дали очко).
  - `hazards.js`: `flyWanted(dt, streakN, campT, berserk, doubled)`, где `doubled` — полная шкала удваивает шанс.
  - `render.js`: `drawPowerMeter()`.
  - `main.js`: `TAP_TEFA_K = 1.3`, клавиша `KeyE`.
  - `save.js`: `UP_MAX.fury = 2`. `i18n`: ключ `tapTefa` вместо `streak`.

- [ ] **Шаг 1. Тесты**

Внести правки тестов. Код игры в этом шаге не трогать.

- Правка `package.json`:

````diff
diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -4,7 +4,7 @@
   "private": true,
   "description": "Тефтеля — вертикальная аркада для Яндекс Игр",
   "scripts": {
-    "test": "node tools/test_core.js && node tools/test_sdk.js && node tools/test_save.js && node tools/test_jump.js && node tools/test_tower.js && node tools/test_platforms.js && node tools/test_hazards.js && node tools/test_streak.js && node tools/test_game.js && node tools/test_render.js && node tools/smoke.js",
+    "test": "node tools/test_core.js && node tools/test_sdk.js && node tools/test_save.js && node tools/test_jump.js && node tools/test_tower.js && node tools/test_platforms.js && node tools/test_hazards.js && node tools/test_power.js && node tools/test_game.js && node tools/test_render.js && node tools/smoke.js",
     "shot": "node tools/shot.js",
     "build": "node tools/build.js"
   },
````

- Правка `tools/smoke.js`:

````diff
diff --git a/tools/smoke.js b/tools/smoke.js
--- a/tools/smoke.js
+++ b/tools/smoke.js
@@ -25,6 +25,14 @@ async function runFlow(opts) {
   g.tap(240, 100); assert.strictEqual(d.state, 'title', 'тап мимо кнопки не стартует');
   const play = btn(d, 'play'); g.tap(play.x, play.y); await g.flush(); assert.strictEqual(d.state, 'play'); assert.strictEqual(d.YG.log.at(-1), 'start');
   const c0 = d.ball.charges; g.tap(300, 300); assert.strictEqual(d.ball.charges, c0 - 1, 'тап в игре — прыжок');
+  // тап по Тефе (спека v2.1.1 §3.4): при полной шкале — суперсила без траты заряда, и в воздухе тоже;
+  // при неполной шкале, во время берсерка и после исчерпанного лимита — обычный прыжок
+  const tapTefa = () => g.tap(d.ball.x, d.ball.y - d.camY);
+  d.ball.charges = 3; tapTefa(); assert.ok(!d.isBerserk() && d.ball.charges === 2, 'неполная шкала — тап по Тефе остаётся прыжком');
+  d.powerAdd(d.POWER_FULL); assert.strictEqual(d.ball.onPlatform, null, 'Тефа в воздухе');
+  { const c1 = d.ball.charges; tapTefa(); assert.ok(d.isBerserk(), 'тап по Тефе при полной шкале — суперсила'); assert.strictEqual(d.ball.charges, c1, 'и не прыжок'); }
+  { const c2 = d.ball.charges; tapTefa(); assert.strictEqual(d.ball.charges, c2 - 1, 'во время берсерка тап по Тефе — прыжок'); } d.endBerserk();
+  d.ball.charges = 3; d.powerAdd(d.POWER_FULL); tapTefa(); assert.ok(!d.isBerserk() && d.ball.charges === 2, 'лимит исчерпан — тап по Тефе остаётся прыжком');
   climb(g, d); assert.strictEqual(d.state, 'finish', 'дошли до крыши башни 1'); assert.strictEqual(d.YG.log.at(-1), 'stop');
   assert.ok(d.run.rating && 'SABCD'.includes(d.run.rating.letter)); assert.strictEqual(d.save.tower, 2); assert.ok(d.save.log[1]);
   assert.strictEqual(JSON.parse(g.store.get('teft_save')).tower, 2, 'прогресс сохранён');
@@ -55,8 +63,11 @@ async function runFlow(opts) {
   d.die('fall'); steps(g, 60); { const b = btn(d, 'restart'); g.tap(b.x, b.y); } await g.flush(); g.step();
   assert.strictEqual(inters(), n0 + 1, 'интервал 180 с соблюдён');
   // пауза по скрытию вкладки: возврат по тапу без прыжка; клавиатура прыгает
-  const ch = d.ball.charges; g.hide(); assert.ok(d.paused); g.show(); assert.ok(d.awaitTap); g.tap(240, 300); assert.ok(!d.awaitTap); assert.strictEqual(d.ball.charges, ch, 'тап после паузы — не прыжок');
+  const ch = d.ball.charges; d.powerAdd(d.POWER_FULL); g.hide(); assert.ok(d.paused); g.show(); assert.ok(d.awaitTap);
+  g.tap(d.ball.x, d.ball.y - d.camY); assert.ok(!d.awaitTap); assert.strictEqual(d.ball.charges, ch, 'тап после паузы — не прыжок');
+  assert.ok(!d.isBerserk(), 'и не суперсила, даже по Тефе с полной шкалой');
   g.key('ArrowLeft'); assert.strictEqual(d.ball.charges, ch - 1);
+  d.powerAdd(d.POWER_FULL); g.key('KeyE'); assert.ok(d.isBerserk(), 'клавиша E включает суперсилу'); d.endBerserk();
   const ss = d.YG.log.filter(x => x === 'start' || x === 'stop'); // GameplayAPI: ни двух start подряд, ни двух stop
   for (let i = 1; i < ss.length; i++) assert.notStrictEqual(ss[i], ss[i - 1], 'start/stop чередуются');
   return d;
````

- Правка `tools/test_game.js`:

````diff
diff --git a/tools/test_game.js b/tools/test_game.js
--- a/tools/test_game.js
+++ b/tools/test_game.js
@@ -1,4 +1,4 @@
-// node tools/test_game.js — забег: старт, прыжок и заряды, посадка и серия, урон и смерть, лечение, продолжить, чекпоинт, финиш и рейтинг, еда, берсерк, мухи, god-режим
+// node tools/test_game.js — забег: старт, прыжок и заряды, посадка и шкала силы, урон и смерть, лечение, продолжить, чекпоинт, финиш и рейтинг, еда, суперсила, мухи, god-режим
 const assert = require('assert');
 const noop = () => {};
 const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
@@ -15,14 +15,14 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   // прыжок тратит заряд; в воздухе ещё два; без зарядов — нет
   assert.ok(d.jumpTo(300, -200)); assert.strictEqual(ball.charges, 2); assert.strictEqual(ball.onPlatform, null); assert.ok(ball.vy < 0);
   assert.ok(d.jumpTo(300, -300)); assert.ok(d.jumpTo(300, -400)); assert.strictEqual(d.jumpTo(300, -500), false, 'заряды кончились');
-  // посадка на платформу ряда 1: заряды полные, серия +1 за новую платформу, повтор не растит
+  // посадка на платформу ряда 1: заряды полные, шкала и серия для мух +1 за первую посадку, повтор не растит
   d.startTower(1); d.state = 'play'; const p1 = d.platforms.find(p => p.row === 1);
   for (const it of d.items) it.dead = true; d.setGod(true); // еда и масло по пути не должны влиять на проверку посадки
-  d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id), 'села на платформу ряда 1'); assert.strictEqual(ball.charges, 3); assert.strictEqual(d.streak.n, 1);
-  d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id)); assert.strictEqual(d.streak.n, 1, 'та же платформа серию не растит'); d.setGod(false);
-  // урон: −1 масса, неуязвимость, серия обнулена, отброс; повтор в неуязвимости не проходит; ноль массы — смерть с банком монет
+  d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id), 'села на платформу ряда 1'); assert.strictEqual(ball.charges, 3); assert.strictEqual(d.power.v, 1); assert.strictEqual(d.power.flyStreak, 1);
+  d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id)); assert.strictEqual(d.power.v, 1, 'та же платформа шкалу не растит'); d.setGod(false);
+  // урон: −1 масса, неуязвимость, четверть шкалы и серия для мух сняты, отброс; повтор в неуязвимости не проходит; ноль массы — смерть с банком монет
   d.setRunCoins(7); const earned0 = d.save.earned; d.YG.gameplayStart();
-  assert.ok(d.damage(1, 'oil', ball.x + 10, ball.y)); assert.strictEqual(ball.mass, 3); assert.ok(d.run.invuln > 0.9); assert.strictEqual(d.streak.n, 0); assert.strictEqual(ball.onPlatform, null);
+  assert.ok(d.damage(1, 'oil', ball.x + 10, ball.y)); assert.strictEqual(ball.mass, 3); assert.ok(d.run.invuln > 0.9); assert.strictEqual(d.power.v, 0); assert.strictEqual(d.power.flyStreak, 0); assert.strictEqual(ball.onPlatform, null);
   assert.strictEqual(d.damage(1, 'oil', ball.x, ball.y), false, 'в неуязвимости урона нет');
   d.run.invuln = 0; d.damage(5, 'knife', ball.x, ball.y); assert.strictEqual(d.state, 'dead'); assert.strictEqual(d.run.reason, 'knife'); assert.strictEqual(d.run.deaths, 1);
   assert.strictEqual(d.save.earned, earned0 + 7, 'монеты забега в сохранении'); assert.strictEqual(d.YG.log.at(-1), 'stop');
@@ -49,12 +49,25 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   const tp = d.towerParams(1), R = r => d.ratingFor(Object.assign({ deaths: 0, time: 10, foodEaten: 10, foodTotal: 10, usedContinue: 0 }, r), tp).letter;
   assert.strictEqual(R({}), 'S'); assert.strictEqual(R({ deaths: 1 }), 'A'); assert.strictEqual(R({ deaths: 1, time: 999 }), 'B'); assert.strictEqual(R({ deaths: 1, time: 999, foodEaten: 1 }), 'C'); assert.strictEqual(R({ usedContinue: 1 }), 'D');
   assert.strictEqual(R({ foodEaten: 8 }), 'S', '80% еды хватает'); assert.strictEqual(R({ foodEaten: 7 }), 'A'); assert.strictEqual(d.bonusCoins(3, 'A'), 90);
-  // еда: монеты с множителем башни и специй, серия +1; массу еда не возвращает (спека v2.1.1 §5)
+  // еда: монеты с множителем башни и специй, шкала +1 (в полёте +2); массу еда не возвращает (спека v2.1.1 §5)
   d.startTower(1); d.state = 'play'; const it = d.items[0]; ball.mass = 2; it.x = ball.x; it.y = ball.y; d.update(0.016);
-  assert.ok(it.dead); assert.strictEqual(ball.mass, 2, 'еда не лечит'); assert.strictEqual(d.run.foodEaten, 1); assert.strictEqual(d.run.runCoins, d.coinsFor(it.kind)); assert.strictEqual(d.streak.n, 1);
+  assert.ok(it.dead); assert.strictEqual(ball.mass, 2, 'еда не лечит'); assert.strictEqual(d.run.foodEaten, 1); assert.strictEqual(d.run.runCoins, d.coinsFor(it.kind)); assert.strictEqual(d.power.v, 1);
+  ball.onPlatform = null; ball.vy = 0; const it3 = d.items[1]; it3.x = ball.x; it3.y = ball.y; d.update(0.016); assert.ok(it3.dead); assert.strictEqual(d.power.v, 3, 'еда в полёте — +2');
   d.save.up.spice = 4; assert.strictEqual(d.coinsFor('meat'), Math.round(3 * 1.2)); d.save.up.spice = 0;
-  // берсерк: серия до порога → неуязвимость, монеты ×2, муха съедается
-  d.startTower(1); d.state = 'play'; for (let i = 0; i < 12; i++) d.streakAdd(1); assert.ok(d.isBerserk());
+  // шкала впервые за сессию полна — над Тефой подсказка «Тапни по Тефе!»; в следующий раз её нет (спека v2.1.1 §4.1)
+  const hints = () => d.texts.filter(t => t.str === 'Тапни по Тефе!').length;
+  for (const [k, want, msg] of [[2, 1, 'подсказка при первой полной шкале'], [3, 0, 'за сессию подсказка одна']]) {
+    d.startTower(1); d.state = 'play'; d.resetFx(); d.power.v = d.POWER_FULL - 1;
+    const food = d.items[k]; food.x = ball.x; food.y = ball.y; d.update(0.016);
+    assert.ok(d.powerReady()); assert.strictEqual(hints(), want, msg);
+  }
+  // муха отстала: +3 к шкале и +3 к скрытой серии для мух (спека v2.1.1 §4.1, §4.4)
+  d.startTower(1); d.state = 'play'; d.resetFlies(); d.spawnFly(true);
+  { const f = d.flies[0], v0 = d.power.v, s0 = d.power.flyStreak; f.warnT = 0; f.chaseT = d.flyChase(); d.update(0.016);
+    assert.strictEqual(d.flies.length, 0, 'муха отстала и улетела');
+    assert.strictEqual(d.power.v, v0 + 3, 'муха отстала — +3 к шкале'); assert.strictEqual(d.power.flyStreak, s0 + 3, 'и +3 к серии для мух'); }
+  // берсерк по полной шкале: неуязвимость, монеты ×2, муха съедается и лечит
+  d.startTower(1); d.state = 'play'; assert.strictEqual(d.tryActivatePower(), false, 'пустая шкала'); d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower()); assert.ok(d.isBerserk());
   assert.strictEqual(d.damage(1, 'oil', ball.x, ball.y), false, 'в берсерке урона нет'); assert.strictEqual(d.coinsFor('ketchup'), 2);
   d.spawnFly(true); d.flies[0].warnT = 0; d.flies[0].x = ball.x; d.flies[0].y = ball.y; ball.mass = 2; d.update(0.016);
   assert.strictEqual(d.flies.length, 0); assert.strictEqual(ball.mass, 3, 'муха съедена: +1 масса');
@@ -74,7 +87,7 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   // берсерк: сковородка не жжёт — ни урона, ни подброса
   d.startTower(3); d.state = 'play'; d.hazards.length = 0; for (const it of d.items) it.dead = true;
   const pan2 = d.platforms.find(p => p.type === 'pan'); dropOn(pan2); assert.ok(untilOn(pan2.id));
-  for (let i = 0; i < 12; i++) d.streakAdd(1); assert.ok(d.isBerserk());
+  d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower());
   { const m0 = ball.mass; steps(190); // 3.04 с — дольше таймера сковородки башни 3 (1.85 с) и короче берсерка (6 с)
     assert.strictEqual(ball.mass, m0, 'в берсерке масса на сковородке не меняется'); assert.strictEqual(ball.onPlatform, pan2.id, 'и подброса нет'); }
   // лопасти снимают один кусок, как любая опасность; в неуязвимости — ничего (спека v2.1.1 §7.1)
@@ -84,8 +97,11 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   const inBlades = () => { ball.x = bl.x; ball.y = bl.y; ball.onPlatform = null; ball.vy = 0; d.setCamY(bl.y - 400); };
   d.run.invuln = 1.5; inBlades(); d.update(0.016); assert.strictEqual(ball.mass, 4, 'в неуязвимости лопасти не ранят');
   d.run.invuln = 0; inBlades(); d.update(0.016); assert.strictEqual(d.state, 'play', 'лопасти не убивают сразу'); assert.strictEqual(ball.mass, 3, 'снят один кусок');
-  // «Продолжить»: серия и берсерк смерть не переживают
-  d.startTower(1); d.state = 'play'; d.streakAdd(5); assert.strictEqual(d.streak.n, 5);
-  d.die('fall'); d.continueRun(); assert.strictEqual(d.streak.n, 0, 'серия обнулена');
+  // «Продолжить»: шкала и потраченный берсерк смерть переживают, берсерк и серия для мух — нет; «Заново» обнуляет всё
+  d.startTower(1); d.state = 'play'; d.powerAdd(10); d.flyStreakAdd(5);
+  d.die('fall'); d.continueRun(); assert.strictEqual(d.power.flyStreak, 0, 'серия для мух обнулена'); assert.strictEqual(d.power.v, 10, 'шкала пережила смерть');
+  d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower()); d.die('fall'); assert.ok(!d.isBerserk(), 'смерть заканчивает берсерк');
+  d.continueRun(); assert.strictEqual(d.power.used, 1, 'смерть не возвращает берсерк'); d.powerAdd(d.POWER_FULL); assert.strictEqual(d.power.v, 0, 'лимит исчерпан — шкала не копится');
+  d.restartTower(); assert.strictEqual(d.power.used, 0); assert.strictEqual(d.power.v, 0, '«Заново» обнуляет шкалу');
   console.log('test_game ok');
 })().catch(e => { console.error(e); process.exit(1); });
````

- Правка `tools/test_hazards.js`:

````diff
diff --git a/tools/test_hazards.js b/tools/test_hazards.js
--- a/tools/test_hazards.js
+++ b/tools/test_hazards.js
@@ -24,7 +24,8 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   // политика влёта: лень 3 с — всегда; берсерк — никогда; лимит 3; серия < 6 — никогда; серия ≥ 6 — по вероятности
   d.resetFlies(); assert.strictEqual(d.flyWanted(0.016, 0, 3.1, false), true); assert.strictEqual(d.flyWanted(0.016, 20, 3.1, true), false);
   assert.strictEqual(d.flyWanted(0.016, 0, 0, false), false); assert.strictEqual(d.flyWanted(0.016, 5, 0, false), false);
-  const rnd0 = Math.random; Math.random = () => 0; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), true); Math.random = () => 0.999; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), false); Math.random = rnd0;
+  const rnd0 = Math.random; Math.random = () => 0; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), true); Math.random = () => 0.999; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), false);
+  Math.random = () => 0.002; assert.strictEqual(d.flyWanted(0.016, 6, 0, false, false), false); assert.strictEqual(d.flyWanted(0.016, 6, 0, false, true), true, 'полная шкала удваивает шанс мухи'); Math.random = rnd0;
   d.spawnFly(); d.spawnFly(); d.spawnFly(); assert.strictEqual(d.flyWanted(0.016, 0, 9, false), false, 'не больше FLY_MAX'); d.resetFlies();
   // масло: капля раз в OIL_T, падает вниз, шлёпается на floorY; попадание — hit
   const oil = { id: 1, type: 'oil', x: 240, y: -640, floorY: -500, t: 0, drops: [] };
````

- Создать `tools/test_power.js` целиком:

````js
// node tools/test_power.js — суперсила: очки и «Кураж», удар и «Стойкость», лимит и «Запал», активация, берсерк и «Аппетит»
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); const p = d.power;
  d.resetPower(); assert.strictEqual(d.POWER_FULL, 30); assert.strictEqual(d.berserkLimit(), 1); assert.strictEqual(d.berserkDur(), 6);
  assert.ok(!d.isBerserk() && !d.powerReady() && !d.powerSpent());
  // очки копятся до полной шкалы; 'ready' ровно один раз, выше полной шкала не растёт
  for (let i = 0; i < 29; i++) assert.strictEqual(d.powerAdd(1), null);
  assert.strictEqual(d.powerAdd(1), 'ready'); assert.ok(d.powerReady()); assert.strictEqual(d.powerAdd(3), null); assert.strictEqual(p.v, 30);
  // активация: берсерк, шкала пустая, лимит один — второй раз нельзя, очки больше не идут
  assert.ok(d.activatePower()); assert.ok(d.isBerserk()); assert.strictEqual(p.v, 0); assert.strictEqual(p.used, 1); assert.ok(!d.activatePower(), 'второй раз нельзя');
  assert.strictEqual(d.powerAdd(5), null); assert.strictEqual(p.v, 0, 'в берсерке шкала не копится');
  let end = null; for (let i = 0; i < 400 && !end; i++) end = d.updatePower(0.016); assert.strictEqual(end, 'berserkEnd'); assert.ok(!d.isBerserk());
  assert.ok(d.powerSpent(), 'лимит на башню исчерпан'); d.powerAdd(30); assert.strictEqual(p.v, 0, 'после лимита очки не начисляются'); assert.ok(!d.powerReady());
  // «Запал» добавляет берсерк на башню, потолок 2
  d.save.up.fury = 1; assert.strictEqual(d.berserkLimit(), 2); assert.ok(!d.powerSpent()); assert.strictEqual(d.powerAdd(30), 'ready'); assert.ok(d.activatePower()); assert.strictEqual(p.used, 2);
  d.endBerserk(); assert.ok(d.powerSpent()); d.save.up.fury = 9; assert.strictEqual(d.berserkLimit(), 3, 'потолок «Запала» — 2'); d.save.up.fury = 0;
  // удар отнимает четверть полной шкалы, «Стойкость» — половину и четверть от этого; серия для мух обнуляется
  d.resetPower(); d.powerAdd(20); d.flyStreakAdd(7); d.powerHit(); assert.strictEqual(p.v, 12.5); assert.strictEqual(p.flyStreak, 0);
  d.save.up.grit = 1; d.powerHit(); assert.strictEqual(p.v, 8.75); d.save.up.grit = 2; d.powerHit(); assert.strictEqual(p.v, 6.875); d.save.up.grit = 0;
  d.resetPower(); d.powerHit(); assert.strictEqual(p.v, 0, 'не ниже нуля');
  // «Кураж» ускоряет зарядку: +15 % за уровень, потолок 2
  d.resetPower(); d.save.up.nerve = 2; d.powerAdd(10); assert.ok(Math.abs(p.v - 13) < 1e-9); d.save.up.nerve = 5; d.powerAdd(10); assert.ok(Math.abs(p.v - 26) < 1e-9, 'выше потолка не быстрее'); d.save.up.nerve = 0;
  // «Аппетит» удлиняет берсерк; смерть его заканчивает
  d.save.up.appetite = 4; assert.strictEqual(d.berserkDur(), 8); d.save.up.appetite = 0;
  d.resetPower(); d.powerAdd(30); d.activatePower(); d.flyStreakAdd(3); d.endBerserk(); assert.ok(!d.isBerserk()); assert.strictEqual(p.flyStreak, 0); assert.strictEqual(d.updatePower(0.016), null);
  console.log('test_power ok');
})().catch(e => { console.error(e); process.exit(1); });
````

- Правка `tools/test_render.js`:

````diff
diff --git a/tools/test_render.js b/tools/test_render.js
--- a/tools/test_render.js
+++ b/tools/test_render.js
@@ -25,9 +25,11 @@ const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(St
   // титул: башня, тема, кнопка «Играть»; с чекпоинтом — строка чекпоинта
   texts.length = 0; d.state = 'title'; d.titleScreen(); assert.ok(texts.includes('Башня 1') && texts.includes('Кухня')); assert.deepStrictEqual(d.buttons.map(b => b.id), ['play']);
   d.save.cp = 1; texts.length = 0; d.titleScreen(); assert.ok(texts.includes('Чекпоинт 1')); d.save.cp = 0;
-  // HUD: серия, монеты, башня; в берсерке — «Берсерк!»
-  d.state = 'play'; d.setRunCoins(12); d.streakAdd(4); texts.length = 0; d.drawHUD(); assert.ok(texts.includes('Серия 4') && texts.includes('● 12') && texts.includes('Башня 1'));
-  for (let i = 0; i < 8; i++) d.streakAdd(1); texts.length = 0; d.drawHUD(); assert.ok(texts.includes('Берсерк!'));
+  // HUD: шкала силы, монеты, башня; панели серии и иконок массы нет; при лимите больше одного — остаток берсерков
+  d.state = 'play'; d.setRunCoins(12); d.powerAdd(12); texts.length = 0; d.drawHUD(); assert.ok(texts.includes('● 12') && texts.includes('Башня 1'));
+  assert.ok(!texts.some(t => /Серия|Streak/.test(t)), 'панели серии нет'); assert.ok(!texts.some(t => t.startsWith('×')), 'при лимите 1 число не пишется');
+  d.powerAdd(d.POWER_FULL); d.drawWorld(); d.drawHUD(); d.tryActivatePower(); d.drawWorld(); d.drawHUD(); // полная шкала и берсерк рисуются
+  d.startTower(1); d.state = 'play'; d.save.up.fury = 1; texts.length = 0; d.drawHUD(); assert.ok(texts.includes('×2'), 'остаток берсерков'); d.save.up.fury = 0;
   // смерть: причина, кнопки по флагам
   d.startTower(1); d.state = 'play'; d.die('blades'); d.deadScreen(false); assert.strictEqual(d.buttons.length, 0, 'до 0.6 с кнопок нет');
   texts.length = 0; d.deadScreen(true); assert.ok(texts.includes('Шлёп!') && texts.includes('Лопасти')); assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'restart']);
````

- Правка `tools/test_save.js`:

````diff
diff --git a/tools/test_save.js b/tools/test_save.js
--- a/tools/test_save.js
+++ b/tools/test_save.js
@@ -4,7 +4,7 @@ const noop = () => {};
 const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
 (async () => {
   const g = require('./_env')(ctx); const d = g.dbg();
-  const up0 = { meat: 0, crust: 0, appetite: 0, spice: 0, nerve: 0, grit: 0, repel: 0, charge: 0 };
+  const up0 = { meat: 0, crust: 0, appetite: 0, spice: 0, nerve: 0, grit: 0, repel: 0, charge: 0, fury: 0 };
   // мусор и старые версии
   assert.deepStrictEqual(d.migrate(null), { v: 4, earned: 0, spent: 0, up: up0, skins: [], skin: 'none', tower: 1, log: {}, cp: 0 });
   assert.deepStrictEqual(d.migrate({ v: 1, best: 300, coins: 77 }).earned, 77);
@@ -12,8 +12,8 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   assert.strictEqual(m3.earned, 500); assert.strictEqual(m3.spent, 0, 'потраченное на старые апгрейды возвращается'); assert.deepStrictEqual(m3.up, up0);
   assert.strictEqual(m3.skin, 'crown'); assert.strictEqual(m3.tower, 1); assert.deepStrictEqual(m3.log, {}); assert.strictEqual(m3.best, undefined);
   // v4: потолки, мусор в log и skins, cp
-  const m4 = d.migrate({ v: 4, earned: 900, spent: 1000, up: { meat: 30, nerve: 9, grit: -1, repel: 99, charge: 7, bogus: 3 }, skins: ['chef', 'nope', 'none'], skin: 'bow', tower: 3, log: { 1: { r: 'S', t: 90 }, 2: { r: 'X', t: 1 }, zz: { r: 'A', t: 5 } }, cp: 2 });
-  assert.strictEqual(m4.spent, 900, 'spent не больше earned'); assert.deepStrictEqual(m4.up, { meat: 30, crust: 0, appetite: 0, spice: 0, nerve: 2, grit: 0, repel: 15, charge: 3 });
+  const m4 = d.migrate({ v: 4, earned: 900, spent: 1000, up: { meat: 30, nerve: 9, grit: -1, repel: 99, charge: 7, fury: 5, bogus: 3 }, skins: ['chef', 'nope', 'none'], skin: 'bow', tower: 3, log: { 1: { r: 'S', t: 90 }, 2: { r: 'X', t: 1 }, zz: { r: 'A', t: 5 } }, cp: 2 });
+  assert.strictEqual(m4.spent, 900, 'spent не больше earned'); assert.deepStrictEqual(m4.up, { meat: 30, crust: 0, appetite: 0, spice: 0, nerve: 2, grit: 0, repel: 15, charge: 3, fury: 2 });
   assert.deepStrictEqual(m4.skins, ['chef']); assert.strictEqual(m4.skin, 'bow'); assert.strictEqual(m4.tower, 3); assert.deepStrictEqual(m4.log, { 1: { r: 'S', t: 90 } }); assert.strictEqual(m4.cp, 2);
   // слияние
   const a = d.migrate({ v: 4, earned: 100, spent: 40, up: { meat: 2 }, skins: ['chef'], skin: 'chef', tower: 4, log: { 1: { r: 'A', t: 100 }, 2: { r: 'S', t: 80 } }, cp: 1 });
````

- Удалить `tools/test_streak.js`: `git rm tools/test_streak.js`.

- [ ] **Шаг 2. Убедиться, что тесты падают**

Run: `npm test`

Expected: FAIL. `test_save` падает первым после `test_sdk ok`: `AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal` (в `up` нет ключа `fury`).

- [ ] **Шаг 3. Реализация**

- Правка `index.html`:

````diff
diff --git a/index.html b/index.html
--- a/index.html
+++ b/index.html
@@ -24,7 +24,7 @@
 <script src="src/tower.js"></script>
 <script src="src/platforms.js"></script>
 <script src="src/hazards.js"></script>
-<script src="src/streak.js"></script>
+<script src="src/power.js"></script>
 <script src="src/game.js"></script>
 <script src="src/render.js"></script>
 <script src="src/screens.js"></script>
````

- Правка `src/game.js`:

````diff
diff --git a/src/game.js b/src/game.js
--- a/src/game.js
+++ b/src/game.js
@@ -19,18 +19,19 @@ function heal(n) {
   if (ball.mass > m0) { ball.healT = HEAL_T; burst(ball.x, ball.y - ball.r * 0.5, '#ffe08a', 10, 160, 0.5, 3); } // укус зарастает на Тефе
   return ball.mass - m0;
 }
-function newRun() { return { time: 0, runCoins: 0, bankedCoins: 0, deaths: 0, usedContinue: 0, usedDouble: false, foodEaten: 0, foodTotal: 0, cp: 0, lastLandId: 0, campT: 0, flyCd: 0, invuln: 0, reason: '', rating: null, bonus: 0, progress: 0, finished: false }; }
+// visited — id платформ, на которые Тефа уже садилась в этом забеге: шкала растёт только за первую посадку (спека v2.1.1 §4.1)
+function newRun() { return { time: 0, runCoins: 0, bankedCoins: 0, deaths: 0, usedContinue: 0, usedDouble: false, foodEaten: 0, foodTotal: 0, cp: 0, lastLandId: 0, visited: new Set(), campT: 0, flyCd: 0, invuln: 0, reason: '', rating: null, bonus: 0, progress: 0, finished: false }; }
 function cpPlatform(k) { return tower.platforms.find(p => k ? p.cp === k : p.start) || tower.platforms[0]; }
 function placeAt(p) {
   ball.x = p.x; ball.y = p.y - ball.r; ball.vx = 0; ball.vy = 0; ball.onPlatform = p.id; ball.charges = chargesMax();
   ball.sq = 0; ball.sqv = 0; ball.tilt = 0; ball.tiltv = 0; ball.mouth = 0; ball.face = 0; ball.hot = 0; ball.alive = true;
-  run.lastLandId = p.id; run.campT = 0; run.invuln = 0;
+  run.lastLandId = p.id; run.visited.add(p.id); run.campT = 0; run.invuln = 0;
 }
 // башня N с нуля; fromCp > 0 — старт с чекпоинта сохранения (новая сессия: считается одной смертью)
 function startTower(N, fromCp = 0) {
   tower = buildTower(N); run = newRun(); run.foodTotal = tower.items.length;
   if (fromCp && !tower.platforms.some(p => p.cp === fromCp)) fromCp = 0; // битый чекпоинт из сохранения
-  resetStreak(); resetFlies(); resetFx();
+  resetPower(); resetFlies(); resetFx();
   ball.mass = massMax(); ball.r = radiusFor(ball.mass);
   run.cp = fromCp; if (fromCp) run.deaths = 1;
   placeAt(cpPlatform(fromCp));
@@ -46,21 +47,28 @@ function jumpTo(tx, ty) {
   return true;
 }
 function coinsFor(kind) { return Math.round(FOOD_KINDS[kind].coins * tower.tp.coinMul * (1 + 0.05 * ((save.up && save.up.spice) || 0)) * (isBerserk() ? 2 : 1)); }
-function applyStreak(evn) {
-  if (evn === 'berserkStart') { camShake = 10; sfx.big(); popText(ball.x, ball.y - ball.r - 30, T('berserk'), '#ffe08a', true); }
-  else if (evn === 'berserkEnd') pulse(-80);
+let tapHintShown = false; // подсказка «Тапни по Тефе!» — один раз за сессию
+function onPower(ev) { // события суперсилы: шкала полна, берсерк кончился
+  if (ev === 'ready') { tone(520, 880, 0.18, 'triangle', 0.16); if (!tapHintShown) { tapHintShown = true; popText(ball.x, ball.y - ball.r - 50, T('tapTefa'), '#ffe08a', true); } }
+  else if (ev === 'berserkEnd') pulse(-80);
+}
+// суперсила по тапу на Тефу или клавише E (спека v2.1.1 §3.4): только при полной шкале и неисчерпанном лимите
+function tryActivatePower() {
+  if (!ball.alive || state !== 'play' || !activatePower()) return false;
+  camShake = 10; sfx.big(); popText(ball.x, ball.y - ball.r - 30, T('berserk'), '#ffe08a', true);
+  return true;
 }
 function eat(it) {
   it.dead = true; run.foodEaten++;
   const gain = coinsFor(it.kind); run.runCoins += gain;
   ball.mouth = 1; pulse(140);
   burst(it.x, it.y, FOOD_COLOR[it.kind], 12, 260, 0.5, 5); popText(it.x, it.y - 20, '+' + gain, '#ffe08a', isBerserk());
-  sfx.eat(); applyStreak(streakAdd(1));
+  sfx.eat(); onPower(powerAdd(ball.onPlatform === null ? 2 : 1)); flyStreakAdd(1); // еда, пойманная в полёте, заряжает вдвое
 }
 // урон n кусков с точки (fx, fy); false — урон не прошёл (неуязвимость, берсерк, god)
 function damage(n, reason, fx, fy) {
   if (god || run.invuln > 0 || isBerserk() || !ball.alive) return false;
-  ball.mass -= n; streakHit(); run.invuln = INVULN_HIT;
+  ball.mass -= n; powerHit(); run.invuln = INVULN_HIT;
   loseMeat(fx, fy, n * 2); jolt(fx, fy, 260); camShake = 10; sfx.hit();
   ball.vy = Math.min(ball.vy, -260); ball.vx = (ball.x < fx ? -1 : 1) * 200; ball.onPlatform = null;
   if (ball.mass <= 0) { ball.mass = 0; die(reason); } else popText(ball.x, ball.y - ball.r - 10, T('die.' + reason), '#ff7a6b', true);
@@ -69,7 +77,7 @@ function damage(n, reason, fx, fy) {
 function bank() { save.earned += run.runCoins - run.bankedCoins; run.bankedCoins = run.runCoins; }
 function die(reason) {
   if (!ball.alive || god) return;
-  ball.alive = false; state = 'dead'; run.reason = reason; run.deaths++; tGame = 0;
+  ball.alive = false; state = 'dead'; run.reason = reason; run.deaths++; tGame = 0; endBerserk();
   sfx.die(); camShake = 16; burst(ball.x, ball.y, '#b9542f', 40, 380, 0.9, 6);
   bank(); persist(); YG.gameplayStop();
 }
@@ -77,12 +85,12 @@ function die(reason) {
 function continueRun() {
   ball.mass = massMax(); ball.r = radiusFor(ball.mass); // масса и радиус до посадки: placeAt сажает Тефу по ball.r
   placeAt(platformById(tower.platforms, run.lastLandId) || cpPlatform(run.cp));
-  resetStreak(); resetFlies(); run.invuln = INVULN_CONT; run.usedContinue++; camShake = 0; tGame = 0; state = 'play'; // серия и берсерк смерть не переживают
+  endBerserk(); resetFlies(); run.invuln = INVULN_CONT; run.usedContinue++; camShake = 0; tGame = 0; state = 'play'; // шкала и потраченный берсерк смерть переживают, серия для мух — нет
 }
 // «С чекпоинта» бесплатно: смерти уже посчитаны в die(); капли масла и мухи сброшены
 function restartFromCp() {
   ball.mass = massMax(); ball.r = radiusFor(ball.mass); placeAt(cpPlatform(run.cp));
-  resetStreak(); resetFlies(); resetFx(); for (const h of tower.hazards) if (h.type === 'oil') h.drops = [];
+  endBerserk(); resetFlies(); resetFx(); for (const h of tower.hazards) if (h.type === 'oil') h.drops = [];
   camY = ball.y - H * 0.6; tGame = 0; state = 'play';
 }
 function restartTower() { startTower(tower.tp.N, 0); save.cp = 0; state = 'play'; } // чекпоинт сбрасывается вместе с башней; запишет ближайшая смерть или финиш
@@ -108,7 +116,8 @@ function reachCheckpoint(p) { run.cp = p.cp; save.cp = p.cp; heal(massMax()); pe
 function onLand(p, vy) {
   ball.charges = chargesMax();
   if (vy > 80) { squash(Math.min(vy, 900) * 0.5); crumbs(ball.x, ball.y + ball.r); }
-  if (p.id !== run.lastLandId) { run.lastLandId = p.id; applyStreak(streakAdd(1)); }
+  run.lastLandId = p.id;
+  if (!run.visited.has(p.id)) { run.visited.add(p.id); onPower(powerAdd(1)); flyStreakAdd(1); } // только первая посадка: прыжками туда-обратно шкалу не накрутить
   if (p.cp > run.cp) reachCheckpoint(p);
   if (p.roof) finishTower();
 }
@@ -131,10 +140,10 @@ function updateRun(dt) {
   const st = platformById(tower.platforms, ball.onPlatform);
   ball.hot = st && st.type === 'pan' ? clamp((st.hotT || 0) / panTime(tp), 0, 1) : Math.max(0, ball.hot - dt * 2);
   run.flyCd = Math.max(0, run.flyCd - dt);
-  if (run.flyCd <= 0 && flyWanted(dt, streak.n, run.campT, isBerserk())) { spawnFly(); run.flyCd = FLY_CD; run.campT = 0; }
+  if (run.flyCd <= 0 && flyWanted(dt, power.flyStreak, run.campT, isBerserk(), powerReady())) { spawnFly(); run.flyCd = FLY_CD; run.campT = 0; }
   for (const e of updateHazards(dt, tower.hazards, { tp, berserk: isBerserk(), invuln: run.invuln })) {
     if (e.type === 'hit') damage(1, e.reason, e.x, e.y); // каждая опасность снимает один кусок; сразу убивает только падение
-    else if (e.type === 'flyGaveUp') { applyStreak(streakAdd(3)); popText(e.h.x, e.h.y, T('flyGone'), 'rgba(255,255,255,0.7)'); }
+    else if (e.type === 'flyGaveUp') { onPower(powerAdd(3)); flyStreakAdd(3); popText(e.h.x, e.h.y, T('flyGone'), 'rgba(255,255,255,0.7)'); }
     else if (e.type === 'eaten') { const gain = coinsFor('meat'); run.runCoins += gain; heal(1); burst(e.x, e.y, e.what === 'fly' ? '#2b2b2b' : '#ff9a2a', 10, 200, 0.4, 3); popText(e.x, e.y, '+' + gain, '#ffe08a', true); sfx.eat(); }
     else if (e.type === 'smash') { run.runCoins += 2; burst(e.x, e.y, '#ddd', 14, 300, 0.5, 4); sfx.hit(); }
     if (!ball.alive) return;
@@ -145,7 +154,7 @@ function updateRun(dt) {
     const dx = it.x - ball.x, dy = it.y - ball.y;
     if (dx * dx + dy * dy < (it.r + ball.r * 0.92) ** 2) eat(it);
   }
-  const se = updateStreak(dt); if (se) applyStreak(se);
+  const pe = updatePower(dt); if (pe) onPower(pe);
   const target = ball.y - H * 0.6; if (target < camY) camY = lerp(camY, target, 1 - Math.pow(0.001, dt)); // камера только вверх
   run.progress = Math.max(run.progress, clamp(-ball.y / tp.height, 0, 1));
   if (ball.y - ball.r > camY + H + 40) { if (god) placeAt(platformById(tower.platforms, run.lastLandId) || cpPlatform(run.cp)); else { die('fall'); return; } }
@@ -164,5 +173,5 @@ expose({
   get state() { return state; }, set state(v) { state = v; }, get tower() { return tower; }, get run() { return run; }, get camY() { return camY; },
   get platforms() { return tower ? tower.platforms : []; }, get hazards() { return tower ? tower.hazards : []; }, get items() { return tower ? tower.items : []; },
   setRunCoins(n) { run.runCoins = n; }, setGod(v) { god = !!v; }, setCamY(v) { camY = v; }, massMax, chargesMax, coinsFor, heal,
-  startTower, jumpTo, damage, die, continueRun, restartFromCp, restartTower, nextTower, finishTower, doubleCoins, ratingFor, bonusCoins, update,
+  startTower, jumpTo, tryActivatePower, damage, die, continueRun, restartFromCp, restartTower, nextTower, finishTower, doubleCoins, ratingFor, bonusCoins, update,
 });
````

- Правка `src/hazards.js`:

````diff
diff --git a/src/hazards.js b/src/hazards.js
--- a/src/hazards.js
+++ b/src/hazards.js
@@ -11,11 +11,12 @@ function spawnFly(fromLeft) {
   flies.push({ type: 'fly', x: left ? -30 : W + 30, y: ball.y - 100, side: left ? -1 : 1, warnT: FLY_WARN, chaseT: 0, phase: Math.random() * 6.28, gone: false });
 }
 function resetFlies() { flies = []; }
-// политика влёта (спека §4.3): лень — гарантированно; высокая серия — по шансу; берсерк и лимит — никогда
-function flyWanted(dt, streakN, campT, berserk) {
+// политика влёта (спека v2.1.1 §4.4): лень — гарантированно; скрытая серия ≥ 6 — по шансу, полная шкала (doubled) его удваивает;
+// берсерк и лимит — никогда
+function flyWanted(dt, streakN, campT, berserk, doubled) {
   if (berserk || flies.length >= FLY_MAX) return false;
   if (campT >= CAMP_T) return true;
-  if (streakN >= 6) return Math.random() < dt * Math.min(0.4, 0.08 + 0.02 * (streakN - 6));
+  if (streakN >= 6) return Math.random() < dt * Math.min(0.4, 0.08 + 0.02 * (streakN - 6)) * (doubled ? 2 : 1);
   return false;
 }
 function knifePhase(t) { // t → { phase, k } где k — 0..1 внутри фазы
````

- Правка `src/i18n.js`:

````diff
diff --git a/src/i18n.js b/src/i18n.js
--- a/src/i18n.js
+++ b/src/i18n.js
@@ -3,32 +3,32 @@
 const STR = {
   ru: {
     title: 'Тефтеля', tower: 'Башня', play: 'Играть', 'theme.kitchen': 'Кухня', roof: 'Крыша',
-    hint1: 'Тап — прыжок в точку тапа.', hint2: 'На платформах заряды прыжка возвращаются.', hint3: 'Сковородка жжёт, мухи кусают, лопасти убивают.',
+    hint1: 'Тап — прыжок в точку тапа.', hint2: 'Еда заряжает силу. Полная шкала — тапни по Тефе.', hint3: 'Сковородка жжёт, мухи кусают, лопасти убивают.',
     fell: 'Шлёп!', runCoins: 'Собрано за забег', total: 'Всего',
     continueAd: 'Продолжить', doubleAd: 'Монеты ×2', forAd: 'за рекламу', fromCp: 'С чекпоинта', restart: 'Заново', next: 'Следующая башня',
     paused: 'Пауза', tapToContinue: 'Тапни, чтобы продолжить', adStub: 'Реклама (заглушка)', loading: 'Загрузка…',
     towerDone: 'Башня {n} пройдена!', rating: 'Рейтинг', 'chk.noDeath': 'Без смертей', 'chk.time': 'Время', 'chk.food': 'Еда', bonus: 'Награда',
-    streak: 'Серия', berserk: 'Берсерк!', checkpoint: 'Чекпоинт {n}', floorMark: 'Этаж {n}', flyGone: 'отстала',
+    tapTefa: 'Тапни по Тефе!', berserk: 'Берсерк!', checkpoint: 'Чекпоинт {n}', floorMark: 'Этаж {n}', flyGone: 'отстала',
     'die.fall': 'В пропасть!', 'die.fly': 'Укус мухи', 'die.blades': 'Лопасти', 'die.pan': 'Ожог на сковородке', 'die.oil': 'Горячее масло', 'die.knife': 'Нож',
   },
   en: {
     title: 'Meatball', tower: 'Tower', play: 'Play', 'theme.kitchen': 'Kitchen', roof: 'Roof',
-    hint1: 'Tap where you want to land.', hint2: 'Landing on a platform refills jump charges.', hint3: 'Pans burn, flies bite, blades kill.',
+    hint1: 'Tap where you want to land.', hint2: 'Food charges your power. Full bar — tap Tefa.', hint3: 'Pans burn, flies bite, blades kill.',
     fell: 'Splat!', runCoins: 'Coins this run', total: 'Total',
     continueAd: 'Continue', doubleAd: 'Coins ×2', forAd: 'watch ad', fromCp: 'From checkpoint', restart: 'Restart', next: 'Next tower',
     paused: 'Paused', tapToContinue: 'Tap to continue', adStub: 'Ad (stub)', loading: 'Loading…',
     towerDone: 'Tower {n} cleared!', rating: 'Rating', 'chk.noDeath': 'No deaths', 'chk.time': 'Time', 'chk.food': 'Food', bonus: 'Reward',
-    streak: 'Streak', berserk: 'Berserk!', checkpoint: 'Checkpoint {n}', floorMark: 'Floor {n}', flyGone: 'gave up',
+    tapTefa: 'Tap Tefa!', berserk: 'Berserk!', checkpoint: 'Checkpoint {n}', floorMark: 'Floor {n}', flyGone: 'gave up',
     'die.fall': 'Into the void!', 'die.fly': 'Fly bite', 'die.blades': 'Blades', 'die.pan': 'Burnt on the pan', 'die.oil': 'Hot oil', 'die.knife': 'Knife',
   },
   tr: {
     title: 'Köfte', tower: 'Kule', play: 'Oyna', 'theme.kitchen': 'Mutfak', roof: 'Çatı',
-    hint1: 'İnmek istediğin yere dokun.', hint2: 'Platforma inince zıplama şarjları dolar.', hint3: 'Tava yakar, sinek ısırır, bıçaklar öldürür.',
+    hint1: 'İnmek istediğin yere dokun.', hint2: 'Yemek gücü doldurur. Çubuk dolunca Tefa\'ya dokun.', hint3: 'Tava yakar, sinek ısırır, bıçaklar öldürür.',
     fell: 'Pat!', runCoins: 'Bu turda toplanan', total: 'Toplam',
     continueAd: 'Devam et', doubleAd: 'Para ×2', forAd: 'reklam izle', fromCp: 'Kontrol noktasından', restart: 'Baştan', next: 'Sonraki kule',
     paused: 'Duraklatıldı', tapToContinue: 'Devam etmek için dokun', adStub: 'Reklam (taslak)', loading: 'Yükleniyor…',
     towerDone: 'Kule {n} geçildi!', rating: 'Derece', 'chk.noDeath': 'Ölümsüz', 'chk.time': 'Süre', 'chk.food': 'Yemek', bonus: 'Ödül',
-    streak: 'Seri', berserk: 'Çılgınlık!', checkpoint: 'Kontrol noktası {n}', floorMark: 'Kat {n}', flyGone: 'vazgeçti',
+    tapTefa: 'Tefa\'ya dokun!', berserk: 'Çılgınlık!', checkpoint: 'Kontrol noktası {n}', floorMark: 'Kat {n}', flyGone: 'vazgeçti',
     'die.fall': 'Boşluğa!', 'die.fly': 'Sinek ısırığı', 'die.blades': 'Bıçaklar', 'die.pan': 'Tavada yanık', 'die.oil': 'Kızgın yağ', 'die.knife': 'Bıçak',
   },
 };
````

- Правка `src/main.js`:

````diff
diff --git a/src/main.js b/src/main.js
--- a/src/main.js
+++ b/src/main.js
@@ -1,6 +1,7 @@
 'use strict';
 // ---------- точка входа: загрузка, ввод, пауза, реклама между забегами, цикл ----------
 const AD_INTERVAL = 180; // секунд между межстраничными показами — свой лимит поверх лимитов Яндекса
+const TAP_TEFA_K = 1.3;   // тап ближе 1.3·r к центру Тефы попадает «по Тефе»: ≈ 1.1 видимого радиуса (тело шире коллизии в 1.25 раза)
 let booted = false, paused = false, awaitTap = false, adBusy = false;
 let plays = 0, lastAdAt = 0, sessionT = 0; // lastAdAt = 0: первые AD_INTERVAL секунд сессии без межстраничной — осознанная отсрочка
 async function boot() {
@@ -56,7 +57,12 @@ function onTap(x, y) {
   if (!booted || adBusy || paused) return;
   audio();
   if (awaitTap) { awaitTap = false; YG.gameplayStart(); return; } // первый тап после паузы — не прыжок
-  if (state === 'play') { if (ball.alive) jumpTo(clamp(x, 0, W), y + camY); return; } // тап по боковой зоне = у края поля
+  if (state === 'play') { // тап по Тефе при полной шкале — суперсила, иначе прыжок в точку (тап по боковой зоне = у края поля)
+    if (!ball.alive) return;
+    const wx = clamp(x, 0, W), wy = y + camY;
+    if (powerReady() && Math.hypot(wx - ball.x, wy - ball.y) <= Math.max(30, TAP_TEFA_K * ball.r)) { tryActivatePower(); return; }
+    jumpTo(wx, wy); return;
+  }
   if (state !== 'title' && tGame < 0.6) return;
   const b = hitButton(x, y); if (!b) return;
   if (b.id === 'play') goPlay('start');
@@ -71,12 +77,12 @@ cv.addEventListener('contextmenu', e => e.preventDefault());
 window.addEventListener('keydown', e => {
   if (e.repeat) return;
   const left = e.code === 'ArrowLeft' || e.code === 'KeyA', right = e.code === 'ArrowRight' || e.code === 'KeyD';
-  const up = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter';
-  if (!left && !right && !up) return;
+  const up = e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter', act = e.code === 'KeyE';
+  if (!left && !right && !up && !act) return;
   e.preventDefault();
   if (!booted || adBusy || paused) return;
   if (awaitTap) { onTap(W / 2, H / 2); return; }
-  if (state === 'play') { if (ball.alive) jumpTo(left ? ball.x - 170 : right ? ball.x + 170 : ball.x, ball.y - (up ? 300 : 150)); return; }
+  if (state === 'play') { if (!ball.alive) return; if (act) { tryActivatePower(); return; } jumpTo(left ? ball.x - 170 : right ? ball.x + 170 : ball.x, ball.y - (up ? 300 : 150)); return; } // E — суперсила
   if (up) { const id = state === 'title' ? 'play' : state === 'dead' ? (run.cp > 0 ? 'cp' : 'restart') : 'next'; const b = buttons.find(b => b.id === id); if (b) onTap(b.x, b.y); }
 });
 // --- кадр ---
````

- Создать `src/power.js` целиком:

````js
'use strict';
// ---------- суперсила: шкала за хорошую игру, берсерк по тапу, лимит на башню; скрытая серия для мух ----------
// Спека v2.1.1 §4. Состояние живёт только здесь; game.js сообщает события забега и применяет последствия.
const POWER_FULL = 30;                          // очков в полной шкале (черновик)
const POWER_HIT_LOSS = [0.25, 0.125, 0.0625];   // доля полной шкалы, которую отнимает удар, по уровню «Стойкости»
const BERSERK_T = 6;                            // базовая длительность берсерка, с
// v — очки шкалы, used — берсерков за башню, berserkT — остаток берсерка, flyStreak — скрытая серия для мух (§4.4)
const power = { v: 0, used: 0, berserkT: 0, flyStreak: 0 };
const _lvl = (k, max) => Math.min(max, (save.up && save.up[k]) || 0);
function berserkLimit() { return 1 + _lvl('fury', 2); }                                  // «Запал»: +1 берсерк на башню
function berserkDur() { return BERSERK_T + 0.5 * ((save.up && save.up.appetite) || 0); } // «Аппетит» без потолка
function isBerserk() { return power.berserkT > 0; }
function powerSpent() { return power.used >= berserkLimit(); }                          // лимит на башню исчерпан — шкала серая
function powerReady() { return !isBerserk() && !powerSpent() && power.v >= POWER_FULL; }
function resetPower() { power.v = 0; power.used = 0; power.berserkT = 0; power.flyStreak = 0; } // «Заново» и новая башня
// +pts к шкале с учётом «Куража» (+15 % за уровень); возвращает 'ready', когда шкала только что стала полной
function powerAdd(pts) {
  if (isBerserk() || powerSpent() || power.v >= POWER_FULL) return null;
  power.v = Math.min(POWER_FULL, power.v + pts * (1 + 0.15 * _lvl('nerve', 2)));
  return power.v >= POWER_FULL ? 'ready' : null;
}
function powerHit() { power.v = Math.max(0, power.v - POWER_FULL * POWER_HIT_LOSS[_lvl('grit', 2)]); power.flyStreak = 0; }
function flyStreakAdd(k) { power.flyStreak += k; }
function activatePower() { if (!powerReady()) return false; power.v = 0; power.used++; power.berserkT = berserkDur(); return true; }
function endBerserk() { power.berserkT = 0; power.flyStreak = 0; } // смерть заканчивает берсерк и сбивает серию для мух
function updatePower(dt) {
  if (!isBerserk()) return null;
  power.berserkT -= dt;
  if (power.berserkT <= 0) { power.berserkT = 0; return 'berserkEnd'; }
  return null;
}
expose({ power, POWER_FULL, POWER_HIT_LOSS, BERSERK_T, berserkLimit, berserkDur, isBerserk, powerSpent, powerReady, resetPower,
  powerAdd, powerHit, flyStreakAdd, activatePower, endBerserk, updatePower });
````

- Правка `src/render.js`:

````diff
diff --git a/src/render.js b/src/render.js
--- a/src/render.js
+++ b/src/render.js
@@ -110,24 +110,33 @@ function drawTefaBall() {
   if (st) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, st.y - camY + 6, r * 0.9, 8, 0, 0, 7); ctx.fill(); } // тень на платформе
   const pose = { sx: 1 + ball.sq, sy: 1 - ball.sq, tilt: ball.tilt, face: ball.face, mouth: ball.mouth, blink: ball.blink > 0, hot: ball.hot, berserk: bz,
     alpha: run && run.invuln > 0 && Math.floor(tGame * 12) % 2 === 0 ? 0.45 : 1,
-    hp: { cur: ball.mass, max: massMax() },
+    hp: { cur: ball.mass, max: massMax() }, charged: powerReady(),
     tint: ball.mass === 1 ? 0.5 + 0.5 * Math.sin(tGame * Math.PI * 3) : 0, // последний кусок мигает ≈ 1.5 раза в секунду
     heal: ball.healT > 0 ? 1 - ball.healT / HEAL_T : 0 };
   drawTefa(ctx, x, y, r, pose);
   const cm = chargesMax(), top = y - r * 1.16 - 14 - (bz ? r * 0.55 : 0); // заряды над головой; в берсерке выше пламени
   for (let i = 0; i < cm; i++) { ctx.fillStyle = i < ball.charges ? '#f6c343' : 'rgba(255,255,255,0.2)'; ctx.beginPath(); ctx.arc(x - (cm - 1) * 7 + i * 14, top, 4, 0, 7); ctx.fill(); }
 }
-function drawHUD() {
-  const mm = massMax();
-  for (let i = 0; i < mm; i++) { // масса как здоровье
-    const x = 24 + i * 22, y = 34; ctx.fillStyle = i < ball.mass ? '#c0583a' : 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
-    if (i < ball.mass) { ctx.fillStyle = 'rgba(255,230,200,0.5)'; ctx.beginPath(); ctx.arc(x - 3, y - 3, 3, 0, 7); ctx.fill(); }
+// шкала суперсилы сверху слева (спека v2.1.1 §3.3): копится оранжевой, полна — золотая и пульсирует, в берсерке показывает
+// остаток его времени, исчерпана — серая; при лимите больше одного справа остаток берсерков
+function drawPowerMeter() {
+  const x = 40, y = 30, w = 140, h = 10, bz = isBerserk(), spent = powerSpent() && !bz, ready = powerReady();
+  ctx.save(); ctx.translate(22, y + 5); // значок-пламя
+  ctx.fillStyle = spent ? 'rgba(255,255,255,0.25)' : ready || bz ? '#ffe08a' : '#ff9a2a';
+  ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(9, -2, 6, 5); ctx.quadraticCurveTo(0, 10, -6, 5); ctx.quadraticCurveTo(-9, -2, 0, -11); ctx.fill();
+  ctx.restore();
+  ctx.fillStyle = 'rgba(255,255,255,0.15)'; rrect(x, y, w, h, 5); ctx.fill();
+  const frac = bz ? power.berserkT / berserkDur() : spent ? 0 : clamp(power.v / POWER_FULL, 0, 1);
+  if (frac > 0) {
+    ctx.save();
+    if (ready) { ctx.shadowColor = 'rgba(255,220,120,0.9)'; ctx.shadowBlur = 8 + 8 * (0.5 + 0.5 * Math.sin(tGame * 8)); }
+    ctx.fillStyle = bz ? '#ff7a2a' : ready ? '#ffe08a' : '#ff9a2a'; rrect(x, y, w * frac, h, 5); ctx.fill();
+    ctx.restore();
   }
-  const bz = isBerserk(), frac = bz ? streak.berserkT / berserkDur() : clamp(streak.n / berserkThreshold(), 0, 1); // серия / берсерк
-  ctx.fillStyle = 'rgba(255,255,255,0.15)'; rrect(16, 50, 150, 10, 5); ctx.fill();
-  if (frac > 0) { ctx.fillStyle = bz ? '#ffe08a' : '#8ff0a4'; rrect(16, 50, 150 * frac, 10, 5); ctx.fill(); }
-  ctx.fillStyle = '#fff'; ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'left';
-  ctx.fillText(bz ? T('berserk') : T('streak') + ' ' + streak.n, 16, 80);
+  if (berserkLimit() > 1) { ctx.fillStyle = '#fff'; ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('×' + (berserkLimit() - power.used), x + w + 8, y + 10); }
+}
+function drawHUD() { // жизни показывает сама Тефа; здесь шкала силы, монеты, номер башни и прогресс
+  drawPowerMeter();
   ctx.textAlign = 'right'; ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#ffe08a'; ctx.fillText('● ' + run.runCoins, W - 16, 40);
   ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '600 15px system-ui, sans-serif'; ctx.fillText(T('tower') + ' ' + tower.tp.N, W - 16, 64);
   const x = W - 14, y0 = 110, y1 = H - 110; // прогресс башни с отметками чекпоинтов
@@ -156,4 +165,4 @@ function drawWorld() { // всё внутри поля; вызывающий с
   }
   ctx.globalAlpha = 1;
 }
-expose({ drawBg, drawWorld, drawHUD, drawPlatform, drawHazard, drawFly });
+expose({ drawBg, drawWorld, drawHUD, drawPowerMeter, drawPlatform, drawHazard, drawFly });
````

- Правка `src/save.js`:

````diff
diff --git a/src/save.js b/src/save.js
--- a/src/save.js
+++ b/src/save.js
@@ -4,7 +4,8 @@
 // поэтому слияние «максимум/лучшее по полям» никогда не отнимает у игрока и не уводит баланс в минус.
 const SAVE_VERSION = 4;
 const SAVE_KEY = 'teft_save';
-const UP_MAX = { meat: null, crust: null, appetite: null, spice: null, nerve: 2, grit: 2, repel: 15, charge: 3 }; // null — без потолка (спека §6)
+// null — без потолка (спека v2 §6); nerve («Кураж») ускоряет зарядку шкалы, fury («Запал») — +1 берсерк на башню (спека v2.1.1 §4)
+const UP_MAX = { meat: null, crust: null, appetite: null, spice: null, nerve: 2, grit: 2, repel: 15, charge: 3, fury: 2 };
 const SKIN_ORDER = ['none', 'chef', 'glasses', 'crown', 'bow', 'mustache']; // порядок открытия скинов; каталог — v2.3
 const RANK = ['D', 'C', 'B', 'A', 'S'];
 const save = { v: SAVE_VERSION, earned: 0, spent: 0, up: _emptyUp(), skins: [], skin: 'none', tower: 1, log: {}, cp: 0 };
````

- Удалить `src/streak.js`: `git rm src/streak.js`.

- Правка `tools/shot.js`:

````diff
diff --git a/tools/shot.js b/tools/shot.js
--- a/tools/shot.js
+++ b/tools/shot.js
@@ -29,7 +29,7 @@ const hazards = async (g, d) => { await up(g, d, 18); d.spawnFly(true); d.flies[
   }
   for (const h of d.hazards) if (h.type === 'knife' && h !== kn) h.t = 1.8;
   steps(g, 8); };
-const berserk = async (g, d) => { await up(g, d, 4); for (let i = 0; i < 12; i++) d.streakAdd(1); d.spawnFly(false); d.flies[0].warnT = 0; d.flies[0].x = 380; d.flies[0].y = d.ball.y - 40; steps(g, 12); };
+const berserk = async (g, d) => { await up(g, d, 4); d.powerAdd(d.POWER_FULL); d.tryActivatePower(); d.spawnFly(false); d.flies[0].warnT = 0; d.flies[0].x = 380; d.flies[0].y = d.ball.y - 40; steps(g, 12); };
 const dead = async (g, d) => { await up(g, d, 3); d.setRunCoins(23); d.die('fly'); steps(g, 60); };
 const finish = async (g, d) => { d.state = 'play'; d.run.foodEaten = Math.round(d.run.foodTotal * 0.9); d.run.time = 80; d.setRunCoins(31); d.finishTower(); steps(g, 40); };
 (async () => {
````

- [ ] **Шаг 4. Убедиться, что всё зелёное**

Run: `npm test`

Expected: одиннадцать строк `… ok` (`test_core` … `test_render`, `smoke`), из шума только два блока `YaGames.init failed, using stub …` от `test_sdk`.

- [ ] **Шаг 5. Посмотреть снимки**

`npm run shot`:
  - `shots/play.png`: сверху слева значок и полоса шкалы, справа монеты и «Башня N», иконок массы и серии нет;
  - `shots/berserk.png`: берсерк включён тапом, Тефа в пламени стоит на платформе, не проваливаясь в неё.

Открыть PNG и посмотреть глазами, а не описывать код. Листы `shots/design_tefa_*.png` не перезаписывать.

- [ ] **Шаг 6. Коммит**

````bash
git rm src/streak.js tools/test_streak.js
git add index.html package.json src/game.js src/hazards.js src/i18n.js src/main.js src/power.js src/render.js src/save.js tools/shot.js tools/smoke.js tools/test_game.js tools/test_hazards.js tools/test_power.js tools/test_render.js tools/test_save.js
git commit -m "feat: суперсила — шкала сверху слева, берсерк по тапу на Тефу или E, лимит на башню" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
````

---

## Task 4. Масло льют сверху (спека §7.2)

Половники из уровня удаляются. Масло льют по расписанию сверху: под строками HUD появляется половник, 0.6 с мигает красный пунктир столба, падают четыре капли, на платформе остаётся шипящее пятно. Первый налив не раньше 5 с после старта и 4 с после чекпоинта. В берсерке капли съедаются, а пятна не жгут. Задача закрепляет тестами два случая налива из раздела «Review Focus».

**Files:**
- Modify: `src/game.js`
- Modify: `src/hazards.js`
- Modify: `src/i18n.js`
- Modify: `src/render.js`
- Modify: `src/tower.js`
- Test: `tools/smoke.js`
- Test: `tools/test_game.js`
- Test: `tools/test_hazards.js`
- Test: `tools/test_render.js`
- Test: `tools/test_tower.js`

**Interfaces:**
- Consumes: `heal(n)` и обработчик `eaten` из задачи 1, `isBerserk()` из задачи 3.
- Produces:
  - `hazards.js`, константы: `POUR_WARN = 0.6`, `POUR_DROPS = 4`, `POUR_GAP = 0.08`, `POUR_V = 700`, `DROP_R = 8`, `SPLAT_T = 1`, `SPLAT_W = 36`, `LADLE_Y = 110`.
  - `hazards.js`, функции: `pourInterval(N)`, `resetPours(delay)`, `delayPours(t)`, `startPour(x, extraWarn = 0)`.
  - `updatePours(dt, env)`, где `env = { tp, berserk, camY, platforms }`, → события `{ type: 'hit', reason: 'oil', x, y }` или `{ type: 'eaten', what: 'oil', x, y }`.
  - Геттеры DBG: `pours`, `drops`, `splats`.
  - `render.js`: `drawPours()`. `tower.js` без `OIL_T` и без масла в пуле опасностей.

- [ ] **Шаг 1. Тесты**

Внести правки тестов. Код игры в этом шаге не трогать.

- Правка `tools/smoke.js`:

````diff
diff --git a/tools/smoke.js b/tools/smoke.js
--- a/tools/smoke.js
+++ b/tools/smoke.js
@@ -77,7 +77,7 @@ async function runClimbNoGod() {
   const g = require('./_env')(ctx, { dist }); const d = g.dbg();
   await g.boot();
   const play = btn(d, 'play'); g.tap(play.x, play.y); await g.flush();
-  d.hazards.length = 0;                             // масло снято: проверяем путь генератора, а не уклонение от капель
+  d.hazards.length = 0; d.resetPours(1e9);         // опасности и масло сняты: проверяем путь генератора, а не уклонение
   const rnd0 = Math.random; Math.random = () => 1;  // муха по серии не влетает; тап каждый кадр — лени тоже нет
   for (let i = 0; i < 20000 && d.state === 'play'; i++) {
     const p = d.platforms.find(q => q.id === d.ball.onPlatform);
````

- Правка `tools/test_game.js`:

````diff
diff --git a/tools/test_game.js b/tools/test_game.js
--- a/tools/test_game.js
+++ b/tools/test_game.js
@@ -71,13 +71,16 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   assert.strictEqual(d.damage(1, 'oil', ball.x, ball.y), false, 'в берсерке урона нет'); assert.strictEqual(d.coinsFor('ketchup'), 2);
   d.spawnFly(true); d.flies[0].warnT = 0; d.flies[0].x = ball.x; d.flies[0].y = ball.y; ball.mass = 2; d.update(0.016);
   assert.strictEqual(d.flies.length, 0); assert.strictEqual(ball.mass, 3, 'муха съедена: +1 масса');
+  // масло: капля попадает — кусок; в берсерке съедена — кусок назад (спека v2.1.1 §5)
+  d.startTower(1); d.state = 'play'; d.resetPours(1e9); d.drops.push({ x: ball.x, y: ball.y - 5, dead: false }); d.update(0.016); assert.strictEqual(ball.mass, 3, 'капля ранит');
+  d.run.invuln = 0; d.powerAdd(d.POWER_FULL); d.tryActivatePower(); d.drops.push({ x: ball.x, y: ball.y - 5, dead: false }); d.update(0.016); assert.strictEqual(ball.mass, 4, 'в берсерке капля лечит');
   // лень: 3 с на платформе → муха прилетает
   d.startTower(1); d.state = 'play'; d.resetFlies(); steps(200); assert.strictEqual(d.flies.length, 1, 'муха за лень');
   // god-режим для smoke: урон и падение не убивают, Тефа возвращается на последнюю платформу
   d.startTower(1); d.state = 'play'; d.setGod(true); assert.strictEqual(d.damage(9, 'knife', 0, 0), false);
   ball.onPlatform = null; ball.y = d.camY + 2000; d.update(0.016); assert.strictEqual(d.state, 'play'); assert.strictEqual(ball.onPlatform, 0); d.setGod(false);
   // ожог сковородки: урон и подброс строго вверх, без бокового сноса
-  d.startTower(3); d.state = 'play'; d.hazards.length = 0; for (const it of d.items) it.dead = true; // масло и еда не должны мешать таймеру сковородки
+  d.startTower(3); d.state = 'play'; d.hazards.length = 0; d.resetPours(1e9); for (const it of d.items) it.dead = true; // опасности, масло и еда не должны мешать таймеру сковородки
   const pan = d.platforms.find(p => p.type === 'pan'); assert.ok(pan, 'в башне 3 есть сковородка');
   dropOn(pan); assert.ok(untilOn(pan.id), 'Тефа стоит на сковородке');
   { const m0 = ball.mass; let burned = false;
@@ -85,13 +88,13 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
     assert.ok(burned, 'сковородка сожгла'); assert.strictEqual(ball.vy, -700, 'подброс вверх');
     assert.strictEqual(ball.vx, 0, 'вбок не сносит'); assert.strictEqual(ball.onPlatform, null, 'сковородка отпустила'); }
   // берсерк: сковородка не жжёт — ни урона, ни подброса
-  d.startTower(3); d.state = 'play'; d.hazards.length = 0; for (const it of d.items) it.dead = true;
+  d.startTower(3); d.state = 'play'; d.hazards.length = 0; d.resetPours(1e9); for (const it of d.items) it.dead = true;
   const pan2 = d.platforms.find(p => p.type === 'pan'); dropOn(pan2); assert.ok(untilOn(pan2.id));
   d.powerAdd(d.POWER_FULL); assert.ok(d.tryActivatePower());
   { const m0 = ball.mass; steps(190); // 3.04 с — дольше таймера сковородки башни 3 (1.85 с) и короче берсерка (6 с)
     assert.strictEqual(ball.mass, m0, 'в берсерке масса на сковородке не меняется'); assert.strictEqual(ball.onPlatform, pan2.id, 'и подброса нет'); }
   // лопасти снимают один кусок, как любая опасность; в неуязвимости — ничего (спека v2.1.1 §7.1)
-  d.startTower(3); d.state = 'play'; for (const it of d.items) it.dead = true;
+  d.startTower(3); d.state = 'play'; d.resetPours(1e9); for (const it of d.items) it.dead = true;
   const bl = d.hazards.find(h => h.type === 'blades'); assert.ok(bl, 'в башне 3 есть лопасти');
   d.hazards.length = 0; d.hazards.push(bl); // остальные опасности убрать: проверяем только лопасти
   const inBlades = () => { ball.x = bl.x; ball.y = bl.y; ball.onPlatform = null; ball.vy = 0; d.setCamY(bl.y - 400); };
````

- Заменить `tools/test_hazards.js` целиком (правок больше половины файла):

````js
// node tools/test_hazards.js — муха (предупреждение, погоня, укус, отставание, съедание), масло сверху, нож, лопасти (кусок, не смерть), политика влёта
const assert = require('assert');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); const ball = d.ball; const tp = d.towerParams(1);
  const env = { tp, berserk: false, invuln: 0 };
  const run = (hz, n, dt = 0.016) => { const out = []; for (let i = 0; i < n; i++) out.push(...d.updateHazards(dt, hz, env)); return out; };
  ball.x = 240; ball.y = -500; ball.r = 34; ball.vx = 0; ball.vy = 0;
  // муха: предупреждение FLY_WARN без движения, потом летит к Тефе и кусает
  d.resetFlies(); d.spawnFly(true); assert.strictEqual(d.flies.length, 1); const f = d.flies[0]; assert.ok(f.x < 0 && f.warnT > 0);
  run([], 40); assert.ok(f.x < 0, 'во время предупреждения не влетает'); run([], 5); assert.ok(f.warnT <= 0);
  let ev = []; for (let i = 0; i < 300 && !ev.some(e => e.type === 'hit'); i++) ev.push(...run([], 1));
  assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'fly'), 'укус'); assert.strictEqual(d.flies.length, 0, 'после укуса улетела');
  // муха отстаёт через flyChase(), если не догнала: Тефа далеко и убегает
  d.resetFlies(); d.spawnFly(true); ball.x = 460; ball.y = -3000; ev = [];
  for (let i = 0; i < 600; i++) { ball.y -= 6; ev.push(...run([], 1)); }
  assert.ok(ev.some(e => e.type === 'flyGaveUp'), 'отстала'); assert.strictEqual(d.flies.length, 0);
  assert.strictEqual(d.flyChase(), 6); d.save.up.repel = 20; assert.strictEqual(d.flyChase(), d.FLY_CHASE_MIN, 'репеллент не ниже минимума'); d.save.up.repel = 0;
  // в берсерке муху съедают
  d.resetFlies(); ball.x = 240; ball.y = -500; d.spawnFly(false); env.berserk = true; ev = [];
  for (let i = 0; i < 400 && !ev.some(e => e.type === 'eaten'); i++) ev.push(...run([], 1));
  assert.ok(ev.some(e => e.type === 'eaten' && e.what === 'fly'), 'съедена'); env.berserk = false;
  // политика влёта: лень 3 с — всегда; берсерк — никогда; лимит 3; серия < 6 — никогда; серия ≥ 6 — по вероятности
  d.resetFlies(); assert.strictEqual(d.flyWanted(0.016, 0, 3.1, false), true); assert.strictEqual(d.flyWanted(0.016, 20, 3.1, true), false);
  assert.strictEqual(d.flyWanted(0.016, 0, 0, false), false); assert.strictEqual(d.flyWanted(0.016, 5, 0, false), false);
  const rnd0 = Math.random; Math.random = () => 0; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), true); Math.random = () => 0.999; assert.strictEqual(d.flyWanted(0.016, 6, 0, false), false);
  Math.random = () => 0.002; assert.strictEqual(d.flyWanted(0.016, 6, 0, false, false), false); assert.strictEqual(d.flyWanted(0.016, 6, 0, false, true), true, 'полная шкала удваивает шанс мухи'); Math.random = rnd0;
  d.spawnFly(); d.spawnFly(); d.spawnFly(); assert.strictEqual(d.flyWanted(0.016, 0, 9, false), false, 'не больше FLY_MAX'); d.resetFlies();
  // масло сверху: предупреждение POUR_WARN без капель, потом капли от верхнего края экрана; попадание — hit (спека v2.1.1 §7.2)
  const penv = { tp, berserk: false, camY: -1000, platforms: [] };
  const pr = n => { const out = []; for (let i = 0; i < n; i++) out.push(...d.updatePours(0.016, penv)); return out; };
  assert.strictEqual(d.pourInterval(1), 9); assert.strictEqual(d.pourInterval(100), 3, 'не чаще раза в 3 с');
  d.resetPours(100); ball.x = 240; ball.y = -700; ball.r = 34; ball.onPlatform = null; d.startPour(240);
  assert.strictEqual(d.pours.length, 1); pr(30); assert.strictEqual(d.drops.length, 0, 'во время предупреждения не капает');
  pr(10); assert.ok(d.drops.length >= 1, 'капли пошли'); assert.ok(d.drops.every(dr => dr.y <= -1000 + d.LADLE_Y + 6 + 700 * 0.2), 'капли падают от половника у верхнего края экрана');
  ev = []; for (let i = 0; i < 80 && !ev.some(e => e.type === 'hit'); i++) ev.push(...pr(1));
  assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'oil'), 'капля попала');
  // пятно: капля на платформе оставляет пятно, стоящую рядом Тефу оно жжёт, через секунду высыхает
  const plt = { id: 50, type: 'plate', x: 300, y: -600, w: 140 }; penv.platforms = [plt]; d.resetPours(100);
  ball.x = 100; ball.y = -900; d.startPour(300); ev = pr(100);
  assert.ok(!ev.some(e => e.type === 'hit'), 'Тефа в стороне — мимо'); assert.ok(d.splats.length >= 1, 'на платформе пятно');
  ball.x = 300; ball.y = plt.y - 34; ball.onPlatform = 50;
  penv.berserk = true; ev = pr(1); assert.ok(!ev.some(e => e.type === 'hit'), 'в берсерке пятно не жжёт'); penv.berserk = false;
  ev = pr(1); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'oil'), 'пятно жжёт');
  pr(80); assert.strictEqual(d.splats.length, 0, 'пятно высохло'); ball.onPlatform = null; penv.platforms = [];
  // в берсерке капли съедаются, а не ранят
  penv.berserk = true; d.resetPours(100); ball.x = 240; ball.y = -700; d.startPour(240); ev = [];
  for (let i = 0; i < 120 && !ev.some(e => e.type === 'eaten'); i++) ev.push(...pr(1));
  assert.ok(ev.some(e => e.type === 'eaten' && e.what === 'oil'), 'в берсерке капля съедена'); assert.ok(!ev.some(e => e.type === 'hit')); penv.berserk = false;
  // расписание: налив сам по таймеру; передышка после чекпоинта отодвигает его
  d.resetPours(0.5); pr(40); assert.ok(d.pours.length + d.drops.length >= 1, 'налив по расписанию');
  d.resetPours(1); d.delayPours(4); pr(100); assert.strictEqual(d.pours.length + d.drops.length, 0, 'передышка 4 с');
  // столб целится по ходу Тефы; с башни 6 иногда второй налив в другом столбе на 0.4 с позже
  const rnd1 = Math.random; Math.random = () => 0.5; // rnd(−100, 100) = 0, второй налив не выпадает: 0.5 ≥ 0.3
  ball.x = 200; ball.vx = 300; d.resetPours(0); pr(1); assert.strictEqual(d.pours.length, 1); assert.strictEqual(d.pours[0].x, 200 + 300 * 0.3, 'столб по ходу: x + vx·0.3');
  Math.random = () => 0.1; penv.tp = d.towerParams(6); d.resetPours(0); pr(1); // второй выпадает: влево на 120 + 8 px
  assert.strictEqual(d.pours.length, 2, 'с башни 6 бывает два столба'); assert.ok(Math.abs(d.pours[1].x - d.pours[0].x) >= 100, 'второй в другом столбе');
  assert.ok(Math.abs(d.pours[1].warnT - d.pours[0].warnT - 0.4) < 1e-9, 'и на 0.4 с позже');
  penv.tp = d.towerParams(5); d.resetPours(0); pr(1); assert.strictEqual(d.pours.length, 1, 'до башни 6 столб один');
  Math.random = rnd1; penv.tp = tp; ball.vx = 0; d.resetPours(100);
  // нож: фазы по кругу; бьёт только в ударе и только под собой
  assert.strictEqual(d.knifePhase(0).phase, 'rest'); assert.strictEqual(d.knifePhase(1.3).phase, 'wind'); assert.strictEqual(d.knifePhase(1.95).phase, 'strike');
  const knife = { id: 2, type: 'knife', x: 240, y: -500, t: 0, phase: 'rest', by: -650 };
  ball.x = 240; ball.y = -560; ev = run([knife], 70); assert.ok(!ev.some(e => e.type === 'hit'), 'в паузе не бьёт');
  ev = run([knife], 70); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'knife'), 'удар'); assert.ok(d.knifeY(knife) <= -500 - 20 + 1);
  ball.x = 120; knife.t = 0; ev = run([knife], 140); assert.ok(!ev.some(e => e.type === 'hit'), 'мимо по x');
  // лопасти: снимают кусок, как любая опасность (спека v2.1.1 §7.1); в берсерке — разлетаются
  const bl = { id: 3, type: 'blades', x: 240, y: -560, ang: 0, gone: false };
  ball.x = 240; ball.y = -560; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'hit' && e.reason === 'blades'), 'лопасти ранят'); assert.ok(!ev.some(e => e.type === 'kill'), 'и не убивают сразу');
  env.berserk = true; ev = run([bl], 1); assert.ok(ev.some(e => e.type === 'smash') && bl.gone, 'в берсерке снесены'); env.berserk = false;
  ball.x = 240; ball.y = -700; const bl2 = { id: 4, type: 'blades', x: 240, y: -560, ang: 0, gone: false }; ev = run([bl2], 5); assert.ok(!ev.length, 'вне радиуса не задевают'); assert.ok(bl2.ang > 0, 'крутятся');
  console.log('test_hazards ok');
})().catch(e => { console.error(e); process.exit(1); });
````

- Правка `tools/test_render.js`:

````diff
diff --git a/tools/test_render.js b/tools/test_render.js
--- a/tools/test_render.js
+++ b/tools/test_render.js
@@ -10,8 +10,9 @@ const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(St
     for (const cur of [4, 3, 2, 1]) for (const extra of [{}, { heal: 0.5 }, { tint: 1 }, { charged: true }, { berserk: true }, { blink: true, mouth: 0.8, face: -1, hot: 0.7 }])
       d.drawTefa(ctx, 100, 100, 40, Object.assign({ hp: { cur, max: 4 } }, extra)); // все состояния жизней с эффектами
     d.startTower(3); d.state = 'title'; d.drawBg(); d.drawWorld(); d.titleScreen(); d.loadingScreen();
-    d.state = 'play'; d.spawnFly(true); d.popText(240, 0, '+5', '#fff', true); for (let i = 0; i < 30; i++) d.update(0.016);
-    for (const h of d.hazards) { h.y = d.ball.y; if (h.type === 'oil') h.drops.push({ y: h.y + 30, splat: 0, dead: false }, { y: h.floorY, splat: 0.3, dead: false }); if (h.type === 'knife') h.phase = 'wind'; }
+    d.state = 'play'; d.spawnFly(true); d.popText(240, 0, '+5', '#fff', true); d.resetPours(100); d.startPour(200); for (let i = 0; i < 30; i++) d.update(0.016);
+    d.drawWorld(); for (let i = 0; i < 30; i++) d.update(0.016); // предупреждение налива, потом капли и пятна
+    for (const h of d.hazards) { h.y = d.ball.y; if (h.type === 'knife') h.phase = 'wind'; }
     for (const p of d.platforms) if (p.type === 'pan') p.hotT = 1.5;
     d.drawBg(); d.drawWorld(); d.drawHUD(); d.pausedScreen(true); d.pausedScreen(false);
     d.YG.adStub = { kind: 'rewarded', until: 0 }; d.adStubScreen(); d.YG.adStub = null; d.adStubScreen();
````

- Правка `tools/test_tower.js`:

````diff
diff --git a/tools/test_tower.js b/tools/test_tower.js
--- a/tools/test_tower.js
+++ b/tools/test_tower.js
@@ -29,7 +29,7 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
       for (const q of prev) assert.ok(cur.some(p => Math.abs(q.x - p.x) <= d.REACH_X), 'вниз: башня ' + N + ' ряд ' + i);
       for (const p of cur) assert.ok(p.x - p.w / 2 >= 20 && p.x + p.w / 2 <= 460, 'платформа в поле');
     }
-    if (N === 1) { assert.ok(!t.platforms.some(p => p.type === 'tray'), 'подносов нет в башне 1'); assert.ok(!t.hazards.some(h => h.type !== 'oil'), 'в башне 1 только масло'); }
+    if (N === 1) { assert.ok(!t.platforms.some(p => p.type === 'tray'), 'подносов нет в башне 1'); assert.strictEqual(t.hazards.length, 0, 'в башне 1 опасностей в раскладке нет: масло льют сверху'); }
     if (N === 2) assert.ok(!t.hazards.some(h => h.type === 'blades'), 'лопасти не раньше башни 3');
     assert.ok(!t.platforms.some(p => p.type === 'pan' && p.row < 3), 'сковородок нет в рядах 1–2');
     const bl = t.hazards.filter(h => h.type === 'blades').map(h => -h.y / d.ROW_H).sort((a, b) => a - b);
@@ -55,7 +55,8 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   }
   // хотя бы в одной из первых 10 башен есть каждый тип
   const all = []; for (let N = 1; N <= 10; N++) all.push(d.buildTower(N));
-  for (const ty of ['oil', 'knife', 'blades']) assert.ok(all.some(t => t.hazards.some(h => h.type === ty)), 'есть ' + ty);
+  for (const ty of ['knife', 'blades']) assert.ok(all.some(t => t.hazards.some(h => h.type === ty)), 'есть ' + ty);
+  assert.ok(!all.some(t => t.hazards.some(h => h.type === 'oil')), 'масла в раскладке нет');
   for (const ty of ['pan', 'tray']) assert.ok(all.some(t => t.platforms.some(p => p.type === ty)), 'есть ' + ty);
   // seeded RNG стабилен
   const R = d.mulberry32(7); const a = [R(), R(), R()]; const R2 = d.mulberry32(7); assert.deepStrictEqual(a, [R2(), R2(), R2()]);
````

- [ ] **Шаг 2. Убедиться, что тесты падают**

Run: `npm test`

Expected: FAIL. `test_tower` падает первым после `test_jump ok`: `AssertionError [ERR_ASSERTION]: в башне 1 опасностей в раскладке нет: масло льют сверху` (`4 !== 0`).

- [ ] **Шаг 3. Реализация**

- Правка `src/game.js`:

````diff
diff --git a/src/game.js b/src/game.js
--- a/src/game.js
+++ b/src/game.js
@@ -31,7 +31,7 @@ function placeAt(p) {
 function startTower(N, fromCp = 0) {
   tower = buildTower(N); run = newRun(); run.foodTotal = tower.items.length;
   if (fromCp && !tower.platforms.some(p => p.cp === fromCp)) fromCp = 0; // битый чекпоинт из сохранения
-  resetPower(); resetFlies(); resetFx();
+  resetPower(); resetFlies(); resetFx(); resetPours(5); // первый налив масла не раньше 5 с
   ball.mass = massMax(); ball.r = radiusFor(ball.mass);
   run.cp = fromCp; if (fromCp) run.deaths = 1;
   placeAt(cpPlatform(fromCp));
@@ -85,12 +85,12 @@ function die(reason) {
 function continueRun() {
   ball.mass = massMax(); ball.r = radiusFor(ball.mass); // масса и радиус до посадки: placeAt сажает Тефу по ball.r
   placeAt(platformById(tower.platforms, run.lastLandId) || cpPlatform(run.cp));
-  endBerserk(); resetFlies(); run.invuln = INVULN_CONT; run.usedContinue++; camShake = 0; tGame = 0; state = 'play'; // шкала и потраченный берсерк смерть переживают, серия для мух — нет
+  endBerserk(); resetFlies(); resetPours(3); run.invuln = INVULN_CONT; run.usedContinue++; camShake = 0; tGame = 0; state = 'play'; // шкала и потраченный берсерк смерть переживают, серия для мух — нет
 }
-// «С чекпоинта» бесплатно: смерти уже посчитаны в die(); капли масла и мухи сброшены
+// «С чекпоинта» бесплатно: смерти уже посчитаны в die(); масло и мухи сброшены
 function restartFromCp() {
   ball.mass = massMax(); ball.r = radiusFor(ball.mass); placeAt(cpPlatform(run.cp));
-  endBerserk(); resetFlies(); resetFx(); for (const h of tower.hazards) if (h.type === 'oil') h.drops = [];
+  endBerserk(); resetFlies(); resetFx(); resetPours(4);
   camY = ball.y - H * 0.6; tGame = 0; state = 'play';
 }
 function restartTower() { startTower(tower.tp.N, 0); save.cp = 0; state = 'play'; } // чекпоинт сбрасывается вместе с башней; запишет ближайшая смерть или финиш
@@ -112,7 +112,7 @@ function finishTower() {
   ball.onPlatform = tower.platforms.find(p => p.roof).id;
   state = 'finish'; tGame = 0; sfx.big(); camShake = 8; YG.gameplayStop();
 }
-function reachCheckpoint(p) { run.cp = p.cp; save.cp = p.cp; heal(massMax()); persist(); popText(p.x, p.y - 40, T('checkpoint', p.cp), '#8ff0a4', true); sfx.buy(); }
+function reachCheckpoint(p) { run.cp = p.cp; save.cp = p.cp; heal(massMax()); delayPours(4); persist(); popText(p.x, p.y - 40, T('checkpoint', p.cp), '#8ff0a4', true); sfx.buy(); }
 function onLand(p, vy) {
   ball.charges = chargesMax();
   if (vy > 80) { squash(Math.min(vy, 900) * 0.5); crumbs(ball.x, ball.y + ball.r); }
@@ -141,7 +141,8 @@ function updateRun(dt) {
   ball.hot = st && st.type === 'pan' ? clamp((st.hotT || 0) / panTime(tp), 0, 1) : Math.max(0, ball.hot - dt * 2);
   run.flyCd = Math.max(0, run.flyCd - dt);
   if (run.flyCd <= 0 && flyWanted(dt, power.flyStreak, run.campT, isBerserk(), powerReady())) { spawnFly(); run.flyCd = FLY_CD; run.campT = 0; }
-  for (const e of updateHazards(dt, tower.hazards, { tp, berserk: isBerserk(), invuln: run.invuln })) {
+  const hev = updateHazards(dt, tower.hazards, { tp, berserk: isBerserk(), invuln: run.invuln }).concat(updatePours(dt, { tp, berserk: isBerserk(), camY, platforms: tower.platforms }));
+  for (const e of hev) {
     if (e.type === 'hit') damage(1, e.reason, e.x, e.y); // каждая опасность снимает один кусок; сразу убивает только падение
     else if (e.type === 'flyGaveUp') { onPower(powerAdd(3)); flyStreakAdd(3); popText(e.h.x, e.h.y, T('flyGone'), 'rgba(255,255,255,0.7)'); }
     else if (e.type === 'eaten') { const gain = coinsFor('meat'); run.runCoins += gain; heal(1); burst(e.x, e.y, e.what === 'fly' ? '#2b2b2b' : '#ff9a2a', 10, 200, 0.4, 3); popText(e.x, e.y, '+' + gain, '#ffe08a', true); sfx.eat(); }
````

- Заменить `src/hazards.js` целиком (правок больше половины файла):

````js
'use strict';
// ---------- опасности: муха (наводится), масло сверху (льёт повар), нож (гильотина в разрыве), лопасти; каждая снимает один кусок ----------
const FLY_CHASE = 6, FLY_CHASE_MIN = 1.5, FLY_WARN = 0.7, FLY_MAX = 3, FLY_CD = 2, CAMP_T = 3;
const KNIFE_REST = 1.2, KNIFE_WIND = 0.6, KNIFE_STRIKE = 0.3; // сумма = KNIFE_CYCLE
const BLADES_R = 36;
let flies = []; // мухи живут отдельно от раскладки башни: их спавнит политика, а не генератор
function flyChase() { return Math.max(FLY_CHASE_MIN, FLY_CHASE - 0.3 * ((save.up && save.up.repel) || 0)); }
function spawnFly(fromLeft) {
  const left = fromLeft === undefined ? Math.random() < 0.5 : fromLeft;
  flies.push({ type: 'fly', x: left ? -30 : W + 30, y: ball.y - 100, side: left ? -1 : 1, warnT: FLY_WARN, chaseT: 0, phase: Math.random() * 6.28, gone: false });
}
function resetFlies() { flies = []; }
// политика влёта (спека v2.1.1 §4.4): лень — гарантированно; скрытая серия ≥ 6 — по шансу, полная шкала (doubled) его удваивает;
// берсерк и лимит — никогда
function flyWanted(dt, streakN, campT, berserk, doubled) {
  if (berserk || flies.length >= FLY_MAX) return false;
  if (campT >= CAMP_T) return true;
  if (streakN >= 6) return Math.random() < dt * Math.min(0.4, 0.08 + 0.02 * (streakN - 6)) * (doubled ? 2 : 1);
  return false;
}
function knifePhase(t) { // t → { phase, k } где k — 0..1 внутри фазы
  const c = ((t % KNIFE_CYCLE) + KNIFE_CYCLE) % KNIFE_CYCLE;
  if (c < KNIFE_REST) return { phase: 'rest', k: c / KNIFE_REST };
  if (c < KNIFE_REST + KNIFE_WIND) return { phase: 'wind', k: (c - KNIFE_REST) / KNIFE_WIND };
  return { phase: 'strike', k: (c - KNIFE_REST - KNIFE_WIND) / KNIFE_STRIKE };
}
function knifeY(h) { // верх лезвия: пауза наверху (by), замах чуть выше, удар вниз до уровня ряда
  const { phase, k } = knifePhase(h.t), top = h.by, bottom = h.y - 80;
  return phase === 'rest' ? top : phase === 'wind' ? top - 14 * Math.sin(k * Math.PI) : top + (bottom - top) * Math.sin(k * Math.PI);
}
// env: { tp, berserk, invuln }. События: hit {reason,x,y} | flyGaveUp {h} | eaten {what,x,y} | smash {h,x,y}.
// В берсерке муха съедается (eaten — game.js лечит на кусок), нож и лопасти ломаются (smash). Масло — updatePours ниже.
function updateHazards(dt, hazards, env) {
  const ev = [], tp = env.tp, R = ball.r;
  for (const f of flies) {
    if (f.gone) continue;
    if (f.warnT > 0) { f.warnT -= dt; f.y = ball.y - 100; continue; }
    f.chaseT += dt; f.phase += dt * 7;
    const dx = ball.x - f.x, dy = ball.y - f.y, dist = Math.hypot(dx, dy) || 1, sp = tp.flySpeed;
    f.x += (dx / dist) * sp * dt + Math.cos(f.phase) * 60 * dt; f.y += (dy / dist) * sp * dt + Math.sin(f.phase * 1.3) * 60 * dt;
    if (dist < R + 12) { f.gone = true; ev.push(env.berserk ? { type: 'eaten', what: 'fly', x: f.x, y: f.y } : { type: 'hit', reason: 'fly', x: f.x, y: f.y }); continue; }
    if (f.chaseT >= flyChase()) { f.gone = true; ev.push({ type: 'flyGaveUp', h: f }); }
  }
  flies = flies.filter(f => !f.gone);
  for (const h of hazards) {
    if (h.gone || Math.abs(h.y - ball.y) > H + 100) continue;
    if (h.type === 'knife') {
      h.t += dt * tp.speedMul; h.phase = knifePhase(h.t).phase;
      const ky = knifeY(h);
      if (h.phase === 'strike' && Math.abs(ball.x - h.x) < R + 8 && Math.abs(ball.y - (ky + 40)) < R + 40) {
        if (env.berserk) { h.gone = true; ev.push({ type: 'smash', h, x: h.x, y: ky }); } else ev.push({ type: 'hit', reason: 'knife', x: h.x, y: ky });
      }
    } else if (h.type === 'blades') {
      h.ang += dt * 6 * tp.speedMul;
      if (Math.hypot(ball.x - h.x, ball.y - h.y) < R + BLADES_R) {
        if (env.berserk) { h.gone = true; ev.push({ type: 'smash', h, x: h.x, y: h.y }); } else ev.push({ type: 'hit', reason: 'blades', x: h.x, y: h.y });
      }
    }
  }
  return ev;
}
// ---------- масло сверху (спека v2.1.1 §7.2): повар льёт с верхнего края, пунктир предупреждает, капли падают, пятна шипят ----------
const POUR_WARN = 0.6, POUR_DROPS = 4, POUR_GAP = 0.08; // предупреждение, капель в наливе, интервал между каплями, с
const POUR_V = 700, DROP_R = 8;                         // скорость падения, px/с; радиус капли
const SPLAT_T = 1, SPLAT_W = 36;                        // пятно на платформе: живёт 1 с, шириной 36 px
const LADLE_Y = 110;                                    // половник ниже строк HUD (счёт y 40, «Башня N» y 64), px от верха экрана; капли начинаются от черпака
let pours = [], drops = [], splats = [], pourT = 5;     // pourT — секунд до следующего налива
function pourInterval(N) { return Math.max(3, 9 - 0.3 * (N - 1)); }
function resetPours(delay) { pours = []; drops = []; splats = []; pourT = delay; } // старт башни, чекпоинт, «Продолжить»
function delayPours(t) { pourT = Math.max(pourT, t); }                            // передышка после нового чекпоинта
function startPour(x, extraWarn = 0) { pours.push({ x: clamp(x, 40, W - 40), warnT: POUR_WARN + extraWarn, left: POUR_DROPS, dropT: 0 }); }
// env: { tp, berserk, camY, platforms }. События: hit {reason: 'oil'} | eaten {what: 'oil'} — как у остальных опасностей
function updatePours(dt, env) {
  const ev = [], N = env.tp.N;
  pourT -= dt;
  if (pourT <= 0) { // столб рядом с Тефой или чуть впереди по ходу; с башни 6 иногда второй налив через 0.4 с в другом столбе
    startPour(ball.x + ball.vx * 0.3 + (Math.random() * 200 - 100));
    if (N >= 6 && Math.random() < 0.3) startPour(ball.x + (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 80), 0.4);
    pourT = pourInterval(N) + (Math.random() * 2 - 1);
  }
  for (const p of pours) {
    if (p.warnT > 0) { p.warnT -= dt; continue; }
    p.dropT -= dt;
    while (p.left > 0 && p.dropT <= 0) { drops.push({ x: p.x, y: env.camY + LADLE_Y + 6, dead: false }); p.left--; p.dropT += POUR_GAP; }
  }
  pours = pours.filter(p => p.warnT > 0 || p.left > 0);
  for (const dr of drops) {
    const y0 = dr.y; dr.y += POUR_V * dt;
    if (Math.hypot(ball.x - dr.x, ball.y - dr.y) < ball.r + DROP_R) { dr.dead = true; ev.push(env.berserk ? { type: 'eaten', what: 'oil', x: dr.x, y: dr.y } : { type: 'hit', reason: 'oil', x: dr.x, y: dr.y }); continue; }
    for (const p of env.platforms) { // капля упала на платформу — шипящее пятно (едет вместе с подносом)
      if (p.gone || Math.abs(dr.x - p.x) > p.w / 2 || !(y0 <= p.y && dr.y >= p.y)) continue;
      dr.dead = true; splats.push({ p, dx: dr.x - p.x, t: SPLAT_T }); break;
    }
    if (dr.y > env.camY + H + 100) dr.dead = true;
  }
  drops = drops.filter(dr => !dr.dead);
  for (const s of splats) {
    s.t -= dt;
    if (!env.berserk && ball.onPlatform === s.p.id && Math.abs(ball.x - (s.p.x + s.dx)) < SPLAT_W / 2 + 0.6 * ball.r) ev.push({ type: 'hit', reason: 'oil', x: s.p.x + s.dx, y: s.p.y });
  }
  splats = splats.filter(s => s.t > 0);
  return ev;
}
expose({ FLY_CHASE, FLY_CHASE_MIN, FLY_WARN, FLY_MAX, FLY_CD, CAMP_T, KNIFE_REST, KNIFE_WIND, KNIFE_STRIKE, BLADES_R,
  POUR_WARN, POUR_DROPS, POUR_V, SPLAT_T, SPLAT_W, LADLE_Y,
  get flies() { return flies; }, flyChase, spawnFly, resetFlies, flyWanted, knifePhase, knifeY, updateHazards,
  get pours() { return pours; }, get drops() { return drops; }, get splats() { return splats; }, pourInterval, resetPours, delayPours, startPour, updatePours });
````

- Правка `src/i18n.js`:

````diff
diff --git a/src/i18n.js b/src/i18n.js
--- a/src/i18n.js
+++ b/src/i18n.js
@@ -3,7 +3,7 @@
 const STR = {
   ru: {
     title: 'Тефтеля', tower: 'Башня', play: 'Играть', 'theme.kitchen': 'Кухня', roof: 'Крыша',
-    hint1: 'Тап — прыжок в точку тапа.', hint2: 'Еда заряжает силу. Полная шкала — тапни по Тефе.', hint3: 'Сковородка жжёт, мухи кусают, лопасти убивают.',
+    hint1: 'Тап — прыжок в точку тапа.', hint2: 'Еда заряжает силу. Полная шкала — тапни по Тефе.', hint3: 'Сковородка жжёт, мухи кусают, масло льют сверху.',
     fell: 'Шлёп!', runCoins: 'Собрано за забег', total: 'Всего',
     continueAd: 'Продолжить', doubleAd: 'Монеты ×2', forAd: 'за рекламу', fromCp: 'С чекпоинта', restart: 'Заново', next: 'Следующая башня',
     paused: 'Пауза', tapToContinue: 'Тапни, чтобы продолжить', adStub: 'Реклама (заглушка)', loading: 'Загрузка…',
@@ -13,7 +13,7 @@ const STR = {
   },
   en: {
     title: 'Meatball', tower: 'Tower', play: 'Play', 'theme.kitchen': 'Kitchen', roof: 'Roof',
-    hint1: 'Tap where you want to land.', hint2: 'Food charges your power. Full bar — tap Tefa.', hint3: 'Pans burn, flies bite, blades kill.',
+    hint1: 'Tap where you want to land.', hint2: 'Food charges your power. Full bar — tap Tefa.', hint3: 'Pans burn, flies bite, oil pours from above.',
     fell: 'Splat!', runCoins: 'Coins this run', total: 'Total',
     continueAd: 'Continue', doubleAd: 'Coins ×2', forAd: 'watch ad', fromCp: 'From checkpoint', restart: 'Restart', next: 'Next tower',
     paused: 'Paused', tapToContinue: 'Tap to continue', adStub: 'Ad (stub)', loading: 'Loading…',
@@ -23,7 +23,7 @@ const STR = {
   },
   tr: {
     title: 'Köfte', tower: 'Kule', play: 'Oyna', 'theme.kitchen': 'Mutfak', roof: 'Çatı',
-    hint1: 'İnmek istediğin yere dokun.', hint2: 'Yemek gücü doldurur. Çubuk dolunca Tefa\'ya dokun.', hint3: 'Tava yakar, sinek ısırır, bıçaklar öldürür.',
+    hint1: 'İnmek istediğin yere dokun.', hint2: 'Yemek gücü doldurur. Çubuk dolunca Tefa\'ya dokun.', hint3: 'Tava yakar, sinek ısırır, yukarıdan yağ dökülür.',
     fell: 'Pat!', runCoins: 'Bu turda toplanan', total: 'Toplam',
     continueAd: 'Devam et', doubleAd: 'Para ×2', forAd: 'reklam izle', fromCp: 'Kontrol noktasından', restart: 'Baştan', next: 'Sonraki kule',
     paused: 'Duraklatıldı', tapToContinue: 'Devam etmek için dokun', adStub: 'Reklam (taslak)', loading: 'Yükleniyor…',
````

- Правка `src/render.js`:

````diff
diff --git a/src/render.js b/src/render.js
--- a/src/render.js
+++ b/src/render.js
@@ -42,16 +42,7 @@ function drawPlatform(p) {
 }
 function drawHazard(h) {
   if (h.gone) return; const y = h.y - camY; if (y < -320 || y > H + 320) return;
-  if (h.type === 'oil') {
-    ctx.fillStyle = '#6d6d6d'; ctx.beginPath(); ctx.ellipse(h.x, y, 22, 10, 0, 0, 7); ctx.fill(); // половник
-    ctx.strokeStyle = '#6d6d6d'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(h.x + 18, y - 4); ctx.lineTo(h.x + 60, y - 30); ctx.stroke();
-    ctx.fillStyle = '#f2c94c';
-    for (const dr of h.drops) {
-      const dy = dr.y - camY;
-      if (dr.splat > 0) { ctx.globalAlpha = clamp(dr.splat * 2, 0, 1); ctx.beginPath(); ctx.ellipse(h.x, dy + 6, 18, 5, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
-      else { ctx.beginPath(); ctx.moveTo(h.x, dy - 14); ctx.quadraticCurveTo(h.x + 9, dy, h.x, dy + 8); ctx.quadraticCurveTo(h.x - 9, dy, h.x, dy - 14); ctx.fill(); }
-    }
-  } else if (h.type === 'knife') {
+  if (h.type === 'knife') {
     const ky = knifeY(h) - camY, wind = h.phase === 'wind';
     ctx.fillStyle = '#5a3b22'; rrect(h.x - 7, ky - 40, 14, 40, 4); ctx.fill(); // рукоять
     ctx.fillStyle = wind ? '#ffffff' : '#d8dde3'; ctx.beginPath(); ctx.moveTo(h.x - 8, ky); ctx.lineTo(h.x + 8, ky); ctx.lineTo(h.x + 6, ky + 70); ctx.lineTo(h.x, ky + 84); ctx.lineTo(h.x - 6, ky + 70); ctx.closePath(); ctx.fill();
@@ -64,6 +55,34 @@ function drawHazard(h) {
     ctx.restore();
   }
 }
+// масло сверху (спека v2.1.1 §7.2): половник повара у верхнего края, красный пунктир столба, горячие капли, шипящие пятна
+function drawPours() {
+  for (const p of pours) {
+    const tilt = p.warnT > 0 ? (1 - clamp(p.warnT / POUR_WARN, 0, 1)) * 0.35 : 0.35; // черпак опрокидывается к столбу за время предупреждения
+    if (p.warnT > 0) { // пунктир: куда польётся
+      ctx.strokeStyle = `rgba(255,70,50,${0.35 + 0.35 * Math.sin(tGame * 20) ** 2})`; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
+      ctx.beginPath(); ctx.moveTo(p.x, LADLE_Y + 14); ctx.lineTo(p.x, H); ctx.stroke(); ctx.setLineDash([]);
+    }
+    ctx.save(); ctx.translate(p.x, LADLE_Y); ctx.scale(p.x > W / 2 ? -1 : 1, 1); ctx.rotate(-tilt); // черпак над столбом, ручка к середине экрана и вверх: не залезает на счёт и край
+    ctx.strokeStyle = '#8d8d95'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(16, -6); ctx.lineTo(56, -16); ctx.stroke();
+    ctx.fillStyle = '#b8bcc4'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI); ctx.fill(); // чаша
+    ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 6, 0, 0, 7); ctx.fill(); // горячее масло в черпаке
+    ctx.restore();
+  }
+  for (const dr of drops) { // горячая капля: оранжевая со свечением и бликом
+    const y = dr.y - camY, g = ctx.createRadialGradient(dr.x, y, 2, dr.x, y, 18);
+    g.addColorStop(0, 'rgba(255,170,60,0.55)'); g.addColorStop(1, 'rgba(255,120,30,0)');
+    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dr.x, y, 18, 0, 7); ctx.fill();
+    ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.moveTo(dr.x, y - 16); ctx.quadraticCurveTo(dr.x + 9, y, dr.x, y + 8); ctx.quadraticCurveTo(dr.x - 9, y, dr.x, y - 16); ctx.fill();
+    ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.beginPath(); ctx.ellipse(dr.x - 2.5, y - 2, 2, 4, 0.3, 0, 7); ctx.fill();
+  }
+  for (const s of splats) { // шипящее пятно с пузырьками, гаснет за SPLAT_T
+    const x = s.p.x + s.dx, y = s.p.y - camY, a = clamp(s.t / SPLAT_T, 0, 1);
+    ctx.fillStyle = `rgba(255,140,40,${0.75 * a})`; ctx.beginPath(); ctx.ellipse(x, y + 2, SPLAT_W / 2, 5, 0, 0, 7); ctx.fill();
+    ctx.fillStyle = `rgba(255,230,170,${0.8 * a})`;
+    for (let i = 0; i < 3; i++) { const t = (tGame * 3 + i / 3) % 1; ctx.beginPath(); ctx.arc(x - 10 + i * 10, y - t * 12, 2 + t * 2, 0, 7); ctx.fill(); }
+  }
+}
 function drawFly(f) {
   const y = f.y - camY;
   if (f.warnT > 0) { // предупреждение: мигающая стрелка у края, остриём внутрь поля
@@ -151,6 +170,7 @@ function drawWorld() { // всё внутри поля; вызывающий с
   for (const h of tower.hazards) drawHazard(h);
   for (const it of tower.items) if (!it.dead) drawItem(it);
   for (const f of flies) drawFly(f);
+  drawPours();
   if (ball.alive || state === 'title' || state === 'finish') drawTefaBall();
   for (const p of particles) {
     ctx.globalAlpha = clamp(p.t / p.life, 0, 1);
@@ -165,4 +185,4 @@ function drawWorld() { // всё внутри поля; вызывающий с
   }
   ctx.globalAlpha = 1;
 }
-expose({ drawBg, drawWorld, drawHUD, drawPowerMeter, drawPlatform, drawHazard, drawFly });
+expose({ drawBg, drawWorld, drawHUD, drawPowerMeter, drawPlatform, drawHazard, drawFly, drawPours });
````

- Правка `src/tower.js`:

````diff
diff --git a/src/tower.js b/src/tower.js
--- a/src/tower.js
+++ b/src/tower.js
@@ -3,7 +3,6 @@
 // Все числа черновые (спека §5.1); растут с N, чтобы новые башни требовали прокачки.
 const ROW_H = 120;        // шаг рядов платформ, px
 const REACH_X = 180;      // предел |Δx| между платформами соседних рядов: прыжок в один ряд достаёт всегда (VX_MAX·(tUp+tDown) при dy = ROW_H + AIM_MARGIN ≈ 259)
-const OIL_T = 2.2;        // период капли масла, с
 const KNIFE_CYCLE = 2.1;  // нож: пауза 1.2 + замах 0.6 + удар 0.3
 const CP_EVERY = 20;      // чекпоинт каждые 20 рядов
 const LANE_L = [100, 170], LANE_R = [310, 380], LANE_C = [200, 280]; // диапазоны x центров платформ: дорожки и ряд схождения
@@ -44,9 +43,9 @@ function buildTower(N) {
     if (R() < tp.foodPerRow) { const n = R() < 0.5 ? 2 : 1; for (let k = 0; k < n; k++) items.push(mkFood(R, gp.x + (k ? 40 : -40), y - rr(50, 90))); }
     if (R() < 0.3) items.push(mkFood(R, sp.x, y - rr(50, 90)));
     if (R() < tp.pHaz) {
-      const pool = ['oil']; if (N >= 2) pool.push('knife'); if (N >= 3 && i - lastBlades >= 15) pool.push('blades');
-      const t = pool[Math.floor(R() * pool.length)];
-      if (t === 'oil') hazards.push({ id: hid++, type: 'oil', x: gp.x, y: y - 140, floorY: y, t: R() * OIL_T, drops: [] });
+      const pool = []; if (N >= 2) pool.push('knife'); if (N >= 3 && i - lastBlades >= 15) pool.push('blades'); // масло льют сверху, в раскладке его нет
+      const t = pool.length ? pool[Math.floor(R() * pool.length)] : null;
+      if (!t) { /* в башне 1 опасностей в раскладке нет */ }
       else if (t === 'knife') hazards.push({ id: hid++, type: 'knife', x: W / 2, y, t: R() * KNIFE_CYCLE, phase: 'rest', by: y - 150 });
       else { // лопасти висят в центре ряда: раздвигаем дорожки (у подноса — весь ход), чтобы стоящая Тефа их не задевала при массе до 8 (r = 54)
         // hypot(240 − 140, 60 − 54) ≈ 100 > 54 + 36 (BLADES_R); REACH_X цел: 140 и 340 против ряда схождения 200–280 — не дальше 140
@@ -58,4 +57,4 @@ function buildTower(N) {
   }
   return { tp, platforms, hazards, items };
 }
-expose({ ROW_H, REACH_X, OIL_T, KNIFE_CYCLE, CP_EVERY, FOOD_KINDS, FOOD_COLOR, mulberry32, towerParams, buildTower });
+expose({ ROW_H, REACH_X, KNIFE_CYCLE, CP_EVERY, FOOD_KINDS, FOOD_COLOR, mulberry32, towerParams, buildTower });
````

- [ ] **Шаг 4. Убедиться, что всё зелёное**

Run: `npm test`

Expected: одиннадцать строк `… ok` (`test_core` … `test_render`, `smoke`), из шума только два блока `YaGames.init failed, using stub …` от `test_sdk`.

- [ ] **Шаг 5. Посмотреть снимки**

`npm run shot` проходит без ошибок, 11 файлов. На снимках этой задачи налива ещё нет: он начинается через 5 с после
старта, а сцены снимаются раньше. Сцена опасностей получит налив в задаче 6, отдельная сцена налива появится в задаче 8.

Открыть PNG и посмотреть глазами, а не описывать код. Листы `shots/design_tefa_*.png` не перезаписывать.

- [ ] **Шаг 6. Коммит**

````bash
git add src/game.js src/hazards.js src/i18n.js src/render.js src/tower.js tools/smoke.js tools/test_game.js tools/test_hazards.js tools/test_render.js tools/test_tower.js
git commit -m "feat: масло льют сверху — половник, красный пунктир, капли и шипящие пятна" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
````

---

## Task 5. Сыр и точный прицел (спека §6.3)

Ломтик сыра через 0.5 с после посадки крошится и пропадает, через 3 с отрастает на месте; урона не наносит. Генератор начнёт ставить сыр в задаче 6, здесь — поведение и отрисовка. `aimJump` считает спуск от настоящей высоты цели: прежний расчёт перелетал платформу того же ряда (406.6 px вместо 400).

**Files:**
- Modify: `src/ball.js`
- Modify: `src/game.js`
- Modify: `src/platforms.js`
- Modify: `src/render.js`
- Test: `tools/test_jump.js`
- Test: `tools/test_platforms.js`
- Test: `tools/test_render.js`

**Interfaces:**
- Consumes: ничего нового.
- Produces:
  - `CHEESE_T = 0.5`, `CHEESE_BACK = 3`;
  - поля сыра `crumbleT`, `gone`, `backT`;
  - событие `updatePlatforms` `{ type: 'crumble', p }`;
  - `tryLand` пропускает пропавшую платформу, стоящая на ней Тефа падает;
  - подпись `aimJump(bx, by, r, tx, ty)` прежняя.

- [ ] **Шаг 1. Тесты**

Внести правки тестов. Код игры в этом шаге не трогать.

- Правка `tools/test_jump.js`:

````diff
diff --git a/tools/test_jump.js b/tools/test_jump.js
--- a/tools/test_jump.js
+++ b/tools/test_jump.js
@@ -16,6 +16,9 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   assert.ok(Math.abs(f.minB - (-260 - AIM_MARGIN)) < 3, 'вершина низа на AIM_MARGIN выше точки тапа: ' + f.minB);
   assert.ok(Math.abs(f.x - 300) < 4, 'на уровне тапа — над точкой тапа: ' + f.x);
   f = fly(240, -100, r, 120, -200); assert.ok(Math.abs(f.x - 120) < 4, 'влево тоже: ' + f.x);
+  // цель на том же уровне и ниже: спуск считается от реальной высоты цели, приземление над точкой тапа
+  f = fly(100, -r, r, 400, 0); assert.ok(Math.abs(f.x - 400) < 4, 'тот же уровень: ' + f.x);
+  f = fly(100, -r, r, 300, 60); assert.ok(Math.abs(f.x - 300) < 4, 'цель ниже: ' + f.x);
   // зажимы высоты
   assert.strictEqual(aimJump(240, 0, r, 240, 40).dy, JUMP_MIN_H, 'тап ниже — минимальный прыжок');
   assert.strictEqual(aimJump(240, 0, r, 240, -900).dy, JUMP_MAX_H, 'слишком высоко — максимальный');
````

- Правка `tools/test_platforms.js`:

````diff
diff --git a/tools/test_platforms.js b/tools/test_platforms.js
--- a/tools/test_platforms.js
+++ b/tools/test_platforms.js
@@ -1,4 +1,4 @@
-// node tools/test_platforms.js — посадка сверху с учётом пройденного пути, стояние и сход с края, поднос везёт, сковородка жжёт
+// node tools/test_platforms.js — посадка сверху с учётом пройденного пути, стояние и сход с края, поднос везёт, сковородка жжёт, сыр крошится
 const assert = require('assert');
 const noop = () => {};
 const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
@@ -36,6 +36,16 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   assert.strictEqual(burns, 1, 'один ожог за ~2.08 с'); assert.ok(pan.hotT < 0.2, 'таймер сброшен');
   assert.ok(d.panHeat(pan, tp) >= 0 && d.panHeat(pan, tp) <= 1);
   ball.onPlatform = null; pan.hotT = 1; d.updatePlatforms(0.25, P, tp); assert.ok(pan.hotT < 1, 'остывает без Тефы');
+  // сыр: посадка запускает крошение, через 0.5 с он пропадает и Тефа падает, пропавший не ловит, через 3 с отрастает
+  const cheese = { id: 4, type: 'cheese', x: 240, y: -480, w: 120 }, P2 = [cheese]; let crumbled = 0;
+  put(240, -480 - 34, 0); d.landOn(cheese);
+  for (let i = 0; i < 20; i++) for (const e of d.updatePlatforms(0.016, P2, tp)) if (e.type === 'crumble') crumbled++;
+  assert.strictEqual(crumbled, 0, 'полсекунды держит'); assert.strictEqual(ball.onPlatform, 4);
+  for (let i = 0; i < 20; i++) for (const e of d.updatePlatforms(0.016, P2, tp)) if (e.type === 'crumble') crumbled++;
+  assert.strictEqual(crumbled, 1, 'раскрошился один раз'); assert.ok(cheese.gone); assert.strictEqual(ball.onPlatform, null, 'Тефа падает');
+  put(240, -480 - 34 + 10, 300); assert.strictEqual(d.tryLand(P2, -520), null, 'пропавший сыр не ловит');
+  for (let i = 0; i < 190; i++) d.updatePlatforms(0.016, P2, tp); assert.ok(!cheese.gone, 'через 3 с отрос');
+  put(240, -480 - 34 + 10, 300); assert.strictEqual(d.tryLand(P2, -520), cheese, 'и снова держит');
   assert.strictEqual(d.platformById(P, 2), pan); assert.strictEqual(d.platformById(P, null), null); assert.strictEqual(d.platformById(P, 99), null);
   console.log('test_platforms ok');
 })().catch(e => { console.error(e); process.exit(1); });
````

- Правка `tools/test_render.js`:

````diff
diff --git a/tools/test_render.js b/tools/test_render.js
--- a/tools/test_render.js
+++ b/tools/test_render.js
@@ -14,6 +14,7 @@ const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(St
     d.drawWorld(); for (let i = 0; i < 30; i++) d.update(0.016); // предупреждение налива, потом капли и пятна
     for (const h of d.hazards) { h.y = d.ball.y; if (h.type === 'knife') h.phase = 'wind'; }
     for (const p of d.platforms) if (p.type === 'pan') p.hotT = 1.5;
+    d.drawPlatform({ id: 900, type: 'cheese', x: 240, y: d.camY + 400, w: 120, crumbleT: 0.2 }); d.drawPlatform({ id: 901, type: 'cheese', x: 240, y: d.camY + 500, w: 120, gone: true }); // сыр целый, крошится и пропавший
     d.drawBg(); d.drawWorld(); d.drawHUD(); d.pausedScreen(true); d.pausedScreen(false);
     d.YG.adStub = { kind: 'rewarded', until: 0 }; d.adStubScreen(); d.YG.adStub = null; d.adStubScreen();
   }
````

- [ ] **Шаг 2. Убедиться, что тесты падают**

Run: `npm test`

Expected: FAIL. `test_jump` падает первым после `test_save ok`: `AssertionError [ERR_ASSERTION]: тот же уровень: 406.59999999998934`.

- [ ] **Шаг 3. Реализация**

- Правка `src/ball.js`:

````diff
diff --git a/src/ball.js b/src/ball.js
--- a/src/ball.js
+++ b/src/ball.js
@@ -17,10 +17,12 @@ const ball = {
 };
 function radiusFor(m) { return MASS_R0 + MASS_RK * (clamp(m, 1, MASS_RCAP) - 1); }
 // прыжок к точке (tx, ty): вершина дуги низа Тефы на AIM_MARGIN выше ty; горизонталь рассчитана так, чтобы на спуске
-// низ пересёк уровень ty ровно над tx — игрок тапает туда, куда хочет ПРИЗЕМЛИТЬСЯ
+// низ пересёк уровень ty ровно над tx — игрок тапает туда, куда хочет ПРИЗЕМЛИТЬСЯ. Спуск считается от реальной высоты
+// цели: для цели на том же уровне или ниже дуга зажата в JUMP_MIN_H, и падать до неё дольше, чем AIM_MARGIN
 function aimJump(bx, by, r, tx, ty) {
-  const dy = clamp(by + r - ty + AIM_MARGIN, JUMP_MIN_H, JUMP_MAX_H);
-  const vy = -Math.sqrt(2 * GRAV * dy), tUp = -vy / GRAV, tDown = Math.sqrt(2 * AIM_MARGIN / GRAV);
+  const rise = by + r - ty; // на сколько точка тапа выше низа Тефы; ниже нуля — цель ниже
+  const dy = clamp(rise + AIM_MARGIN, JUMP_MIN_H, JUMP_MAX_H);
+  const vy = -Math.sqrt(2 * GRAV * dy), tUp = -vy / GRAV, tDown = Math.sqrt(2 * Math.max(0, dy - rise) / GRAV);
   const t = tUp + tDown;
   const vx = clamp((tx - bx) / t, -VX_MAX, VX_MAX);
   return { vx, vy, t, dy };
````

- Правка `src/game.js`:

````diff
diff --git a/src/game.js b/src/game.js
--- a/src/game.js
+++ b/src/game.js
@@ -126,7 +126,8 @@ function updateRun(dt) {
   const prevBottom = ball.y + ball.r, wasOn = ball.onPlatform;
   if (ball.onPlatform === null) { ball.vy += GRAV * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; }
   if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.6; } else if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.6; }
-  for (const e of updatePlatforms(dt, tower.platforms, tp)) if (e.type === 'burn') {
+  for (const e of updatePlatforms(dt, tower.platforms, tp)) {
+    if (e.type === 'crumble') { burst(e.p.x, e.p.y, '#f6c343', 16, 200, 0.6, 4); continue; } // сыр раскрошился
     if (isBerserk()) continue; // спека §4.4: в берсерке Тефа не горит — ни урона, ни подброса; таймер сковородки уже сброшен в platforms.js
     damage(1, 'pan', e.p.x, e.p.y + 40);
     if (!ball.alive) return;
````

- Правка `src/platforms.js`:

````diff
diff --git a/src/platforms.js b/src/platforms.js
--- a/src/platforms.js
+++ b/src/platforms.js
@@ -1,8 +1,9 @@
 'use strict';
-// ---------- платформы: посадка сверху (swept), стояние, поднос, сковородка с таймером ----------
+// ---------- платформы: посадка сверху (swept), стояние, поднос, сковородка с таймером, крошащийся сыр ----------
 const PAN_TIME = 2;      // с до ожога на сковородке (черновик)
 const PAN_MIN = 0.5;     // ниже таймер не опускается при любом жаре башни
 const LAND_TOL = 0.35;   // доля радиуса, на которую Тефа может свисать с края и всё ещё стоять
+const CHEESE_T = 0.5, CHEESE_BACK = 3; // сыр крошится через 0.5 с после посадки и отрастает через 3 с (спека v2.1.1 §6.3)
 function panTime(tp) { return Math.max(PAN_MIN, PAN_TIME + 0.25 * ((save.up && save.up.crust) || 0) - ((tp && tp.heat) || 0)); }
 function platformById(platforms, id) { return id === null || id === undefined ? null : platforms.find(p => p.id === id) || null; }
 function overPlatform(p) { return Math.abs(ball.x - p.x) <= p.w / 2 + ball.r * LAND_TOL; }
@@ -13,13 +14,13 @@ function tryLand(platforms, prevBottom) {
   const bottom = ball.y + ball.r;
   let best = null;
   for (const p of platforms) {
-    if (Math.abs(p.y - ball.y) > 240 || !overPlatform(p)) continue;
+    if (p.gone || Math.abs(p.y - ball.y) > 240 || !overPlatform(p)) continue;
     if (prevBottom <= p.y + 2 && bottom >= p.y && (!best || p.y < best.y)) best = p;
   }
   if (best) landOn(best);
   return best;
 }
-// движение подносов, нагрев сковородок, удержание стоящей Тефы. Возвращает события [{ type: 'burn', p }]
+// движение подносов, нагрев сковородок, крошение сыра, удержание стоящей Тефы. События: [{ type: 'burn' | 'crumble', p }]
 function updatePlatforms(dt, platforms, tp) {
   const ev = [];
   const standing = platformById(platforms, ball.onPlatform);
@@ -31,9 +32,15 @@ function updatePlatforms(dt, platforms, tp) {
     } else if (p.type === 'pan') {
       if (p === standing) { p.hotT = (p.hotT || 0) + dt; if (p.hotT >= panTime(tp)) { p.hotT = 0; ev.push({ type: 'burn', p }); } }
       else p.hotT = Math.max(0, (p.hotT || 0) - dt * 2);
+    } else if (p.type === 'cheese') { // посадка запускает крошение; пропавший сыр не ловит, пока не отрастёт
+      if (p.gone) { p.backT -= dt; if (p.backT <= 0) { p.gone = false; p.crumbleT = 0; } }
+      else {
+        if (p === standing && !(p.crumbleT > 0)) p.crumbleT = CHEESE_T;
+        if (p.crumbleT > 0) { p.crumbleT -= dt; if (p.crumbleT <= 0) { p.crumbleT = 0; p.gone = true; p.backT = CHEESE_BACK; ev.push({ type: 'crumble', p }); } }
+      }
     }
   }
-  if (standing) { if (!overPlatform(standing)) ball.onPlatform = null; else { ball.y = standing.y - ball.r; ball.vy = 0; } }
+  if (standing) { if (standing.gone || !overPlatform(standing)) ball.onPlatform = null; else { ball.y = standing.y - ball.r; ball.vy = 0; } }
   return ev;
 }
 // доля до ожога для рендера: делим на реальный таймер, а не на базовый —
````

- Правка `src/render.js`:

````diff
diff --git a/src/render.js b/src/render.js
--- a/src/render.js
+++ b/src/render.js
@@ -34,6 +34,14 @@ function drawPlatform(p) {
     ctx.fillStyle = `rgba(255,${(90 - heat * 60) | 0},20,${0.15 + heat * 0.6})`; ctx.beginPath(); ctx.ellipse(p.x, y + 8, p.w / 2 - 14, 9, 0, 0, 7); ctx.fill();
     ctx.strokeStyle = '#3d3734'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x + p.w / 2, y + 8); ctx.lineTo(p.x + p.w / 2 + 40, y + 2); ctx.stroke(); // ручка
     if (heat > 0.3) { ctx.fillStyle = `rgba(255,255,255,${(heat - 0.3) * 0.4})`; for (let i = 0; i < 3; i++) { const t = (tGame * 1.5 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(p.x - 20 + i * 20 + Math.sin(t * 6) * 6, y - 10 - t * 40, 6 + t * 6, 0, 7); ctx.fill(); } } // дымок
+  } else if (p.type === 'cheese') { // ломтик сыра: жёлтый с дырками; крошится — дрожит; пропал — пунктир до возврата
+    if (p.gone) { ctx.strokeStyle = 'rgba(246,195,67,0.3)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); rrect(p.x - p.w / 2, y - 4, p.w, 16, 5); ctx.stroke(); ctx.setLineDash([]); return; }
+    const sh = p.crumbleT > 0 ? Math.sin(tGame * 60) * 2 : 0;
+    ctx.save(); ctx.translate(p.x + sh, y);
+    ctx.fillStyle = '#f6c343'; rrect(-p.w / 2, -4, p.w, 16, 5); ctx.fill();
+    ctx.fillStyle = '#dca531'; rrect(-p.w / 2, 7, p.w, 5, 3); ctx.fill(); // корочка снизу
+    ctx.fillStyle = '#c98f22'; for (const [hx, hy, hr] of [[-0.3, 3, 4], [0.05, 1, 3], [0.32, 4, 3.5]]) { ctx.beginPath(); ctx.arc(hx * p.w, hy, hr, 0, 7); ctx.fill(); } // дырки
+    ctx.restore();
   } else { // поднос
     ctx.fillStyle = '#b08d5a'; rrect(p.x - p.w / 2, y - 4, p.w, 18, 6); ctx.fill();
     ctx.fillStyle = '#8a6a3e'; rrect(p.x - p.w / 2 + 6, y, p.w - 12, 10, 4); ctx.fill();
````

- [ ] **Шаг 4. Убедиться, что всё зелёное**

Run: `npm test`

Expected: одиннадцать строк `… ok` (`test_core` … `test_render`, `smoke`), из шума только два блока `YaGames.init failed, using stub …` от `test_sdk`.

- [ ] **Шаг 5. Коммит**

````bash
git add src/ball.js src/game.js src/platforms.js src/render.js tools/test_jump.js tools/test_platforms.js tools/test_render.js
git commit -m "feat: ломтик сыра и точный прицел с учётом высоты цели" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
````

---

## Task 6. Башня из фрагментов (спека §6, §7.3)

`buildTower(N)` собирает ряды между чекпоинтами из фрагментов: ступени, пропасть с площадкой отдыха и дугой еды, перелёт вбок, развилка. Генератор пишет безопасный путь `path`. Бот `tools/bot.js` проходит по нему башни 1–100 настоящими прыжками без режима бога прямо в `npm test`, около секунды на все сто. У ножа свой шанс в пропасти, со второй башни в каждой башне с пропастью хотя бы один нож.

**Files:**
- Modify: `src/tower.js`
- Modify: `tools/shot.js`
- Test: `tools/bot.js`
- Test: `tools/smoke.js`
- Test: `tools/test_game.js`
- Test: `tools/test_jump.js`
- Test: `tools/test_tower.js`

**Interfaces:**
- Consumes: `aimJump` из задачи 5 (бот целится им же), `CHEESE_T`, сыр из задачи 5.
- Produces:
  - `buildTower(N)` → `{ tp, platforms, hazards, items, path }`; `path` — id платформ от старта до крыши.
  - Новые поля `towerParams(N)`: `gapMax`, `wMin`, `wMax`, `mix`, `frag`, `pKnife`.
  - Флаг `platform.rest` у площадок отдыха.
  - В DBG: `X_MIN`, `X_MAX`, `PATH_MAX_ROWS`, `CP_EVERY`; `REACH_X` удалён.
  - `tools/bot.js`: `nextOnPath(d)`, `botAct(d, st)`, `climb(g, d, { noHazards, untilRow, maxFrames })`.

- [ ] **Шаг 1. Тесты**

Внести правки тестов. Код игры в этом шаге не трогать.

- Создать `tools/bot.js` целиком:

````js
// tools/bot.js — бот проходит башню по безопасному пути генератора настоящей физикой игры: прицел, полёт, посадка.
// Прыжок с платформы и не больше одного в воздухе. Опасности и мух отключает вызывающий (opts.noHazards).
const clampN = (v, a, b) => v < a ? a : v > b ? b : v;
const aimX = p => p.type === 'tray' ? (p.x0 + p.x1) / 2 : p.x; // поднос ловим в середине хода: за полёт он сдвинется не дальше 40 px
function nextOnPath(d) {
  const P = d.platforms, path = d.tower.path, cur = P.find(p => p.id === d.ball.onPlatform);
  if (!cur) return null;
  let i = path.indexOf(cur.id);
  if (i < 0) { const byId = new Map(P.map(p => [p.id, p])); i = path.findIndex(id => byId.get(id).row > cur.row) - 1; } // сошли с пути: догоняем его
  return P.find(p => p.id === path[i + 1]) || null;
}
// одно решение за кадр; st — память бота между кадрами
function botAct(d, st) {
  const b = d.ball;
  if (b.onPlatform !== null) {
    const next = nextOnPath(d); if (!next) return false;
    st.next = next; st.second = false;
    const tx = aimX(next), a = d.aimJump(b.x, b.y, b.r, tx, next.y), rise = b.y + b.r - next.y;
    st.double = !(rise <= d.JUMP_MAX_H - d.AIM_MARGIN && Math.abs(a.vx) < d.VX_MAX - 1);
    if (!st.double) return d.jumpTo(tx, next.y);
    return d.jumpTo(b.x + clampN((tx - b.x) * 0.5, -250, 250), b.y + b.r - 400); // первый из двух: вершина как можно выше, полпути вбок
  }
  if (st.double && !st.second && st.next && b.vy >= -30) { st.second = true; return d.jumpTo(aimX(st.next), st.next.y); } // второй — у вершины
  return false;
}
// подъём до крыши (или до ряда opts.untilRow); g — стенд с кадрами (g.step), без него шаги update(1/60)
function climb(g, d, opts = {}) {
  const st = {}, max = opts.maxFrames || 80000;
  for (let i = 0; i < max && d.state === 'play'; i++) {
    if (opts.noHazards) { d.hazards.length = 0; d.resetFlies(); }
    if (opts.untilRow !== undefined) { const p = d.platforms.find(q => q.id === d.ball.onPlatform); if (p && p.row >= opts.untilRow) break; }
    botAct(d, st);
    if (g) g.step(); else d.update(1 / 60);
  }
  return d.state;
}
module.exports = { botAct, climb, aimX, nextOnPath };
````

- Правка `tools/smoke.js`:

````diff
diff --git a/tools/smoke.js b/tools/smoke.js
--- a/tools/smoke.js
+++ b/tools/smoke.js
@@ -5,18 +5,11 @@ const { fakeYaGames } = require('./test_sdk');
 const noop = () => {};
 const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
 const dist = process.argv.includes('--dist');
+const bot = require('./bot');
 const btn = (d, id) => d.buttons.find(b => b.id === id);
 const steps = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
-// поднимается по ближайшей платформе следующего ряда; god-режим: урон и падение не мешают проверить путь генератора
-function climb(g, d, maxFrames = 20000) {
-  d.setGod(true);
-  for (let i = 0; i < maxFrames && d.state === 'play'; i++) {
-    const p = d.platforms.find(q => q.id === d.ball.onPlatform);
-    if (p && !p.roof) { const next = d.platforms.filter(q => q.row === p.row + 1).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; d.jumpTo(next.x, next.y); }
-    g.step();
-  }
-  d.setGod(false);
-}
+// подъём до крыши по безопасному пути генератора; god-режим: урон и падение не мешают проверить поток экранов
+function climb(g, d) { d.setGod(true); bot.climb(g, d); d.setGod(false); }
 async function runFlow(opts) {
   const g = require('./_env')(ctx, Object.assign({ dist }, opts)); const d = g.dbg();
   g.step(); // кадр до загрузки — экран «Загрузка…» не падает
@@ -79,11 +72,7 @@ async function runClimbNoGod() {
   const play = btn(d, 'play'); g.tap(play.x, play.y); await g.flush();
   d.hazards.length = 0; d.resetPours(1e9);         // опасности и масло сняты: проверяем путь генератора, а не уклонение
   const rnd0 = Math.random; Math.random = () => 1;  // муха по серии не влетает; тап каждый кадр — лени тоже нет
-  for (let i = 0; i < 20000 && d.state === 'play'; i++) {
-    const p = d.platforms.find(q => q.id === d.ball.onPlatform);
-    if (p && !p.roof) { const next = d.platforms.filter(q => q.row === p.row + 1).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; d.jumpTo(next.x, next.y); }
-    g.step();
-  }
+  bot.climb(g, d, { noHazards: true });
   Math.random = rnd0;
   assert.strictEqual(d.state, 'finish', 'башня 1 проходима без god');
   assert.strictEqual(d.run.deaths, 0);
````

- Правка `tools/test_game.js`:

````diff
diff --git a/tools/test_game.js b/tools/test_game.js
--- a/tools/test_game.js
+++ b/tools/test_game.js
@@ -1,5 +1,6 @@
 // node tools/test_game.js — забег: старт, прыжок и заряды, посадка и шкала силы, урон и смерть, лечение, продолжить, чекпоинт, финиш и рейтинг, еда, суперсила, мухи, god-режим
 const assert = require('assert');
+const bot = require('./bot');
 const noop = () => {};
 const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
 (async () => {
@@ -15,10 +16,11 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   // прыжок тратит заряд; в воздухе ещё два; без зарядов — нет
   assert.ok(d.jumpTo(300, -200)); assert.strictEqual(ball.charges, 2); assert.strictEqual(ball.onPlatform, null); assert.ok(ball.vy < 0);
   assert.ok(d.jumpTo(300, -300)); assert.ok(d.jumpTo(300, -400)); assert.strictEqual(d.jumpTo(300, -500), false, 'заряды кончились');
-  // посадка на платформу ряда 1: заряды полные, шкала и серия для мух +1 за первую посадку, повтор не растит
-  d.startTower(1); d.state = 'play'; const p1 = d.platforms.find(p => p.row === 1);
-  for (const it of d.items) it.dead = true; d.setGod(true); // еда и масло по пути не должны влиять на проверку посадки
-  d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id), 'села на платформу ряда 1'); assert.strictEqual(ball.charges, 3); assert.strictEqual(d.power.v, 1); assert.strictEqual(d.power.flyStreak, 1);
+  // посадка на первую платформу пути: заряды полные, шкала и серия для мух +1 за первую посадку, повтор не растит
+  d.startTower(1); d.state = 'play'; const p1 = d.platforms.find(p => p.id === d.tower.path[1]);
+  for (const it of d.items) it.dead = true; d.resetPours(1e9); d.setGod(true); // еда и масло по пути не должны влиять на проверку посадки
+  { const st = {}; for (let i = 0; i < 300 && ball.onPlatform !== p1.id; i++) { bot.botAct(d, st); d.update(0.016); } }
+  assert.strictEqual(ball.onPlatform, p1.id, 'села на первую платформу пути'); assert.strictEqual(ball.charges, 3); assert.strictEqual(d.power.v, 1); assert.strictEqual(d.power.flyStreak, 1);
   d.jumpTo(p1.x, p1.y); assert.ok(untilOn(p1.id)); assert.strictEqual(d.power.v, 1, 'та же платформа шкалу не растит'); d.setGod(false);
   // урон: −1 масса, неуязвимость, четверть шкалы и серия для мух сняты, отброс; повтор в неуязвимости не проходит; ноль массы — смерть с банком монет
   d.setRunCoins(7); const earned0 = d.save.earned; d.YG.gameplayStart();
````

- Правка `tools/test_jump.js`:

````diff
diff --git a/tools/test_jump.js b/tools/test_jump.js
--- a/tools/test_jump.js
+++ b/tools/test_jump.js
@@ -25,7 +25,7 @@ const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addCol
   // зажим горизонтали
   assert.strictEqual(aimJump(0, 0, r, 480, -150).vx, VX_MAX); assert.strictEqual(aimJump(480, 0, r, 0, -150).vx, -VX_MAX);
   // достижимость ряда: |Δx| = 180 при подъёме на ряд (120) не упирается в VX_MAX
-  const a = aimJump(100, -100 - r, r, 280, -220); assert.ok(Math.abs(a.vx) < VX_MAX, 'REACH_X 180 без зажима: ' + a.vx);
+  const a = aimJump(100, -100 - r, r, 280, -220); assert.ok(Math.abs(a.vx) < VX_MAX, 'сдвиг 180 на ряд без зажима: ' + a.vx);
   f = fly(100, -100 - r, r, 280, -220); assert.ok(Math.abs(f.x - 280) < 4, 'ряд выше достижим: ' + f.x);
   // новые поля тела
   assert.strictEqual(d.ball.charges, 3); assert.strictEqual(d.ball.onPlatform, null); assert.strictEqual(d.ball.sq, 0);
````

- Заменить `tools/test_tower.js` целиком (правок больше половины файла):

````js
// node tools/test_tower.js — башня из фрагментов: детерминизм, параметры роста, структура и путь, края поля, доли платформ,
// лопасти и ножи, еда; бот проходит башни 1–100 без режима бога (спека v2.1.1 §6)
const assert = require('assert');
const bot = require('./bot');
const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
(async () => {
  const g = require('./_env')(ctx); const d = g.dbg(); await d.YG.init(); await d.loadSave();
  const t1 = d.buildTower(1), t1b = d.buildTower(1), t2 = d.buildTower(2);
  assert.strictEqual(JSON.stringify(t1), JSON.stringify(t1b), 'одинаковая раскладка при том же N');
  assert.notStrictEqual(JSON.stringify(t1.platforms), JSON.stringify(t2.platforms), 'другая башня — другая раскладка');
  // параметры роста
  const p1 = d.towerParams(1), p5 = d.towerParams(5), p9 = d.towerParams(9), p50 = d.towerParams(50);
  assert.strictEqual(p1.rows, 45); assert.strictEqual(p50.rows, 160); assert.strictEqual(p9.dmg, undefined, 'урон не растёт с номером башни');
  assert.ok(p9.pHaz > p1.pHaz && p9.heat > p1.heat && p9.flySpeed > p1.flySpeed); assert.strictEqual(p1.par, 45 * 2.4); assert.strictEqual(p1.height, 45 * d.ROW_H);
  assert.strictEqual(p1.gapMax, 2); assert.strictEqual(p5.gapMax, 3, 'с башни 5 пропасть до 3 пустых рядов');
  assert.deepStrictEqual([p1.wMin, p1.wMax], [100, 140]); assert.deepStrictEqual([p50.wMin, p50.wMax], [80, 110], 'платформы уже, не меньше 80');
  assert.strictEqual(p1.mix.cheese, 0, 'сыр со второй башни'); assert.ok(d.towerParams(2).mix.cheese > 0);
  assert.ok(p50.frag.steps < p1.frag.steps, 'с номером башни ступеней меньше, остальных фрагментов больше');
  assert.ok(d.towerParams(2).pKnife >= 0.4 && d.towerParams(20).pKnife > d.towerParams(2).pKnife && d.towerParams(100).pKnife <= 0.85, 'шанс ножа в пропасти растёт, не выше 0.85');
  // структура: старт, чекпоинты, крыша, ряды через ROW_H, путь от старта до крыши
  const P1 = t1.platforms;
  assert.ok(P1[0].start && P1[0].y === 0 && P1[0].x === 240);
  const roof = P1.find(p => p.roof); assert.ok(roof && roof.row === 45 && roof.w === 360);
  assert.deepStrictEqual(P1.filter(p => p.cp).map(p => p.cp), [1, 2], 'чекпоинты на рядах 20 и 40');
  for (const p of P1) assert.ok(p.y === -p.row * d.ROW_H, 'ряд ' + p.row + ' на своей высоте'); // === , а не strictEqual: для ряда 0 сравниваем 0 и −0
  assert.strictEqual(t1.path[0], P1[0].id); assert.strictEqual(t1.path.at(-1), roof.id);
  // правила для башен 1–100
  const share = { plate: 0, pan: 0, tray: 0, cheese: 0 }, r8 = d.radiusFor(8); let air = 0, links = 0;
  for (let N = 1; N <= 100; N++) {
    const t = d.buildTower(N), P = t.platforms, byId = new Map(P.map(p => [p.id, p]));
    for (const p of P) {
      if (!(p.cp || p.roof || p.start)) assert.ok(p.x - p.w / 2 >= 20 && p.x + p.w / 2 <= 460, 'башня ' + N + ': платформа в поле');
      if (p.type === 'tray') assert.ok(p.x0 - p.w / 2 >= 20 - 1e-9 && p.x1 + p.w / 2 <= 460 + 1e-9, 'башня ' + N + ': поднос не выезжает за поле');
      if (p.type === 'pan') assert.ok(p.row >= 3, 'сковородок нет в рядах 1–2');
      if (p.rest) assert.ok(p.type === 'plate' && p.w === 180, 'площадка отдыха — широкая тарелка');
      if (!(p.cp || p.roof || p.start || p.rest)) share[p.type]++;
    }
    if (N === 1) assert.ok(P.filter(p => p.type === 'tray').every(p => p.speed >= 40 && p.speed <= 70), 'поднос в башне 1 медленный: 40–70 px/с');
    if (N === 1) { assert.ok(!P.some(p => p.type === 'cheese'), 'сыра нет в башне 1'); assert.strictEqual(t.hazards.length, 0, 'в башне 1 опасностей в раскладке нет'); }
    if (N === 2) assert.ok(!t.hazards.some(h => h.type === 'blades'), 'лопасти не раньше башни 3');
    // нож висит поперёк пропасти: в его ряду нет ни одной платформы, удар до уровня ряда никого на ступени не заденет
    for (const h of t.hazards) if (h.type === 'knife') assert.ok(!P.some(p => p.y === h.y), 'башня ' + N + ': нож в пустом ряду');
    // со второй башни в каждой башне с пропастью есть нож: первый гарантирован, игрок знакомится с ним сразу
    const hasGap = t.path.some((id, i) => i > 0 && byId.get(id).rest && byId.get(id).row - byId.get(t.path[i - 1]).row >= 3);
    if (N >= 2 && hasGap) assert.ok(t.hazards.some(h => h.type === 'knife'), 'башня ' + N + ': есть нож');
    // путь: растёт вверх, соседние платформы не дальше PATH_MAX_ROWS рядов — два прыжка за полёт
    assert.strictEqual(new Set(t.path).size, t.path.length, 'путь без повторов');
    for (let i = 1; i < t.path.length; i++) {
      const a = byId.get(t.path[i - 1]), b = byId.get(t.path[i]);
      assert.ok(b.row > a.row && b.row - a.row <= d.PATH_MAX_ROWS, 'башня ' + N + ': шаг пути ' + a.row + '→' + b.row);
      links++; if (b.row - a.row >= 3 || Math.abs(b.x - a.x) > 260) air++;
    }
    // лопасти: не чаще раза на 15 рядов; ступень под ними у края, стоящая Тефа массы 8 их не достаёт
    const bl = t.hazards.filter(h => h.type === 'blades');
    const blRows = bl.map(h => (-h.y - 60) / d.ROW_H).sort((a, b) => a - b);
    for (let k = 1; k < blRows.length; k++) assert.ok(blRows[k] - blRows[k - 1] >= 15, 'лопасти не чаще раза на 15 рядов');
    for (const h of bl) for (const p of P) {
      if (Math.abs(p.y - (h.y + 60)) > d.ROW_H) continue;
      if (p.y === h.y + 60) assert.ok(p.x <= 140 || p.x >= 340, 'башня ' + N + ': ступень у лопастей отодвинута к краю');
      for (const x of p.type === 'tray' ? [p.x0, p.x, p.x1] : [p.x]) assert.ok(Math.hypot(x - h.x, (p.y - r8) - h.y) > r8 + d.BLADES_R, 'башня ' + N + ': стоящая Тефа не достаёт лопасти');
    }
    assert.ok(t.items.length > 0 && t.items.every(it => d.FOOD_KINDS[it.kind] && !it.dead));
  }
  const typed = share.plate + share.pan + share.tray + share.cheese;
  assert.ok(Math.abs(share.plate / typed - 0.5) < 0.05, 'простых тарелок около половины: ' + (share.plate / typed).toFixed(2));
  assert.ok(air / links > 0.1, 'прыжок в воздухе нужен регулярно: ' + (air / links).toFixed(2));
  // в первых 10 башнях есть все типы
  const all = []; for (let N = 1; N <= 10; N++) all.push(d.buildTower(N));
  for (const ty of ['knife', 'blades']) assert.ok(all.some(t => t.hazards.some(h => h.type === ty)), 'есть ' + ty);
  const kn26 = all.slice(1, 6).reduce((s, t) => s + t.hazards.filter(h => h.type === 'knife').length, 0);
  assert.ok(kn26 >= 5, 'в башнях 2–6 ножи встречаются регулярно: ' + kn26);
  assert.ok(!all.some(t => t.hazards.some(h => h.type === 'oil')), 'масла в раскладке нет');
  for (const ty of ['pan', 'tray', 'cheese']) assert.ok(all.some(t => t.platforms.some(p => p.type === ty)), 'есть ' + ty);
  // бот проходит башни 1–100 по пути без режима бога: опасности, масло и мухи выключены — проверяем раскладку и прыжки
  const r0 = Math.random; Math.random = () => 1; // мухи по серии не влетают
  for (let N = 1; N <= 100; N++) {
    d.startTower(N); d.state = 'play'; d.resetPours(1e9);
    bot.climb(null, d, { noHazards: true });
    assert.strictEqual(d.state, 'finish', 'башня ' + N + ' проходима без режима бога'); assert.strictEqual(d.run.deaths, 0);
  }
  Math.random = r0;
  // seeded RNG стабилен
  const R = d.mulberry32(7); const a = [R(), R(), R()]; const R2 = d.mulberry32(7); assert.deepStrictEqual(a, [R2(), R2(), R2()]);
  assert.ok(a.every(v => v >= 0 && v < 1));
  console.log('test_tower ok');
})().catch(e => { console.error(e); process.exit(1); });
````

- [ ] **Шаг 2. Убедиться, что тесты падают**

Run: `npm test`

Expected: FAIL. `test_tower` падает первым после `test_jump ok`: `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: undefined !== 2` (у `towerParams(1)` нет `gapMax`).

- [ ] **Шаг 3. Реализация**

- Заменить `src/tower.js` целиком (правок больше половины файла):

````js
'use strict';
// ---------- башня N: параметры роста и генерация из фрагментов (ступени, пропасть, перелёт, развилка) ----------
// Все числа черновые (спека v2.1.1 §6). Башня собирается по сиду N. Генератор пишет безопасный путь path: id платформ
// от старта до крыши, где каждую следующую можно достать не больше чем двумя прыжками за полёт (с платформы и один
// в воздухе), так что один заряд из трёх остаётся в запасе.
const ROW_H = 120;          // шаг рядов, px
const CP_EVERY = 20;        // чекпоинт каждые 20 рядов
const KNIFE_CYCLE = 2.1;    // нож: пауза 1.2 + замах 0.6 + удар 0.3
const X_MIN = 70, X_MAX = 410; // центры обычных платформ; итоговый центр ещё зажимается по ширине, чтобы края были в [20, 460]
const EDGE = 20;          // платформа не подходит к краю поля ближе 20 px
const PATH_MAX_ROWS = 4;    // самый большой подъём между соседними платформами пути: 480 px, два прыжка дают ≈ 536
const FOOD_KINDS = { ketchup: { r: 15, coins: 1, w: 5 }, pasta: { r: 17, coins: 2, w: 4 }, meat: { r: 21, coins: 3, w: 2 } };
const FOOD_COLOR = { ketchup: '#e3342f', pasta: '#f6c343', meat: '#b5452b' };
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function towerParams(N) {
  const rows = Math.min(40 + 5 * N, 160), steps = Math.max(0.2, 0.4 - 0.01 * (N - 1)), other = 1 - steps;
  return { N, rows, height: rows * ROW_H, heat: Math.min(0.05 * N, 1.5), speedMul: 1 + 0.03 * N, flySpeed: 220 + 5 * N,
    pHaz: Math.min(0.15 + 0.02 * N, 0.6), pKnife: Math.min(0.85, 0.4 + 0.03 * (N - 2)), foodPerRow: Math.max(0.35, 0.8 - 0.01 * N),
    gapMax: N >= 5 ? 3 : 2, wMin: Math.max(80, 101 - N), wMax: Math.max(110, 141 - N),
    mix: N === 1 ? { plate: 0.5, pan: 0.25, tray: 0.25, cheese: 0 } : { plate: 0.5, pan: 0.2, tray: 0.15, cheese: 0.15 },
    frag: { steps, gap: other * 25 / 60, side: other * 15 / 60, fork: other * 20 / 60 },
    par: rows * 2.4, coinMul: 1 + 0.05 * (N - 1), theme: 'kitchen' };
}
function pickKind(R) { let sum = 0; for (const k in FOOD_KINDS) sum += FOOD_KINDS[k].w; let t = R() * sum; for (const k in FOOD_KINDS) { t -= FOOD_KINDS[k].w; if (t <= 0) return k; } return 'ketchup'; }
function mkFood(R, x, y) { const kind = pickKind(R); return { kind, x, y, r: FOOD_KINDS[kind].r, seed: R() * 10, dead: false }; }
// buildTower(N) → { tp, platforms, hazards, items, path }; одинаково при каждом вызове с тем же N (сид = N)
function buildTower(N) {
  const tp = towerParams(N), R = mulberry32(N * 7919 + 17), rr = (a, b) => a + R() * (b - a), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const platforms = [], hazards = [], items = [], path = [];
  let id = 0, hid = 1, lastBlades = -99;
  const knifeSlots = []; // пропасти без ножа: из первой берётся гарантированный нож башни
  const food = (x, y) => items.push(mkFood(R, clamp(x, 30, W - 30), y));
  const pickType = row => { const m = tp.mix, q = R(); const t = q < m.plate ? 'plate' : q < m.plate + m.pan ? 'pan' : q < m.plate + m.pan + m.tray ? 'tray' : 'cheese'; return t === 'pan' && row < 3 ? 'plate' : t; };
  const add = (row, type, x, w, extra) => {
    const p = Object.assign({ id: id++, row, type, x, y: -row * ROW_H, w, cp: 0 }, extra || {});
    if (type === 'tray') { p.x0 = Math.max(EDGE + w / 2, x - 40); p.x1 = Math.min(W - EDGE - w / 2, x + 40); p.dir = 1; p.speed = N === 1 ? rr(40, 70) : rr(60, 120) * tp.speedMul; }
    platforms.push(p); return p;
  };
  const plat = (row, x) => { const w = rr(tp.wMin, tp.wMax); return add(row, pickType(row), clamp(x, Math.max(X_MIN, EDGE + w / 2), Math.min(X_MAX, W - EDGE - w / 2)), w); };
  const rest = (row, x) => add(row, 'plate', clamp(x, EDGE + 90, W - EDGE - 90), 180, { rest: true }); // площадка отдыха шириной 180
  const walk = p => { path.push(p.id); return p; };
  const arc = (a, b, n) => { for (let j = 1; j <= n; j++) { const t = j / (n + 1); food(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t - 70 - 90 * Math.sin(Math.PI * t)); } };
  // лопасти в центре ряда, ступень уходит к краю (у подноса — весь ход): стоящая Тефа массы до 8 (r = 54) их не задевает,
  // hypot(240 − 140, 60 − 54) ≈ 100 > 54 + 36
  const bladesAt = q => {
    if (q.type === 'tray') { q.type = 'plate'; delete q.x0; delete q.x1; delete q.dir; delete q.speed; } // у лопастей поднос не ездит
    q.x = q.x < W / 2 ? Math.min(q.x, 140) : Math.max(q.x, 340);
    hazards.push({ id: hid++, type: 'blades', x: W / 2, y: q.y - 60, ang: 0, gone: false }); lastBlades = q.row;
  };
  // фрагменты: начинаются с платформы пути cur, возвращают последнюю платформу пути, выше ряда lim не ставят ничего
  const steps = (cur, k, lim) => { // ступени зигзагом, иногда через ряд
    let p = cur, dir = p.x < W / 2 ? 1 : -1;
    for (let i = 0; i < k && p.row + 1 <= lim; i++) {
      const up = i < k - 1 && p.row + 2 <= lim && R() < 0.25 ? 2 : 1;
      let nx = p.x + dir * rr(120, 200); if (nx < X_MIN || nx > X_MAX) { dir = -dir; nx = p.x + dir * rr(120, 200); }
      const q = walk(plat(p.row + up, nx));
      if (N >= 3 && q.row - lastBlades >= 15 && R() < tp.pHaz * 0.5) bladesAt(q);
      if (R() < tp.foodPerRow) food(q.x, q.y - rr(50, 90));
      p = q; dir = -dir;
    }
    return p;
  };
  const knife = (x, ky) => hazards.push({ id: hid++, type: 'knife', x, y: ky, t: R() * KNIFE_CYCLE, phase: 'rest', by: ky - 150 });
  const gap = (cur, e) => { // e пустых рядов, за ними площадка отдыха; нож поперёк полёта в среднем пустом ряду, дуга еды в пустоте
    const q = walk(rest(cur.row + e + 1, cur.x + rr(-150, 150)));
    const kx = (cur.x + q.x) / 2, ky = -(cur.row + Math.ceil((e + 1) / 2)) * ROW_H;
    if (N >= 2) { if (R() < tp.pKnife) knife(kx, ky); else knifeSlots.push([kx, ky]); }
    if (R() < 0.5) arc(cur, q, ri(3, 5));
    return q;
  };
  const side = (cur, lim) => { // перелёт вбок: следующая платформа дальше, чем достаёт один прыжок
    let p = cur;
    if (p.x > 140 && p.x < 340) { // из середины перелёта не выйдет: сначала ступень к краю
      if (p.row + 2 > lim) return steps(p, 1, lim);
      p = walk(plat(p.row + 1, p.x < W / 2 ? rr(X_MIN, 110) : rr(370, X_MAX)));
    }
    const q = walk(plat(p.row + 1, p.x + (p.x < W / 2 ? 1 : -1) * rr(300, 340)));
    if (R() < tp.foodPerRow) food((p.x + q.x) / 2, q.y - 110); // еда над перелётом
    return q;
  };
  const fork = (cur, g) => { // развилка: короткий путь через пропасть с едой, длинный по ступеням; сходятся на широкой тарелке
    const J = rest(cur.row + g + 1, cur.x + rr(-120, 120)), s = cur.x < W / 2 ? 1 : -1;
    let p = cur;
    for (let row = cur.row + 1; row < J.row; row++) { p = walk(plat(row, W / 2 + s * rr(80, 170))); if (R() < 0.3) food(p.x, p.y - rr(50, 90)); }
    walk(J); arc(cur, J, ri(3, 5));
    return J;
  };
  const pickFrag = () => { let q = R(); for (const k of ['steps', 'gap', 'side', 'fork']) { q -= tp.frag[k]; if (q <= 0) return k; } return 'steps'; };
  let cur = walk(add(0, 'plate', W / 2, 220, { start: true }));
  for (let cpRow = Math.min(CP_EVERY, tp.rows); ; cpRow = Math.min(cpRow + CP_EVERY, tp.rows)) {
    const lim = cpRow - 1;
    while (cpRow - cur.row > PATH_MAX_ROWS) {
      const room = lim - cur.row, f = pickFrag(), e = ri(2, tp.gapMax);
      if (f === 'gap' && e + 1 <= room) cur = gap(cur, e);
      else if (f === 'fork' && e + 1 <= room) cur = fork(cur, e);
      else if (f === 'side' && room >= 2) cur = side(cur, lim);
      else cur = steps(cur, ri(3, 5), lim);
    }
    const top = cpRow === tp.rows ? add(cpRow, 'plate', W / 2, 360, { roof: true }) : add(cpRow, 'plate', W / 2, 240, { cp: cpRow / CP_EVERY });
    cur = walk(top);
    if (top.roof) break;
  }
  if (N >= 2 && !hazards.some(h => h.type === 'knife') && knifeSlots.length) knife(...knifeSlots[0]); // первый нож башни гарантирован
  return { tp, platforms, hazards, items, path };
}
expose({ ROW_H, CP_EVERY, KNIFE_CYCLE, X_MIN, X_MAX, PATH_MAX_ROWS, FOOD_KINDS, FOOD_COLOR, mulberry32, towerParams, buildTower });
````

- Заменить `tools/shot.js` целиком (правок больше половины файла):

````js
// node tools/shot.js — скриншоты в shots/ через node-canvas (npm i -D canvas). Агент обязан ПОСМОТРЕТЬ каждый PNG, а не описывать код.
const fs = require('fs'), path = require('path'), { createCanvas } = require('canvas');
const OUT = path.join(__dirname, '..', 'shots'); fs.mkdirSync(OUT, { recursive: true });
const bot = require('./bot');
async function shoot(name, w, h, scenario, opts = {}) {
  const real = createCanvas(w, h), ctx = real.getContext('2d');
  const g = require('./_env')(ctx, Object.assign({ width: w, height: h }, opts));
  if (opts.store) for (const k of Object.keys(opts.store)) g.store.set(k, opts.store[k]);
  await g.boot(); await scenario(g, g.dbg());
  fs.writeFileSync(path.join(OUT, name + '.png'), real.toBuffer('image/png')); console.log('shots/' + name + '.png');
}
const steps = (g, n) => { for (let i = 0; i < n; i++) g.step(); };
// подъём ботом по пути генератора до ряда rows в god-режиме, потом стоим на платформе
async function up(g, d, rows) { d.state = 'play'; d.setGod(true); bot.climb(g, d, { untilRow: rows, maxFrames: 6000 }); d.setGod(false); }
const tower3 = { store: { teft_save: JSON.stringify({ v: 4, earned: 120, spent: 0, up: {}, skins: [], skin: 'none', tower: 3, log: { 1: { r: 'S', t: 95.2 }, 2: { r: 'B', t: 150 } }, cp: 0 }) } };
const play = async (g, d) => { await up(g, d, 6); steps(g, 10); };
// башня 3: поднимаемся под первые лопасти генератора; нож, муху и налив масла для кадра ставим к камере (правка сцены, не рендера)
const hazards = async (g, d) => {
  const bl = d.hazards.find(h => h.type === 'blades'); await up(g, d, bl ? Math.max(1, Math.round((-bl.y - 60) / d.ROW_H) - 2) : 18);
  d.spawnFly(true); d.flies[0].warnT = 0; d.flies[0].x = 60; d.flies[0].y = d.ball.y - 60;
  const kn = d.hazards.find(h => h.type === 'knife'); if (kn) { kn.x = 330; kn.y = d.ball.y - 220; kn.by = kn.y - 150; kn.t = 1.8; }
  d.startPour(d.ball.x + 80); steps(g, 8); };
const berserk = async (g, d) => { await up(g, d, 4); d.powerAdd(d.POWER_FULL); d.tryActivatePower(); d.spawnFly(false); d.flies[0].warnT = 0; d.flies[0].x = 380; d.flies[0].y = d.ball.y - 40; steps(g, 12); };
const dead = async (g, d) => { await up(g, d, 3); d.setRunCoins(23); d.die('fly'); steps(g, 60); };
const finish = async (g, d) => { d.state = 'play'; d.run.foodEaten = Math.round(d.run.foodTotal * 0.9); d.run.time = 80; d.setRunCoins(31); d.finishTower(); steps(g, 40); };
(async () => {
  await shoot('title', 480, 854, async g => { g.step(); });
  await shoot('title_cp', 480, 854, async g => { g.step(); }, { store: { teft_save: JSON.stringify({ v: 4, earned: 0, spent: 0, up: {}, skins: [], skin: 'none', tower: 2, log: { 1: { r: 'A', t: 120 } }, cp: 1 }) } });
  await shoot('play', 480, 854, play);
  await shoot('hazards', 480, 854, hazards, tower3);
  await shoot('berserk', 480, 854, berserk);
  await shoot('fly_warn', 480, 854, async (g, d) => { await up(g, d, 2); d.spawnFly(true); steps(g, 3); });
  await shoot('dead', 480, 854, dead);
  await shoot('finish', 480, 854, finish);
  await shoot('desktop', 1280, 720, play);
  await shoot('en_finish', 480, 854, finish, { lang: 'en-US' });
  await shoot('tr_dead', 480, 854, dead, { lang: 'tr-TR' });
})().catch(e => { console.error(e); process.exit(1); });
````

- [ ] **Шаг 4. Убедиться, что всё зелёное**

Run: `npm test`

Expected: одиннадцать строк `… ok` (`test_core` … `test_render`, `smoke`), из шума только два блока `YaGames.init failed, using stub …` от `test_sdk`.

- [ ] **Шаг 5. Посмотреть снимки**

`npm run shot`:
  - `shots/play.png`: платформы стоят реже и зигзагом, видны пропасти и дуга еды, Тефа стоит на платформе пути;
  - `shots/hazards.png`: сцена подняла Тефу ботом под лопасти башни 3; налив с половником под строкой «Башня N» и красным пунктиром.

Открыть PNG и посмотреть глазами, а не описывать код. Листы `shots/design_tefa_*.png` не перезаписывать.

- [ ] **Шаг 6. Коммит**

````bash
git add src/tower.js tools/bot.js tools/shot.js tools/smoke.js tools/test_game.js tools/test_jump.js tools/test_tower.js
git commit -m "feat: башня из фрагментов с безопасным путём и бот проходимости" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
````

---

## Task 7. Язык цветов и форм (спека §8)

Кетчуп рисуется ломтиком помидора с семенами и хвостиком, мясо — кусочком на косточке. У ножа и лопастей оранжево-красные акценты `#ff5a36`. Шкала силы копится янтарной со значком-молнией, чтобы её не путали с маслом (уточнение §16 спеки). Всплывающие надписи не налезают друг на друга, не вылезают за край и имеют тёмную обводку. Крошащийся сыр трескается и сыплет крошки.

**Files:**
- Modify: `src/fx.js`
- Modify: `src/render.js`
- Test: `tools/test_render.js`

**Interfaces:**
- Consumes: `drawPowerMeter`, `drawHazard`, `drawPlatform` и `drawItem` из прежних задач; `CHEESE_T` из задачи 5.
- Produces:
  - `drawItem` открыт в DBG;
  - `TEXT_RISE = 70` в `fx.js`;
  - `popText(x, y, str, color, big)` зажимает надпись в поле по оценке ширины и ставит её над свежими соседками;
  - у надписи новые поля `half` и `lh`.

- [ ] **Шаг 1. Тесты**

Внести правки тестов. Код игры в этом шаге не трогать.

- Правка `tools/test_render.js`:

````diff
diff --git a/tools/test_render.js b/tools/test_render.js
--- a/tools/test_render.js
+++ b/tools/test_render.js
@@ -1,8 +1,9 @@
 // node tools/test_render.js — рендер и экраны не падают на proxy-контексте; тексты HUD, титула, смерти и финиша; локализация
 const assert = require('assert');
 const noop = () => {};
-const texts = [];
-const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(String(s)) : /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop, set: () => true });
+const texts = [], styles = []; // styles: присвоенные цвета заливки и обводки, для проверки языка цветов
+const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(String(s)) : /Gradient$/.test(k) ? () => ({ addColorStop: noop }) : noop,
+  set: (t, k, v) => { if (k === 'fillStyle' || k === 'strokeStyle') styles.push(String(v)); return true; } });
 (async () => {
   for (const size of [[480, 854], [1280, 720]]) {
     const g = require('./_env')(ctx, { width: size[0], height: size[1] }); const d = g.dbg(); await d.YG.init(); await d.loadSave();
@@ -14,6 +15,7 @@ const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(St
     d.drawWorld(); for (let i = 0; i < 30; i++) d.update(0.016); // предупреждение налива, потом капли и пятна
     for (const h of d.hazards) { h.y = d.ball.y; if (h.type === 'knife') h.phase = 'wind'; }
     for (const p of d.platforms) if (p.type === 'pan') p.hotT = 1.5;
+    for (const kind of ['ketchup', 'pasta', 'meat']) d.drawItem({ kind, x: 100, y: d.camY + 300, seed: 0 }); // новые формы еды
     d.drawPlatform({ id: 900, type: 'cheese', x: 240, y: d.camY + 400, w: 120, crumbleT: 0.2 }); d.drawPlatform({ id: 901, type: 'cheese', x: 240, y: d.camY + 500, w: 120, gone: true }); // сыр целый, крошится и пропавший
     d.drawBg(); d.drawWorld(); d.drawHUD(); d.pausedScreen(true); d.pausedScreen(false);
     d.YG.adStub = { kind: 'rewarded', until: 0 }; d.adStubScreen(); d.YG.adStub = null; d.adStubScreen();
@@ -32,6 +34,27 @@ const ctx = new Proxy({}, { get: (t, k) => k === 'fillText' ? s => texts.push(St
   assert.ok(!texts.some(t => /Серия|Streak/.test(t)), 'панели серии нет'); assert.ok(!texts.some(t => t.startsWith('×')), 'при лимите 1 число не пишется');
   d.powerAdd(d.POWER_FULL); d.drawWorld(); d.drawHUD(); d.tryActivatePower(); d.drawWorld(); d.drawHUD(); // полная шкала и берсерк рисуются
   d.startTower(1); d.state = 'play'; d.save.up.fury = 1; texts.length = 0; d.drawHUD(); assert.ok(texts.includes('×2'), 'остаток берсерков'); d.save.up.fury = 0;
+  // всплывающие надписи из одной точки не налезают: следующая встаёт на высоту строки выше (крупная 34 px, мелкая 26)
+  d.resetFx(); d.popText(200, 500, 'Берсерк!', '#fff', true); d.popText(200, 500, '+6', '#fff', true); d.popText(210, 505, '+1', '#fff');
+  assert.deepStrictEqual(d.texts.map(t => t.y), [500, 466, 432]);
+  d.resetFx(); d.popText(240, 500, 'Тапни по Тефе!', '#fff', true); d.popText(330, 500, '+2', '#fff');
+  assert.ok(d.texts[1].y <= 500 - 34, 'широкая надпись мешает соседке по своей ширине, а не только по центру');
+  d.resetFx(); d.popText(200, 500, 'a', '#fff'); d.texts[0].t = 0.5; d.popText(200, 500, 'b', '#fff'); assert.strictEqual(d.texts[1].y, 500, 'старая надпись уже уплыла вверх');
+  d.resetFx(); d.popText(200, 500, 'a', '#fff'); d.texts[0].t = 0.25; d.popText(200, 500, 'b', '#fff'); assert.strictEqual(d.texts[1].y, 500 - 0.25 * 70 - 26, 'новая встаёт над текущим положением всплывающей');
+  // надпись у края целиком в поле: центр сдвигается внутрь по оценке ширины (крупный шрифт до 9.5 px на половину буквы, мелкий до 6.6)
+  d.resetFx(); d.popText(470, 500, 'Тапни по Тефе!', '#fff', true); d.popText(5, 400, '+3', '#fff');
+  assert.ok(d.texts[0].x < 470 && d.texts[0].x + 14 * 9.5 <= 480 - 8, 'крупная надпись не вылезает за правый край: ' + d.texts[0].x);
+  assert.ok(d.texts[1].x - 2 * 6.6 >= 8, 'мелкая надпись не вылезает за левый край: ' + d.texts[1].x);
+  // язык цветов (спека v2.1.1 §8): шкала силы золотая и не берёт оранжевый масла и красный опасности ни в одном состоянии;
+  // у лопастей оранжево-красная ступица, у ножа на замахе оранжево-красная кромка
+  const DANGER = /^#ff(9a2a|5a36|7a2a)$/i;
+  d.startTower(1); d.state = 'play';
+  for (const [name, setup] of [['копится', () => d.powerAdd(10)], ['готова', () => d.powerAdd(d.POWER_FULL)], ['берсерк', () => d.tryActivatePower()]]) {
+    setup(); styles.length = 0; d.drawPowerMeter();
+    assert.ok(styles.length && !styles.some(s => DANGER.test(s)), 'шкала «' + name + '» без цветов опасности: ' + styles.join(' '));
+  }
+  styles.length = 0; d.drawHazard({ type: 'blades', x: 240, y: d.camY + 300, ang: 0 }); assert.ok(styles.includes('#ff5a36'), 'ступица лопастей оранжево-красная');
+  styles.length = 0; d.drawHazard({ type: 'knife', x: 240, y: d.camY + 300, by: d.camY + 150, t: 1.5, phase: 'wind' }); assert.ok(styles.includes('#ff5a36'), 'кромка ножа на замахе оранжево-красная');
   // смерть: причина, кнопки по флагам
   d.startTower(1); d.state = 'play'; d.die('blades'); d.deadScreen(false); assert.strictEqual(d.buttons.length, 0, 'до 0.6 с кнопок нет');
   texts.length = 0; d.deadScreen(true); assert.ok(texts.includes('Шлёп!') && texts.includes('Лопасти')); assert.deepStrictEqual(d.buttons.map(b => b.id), ['continue', 'restart']);
````

- [ ] **Шаг 2. Убедиться, что тесты падают**

Run: `npm test`

Expected: FAIL. `test_render` падает первым после `test_game ok`: `TypeError: d.drawItem is not a function`.

- [ ] **Шаг 3. Реализация**

- Правка `src/fx.js`:

````diff
diff --git a/src/fx.js b/src/fx.js
--- a/src/fx.js
+++ b/src/fx.js
@@ -1,6 +1,7 @@
 'use strict';
 // ---------- эффекты: частицы, крошки, всплывающие тексты, куски мяса ----------
 let particles = [], texts = [];
+const TEXT_RISE = 70; // надпись всплывает на 70 px за свою секунду жизни
 function burst(x, y, color, n, spd = 220, life = 0.6, size = 4) {
   for (let i = 0; i < n; i++) {
     const a = rnd(0, Math.PI * 2), s = rnd(spd * 0.3, spd);
@@ -10,7 +11,20 @@ function burst(x, y, color, n, spd = 220, life = 0.6, size = 4) {
 function crumbs(x, y) {
   for (let i = 0; i < 8; i++) particles.push({ x: x + rnd(-ball.r * 0.6, ball.r * 0.6), y, vx: rnd(-90, 90), vy: rnd(40, 160), life: 0.5, t: 0.5, color: '#a0472a', size: rnd(2, 5), g: 300 });
 }
-function popText(x, y, str, color, big = false) { texts.push({ x, y, str, color, t: 0, big }); }
+// надпись целиком в поле: полуширину оцениваем по числу букв (замер node-canvas: крупный шрифт до 9.5 px на половину буквы,
+// мелкий до 6.6), высота строки — 34 и 26 px
+function popText(x, y, str, color, big = false) {
+  const half = String(str).length * (big ? 9.5 : 6.6), lh = big ? 34 : 26; x = clamp(x, half + 8, W - half - 8);
+  // заметные надписи (моложе 0.7 с), чьи прямоугольники задевают новую на её текущей высоте, не дают налезть: новая встаёт
+  // на строку выше самой верхней из них; все всплывают с одной скоростью TEXT_RISE, так что зазор сохраняется
+  const at = o => o.y - o.t * TEXT_RISE;
+  for (let i = 0; i < 4; i++) {
+    const near = texts.filter(o => o.t < 0.7 && Math.abs(o.x - x) < o.half + half && Math.abs(at(o) - y) < Math.max(o.lh, lh));
+    if (!near.length) break;
+    y = Math.min(...near.map(o => at(o) - Math.max(o.lh, lh)));
+  }
+  texts.push({ x, y, str, color, t: 0, big, half, lh });
+}
 function loseMeat(fromX, fromY, n) { // куски фарша отлетают от Тефы
   for (let i = 0; i < n; i++) {
     const a = Math.atan2(ball.y - fromY, ball.x - fromX) + rnd(-1.2, 1.2), sp = rnd(180, 340);
````

- Правка `src/render.js`:

````diff
diff --git a/src/render.js b/src/render.js
--- a/src/render.js
+++ b/src/render.js
@@ -41,6 +41,14 @@ function drawPlatform(p) {
     ctx.fillStyle = '#f6c343'; rrect(-p.w / 2, -4, p.w, 16, 5); ctx.fill();
     ctx.fillStyle = '#dca531'; rrect(-p.w / 2, 7, p.w, 5, 3); ctx.fill(); // корочка снизу
     ctx.fillStyle = '#c98f22'; for (const [hx, hy, hr] of [[-0.3, 3, 4], [0.05, 1, 3], [0.32, 4, 3.5]]) { ctx.beginPath(); ctx.arc(hx * p.w, hy, hr, 0, 7); ctx.fill(); } // дырки
+    if (p.crumbleT > 0) { // крошится: трещины и крошки сыплются вниз, чтобы и на стоп-кадре было видно
+      const k = 1 - p.crumbleT / CHEESE_T;
+      ctx.strokeStyle = '#8a5f14'; ctx.lineWidth = 1.5; ctx.beginPath();
+      ctx.moveTo(-p.w * 0.12, -4); ctx.lineTo(-p.w * 0.05, 4); ctx.lineTo(-p.w * 0.1, 12); ctx.moveTo(p.w * 0.2, -4); ctx.lineTo(p.w * 0.14, 5); ctx.stroke();
+      ctx.fillStyle = '#f6c343'; ctx.globalAlpha = 1 - 0.6 * k;
+      for (let i = 0; i < 6; i++) ctx.fillRect(((i * 0.37 + 0.1) % 1 - 0.5) * p.w * 0.9 - 2, 14 + k * (18 + i * 5), 4, 4);
+      ctx.globalAlpha = 1;
+    }
     ctx.restore();
   } else { // поднос
     ctx.fillStyle = '#b08d5a'; rrect(p.x - p.w / 2, y - 4, p.w, 18, 6); ctx.fill();
@@ -54,12 +62,15 @@ function drawHazard(h) {
     const ky = knifeY(h) - camY, wind = h.phase === 'wind';
     ctx.fillStyle = '#5a3b22'; rrect(h.x - 7, ky - 40, 14, 40, 4); ctx.fill(); // рукоять
     ctx.fillStyle = wind ? '#ffffff' : '#d8dde3'; ctx.beginPath(); ctx.moveTo(h.x - 8, ky); ctx.lineTo(h.x + 8, ky); ctx.lineTo(h.x + 6, ky + 70); ctx.lineTo(h.x, ky + 84); ctx.lineTo(h.x - 6, ky + 70); ctx.closePath(); ctx.fill();
-    if (wind) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(h.x, ky + 90); ctx.lineTo(h.x, y - 10); ctx.stroke(); ctx.setLineDash([]); } // замах: линия удара
+    ctx.strokeStyle = wind ? '#ff5a36' : 'rgba(255,90,54,0.55)'; ctx.lineWidth = 2; ctx.stroke(); // оранжево-красная кромка: опасно (спека v2.1.1 §8)
+    if (wind) { ctx.strokeStyle = 'rgba(255,90,54,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(h.x, ky + 90); ctx.lineTo(h.x, y - 10); ctx.stroke(); ctx.setLineDash([]); } // замах: красная линия удара
   } else if (h.type === 'blades') {
     ctx.save(); ctx.translate(h.x, y); ctx.rotate(h.ang);
-    ctx.fillStyle = '#c8ccd2';
-    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(BLADES_R + 8, -10); ctx.lineTo(BLADES_R + 8, 10); ctx.closePath(); ctx.fill(); }
-    ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, 7); ctx.fill();
+    ctx.strokeStyle = 'rgba(255,90,54,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.arc(0, 0, BLADES_R + 12, 0, 7); ctx.stroke(); ctx.setLineDash([]); // зона задевания
+    ctx.fillStyle = '#c8ccd2'; ctx.strokeStyle = '#ff5a36'; ctx.lineWidth = 2;
+    for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(BLADES_R + 8, -10); ctx.lineTo(BLADES_R + 8, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
+    ctx.fillStyle = '#ff5a36'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 7); ctx.fill(); // оранжево-красная ступица
+    ctx.fillStyle = '#4a4a4a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
     ctx.restore();
   }
 }
@@ -109,18 +120,22 @@ function drawItem(it) {
   const x = it.x, y = it.y - camY; if (y < -40 || y > H + 40) return;
   const wob = Math.sin(tGame * 4 + it.seed) * 3;
   ctx.save(); ctx.translate(x, y + wob);
-  if (it.kind === 'ketchup') {
-    ctx.fillStyle = '#e3342f'; ctx.beginPath();
-    ctx.moveTo(0, -18); ctx.bezierCurveTo(14, -2, 15, 10, 0, 16); ctx.bezierCurveTo(-15, 10, -14, -2, 0, -18); ctx.fill();
-    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-4, 2, 3, 6, 0.4, 0, 7); ctx.fill();
+  if (it.kind === 'ketchup') { // ломтик помидора с семенами и хвостиком: не путается с красной каплей опасности (спека v2.1.1 §8)
+    ctx.fillStyle = '#d93a2b'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
+    ctx.fillStyle = '#f07a5e'; ctx.beginPath(); ctx.arc(0, 0, 11.5, 0, 7); ctx.fill(); // мякоть
+    ctx.fillStyle = '#ffd28a'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 3.2, 2, a, 0, 7); ctx.fill(); } // семена в камерах
+    ctx.fillStyle = '#d93a2b'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, 7); ctx.fill(); // серединка
+    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(-3, -15, 5, 2.2, -0.5, 0, 7); ctx.ellipse(3, -15, 5, 2.2, 0.5, 0, 7); ctx.fill(); // хвостик
   } else if (it.kind === 'pasta') {
     ctx.strokeStyle = '#f6c343'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
     for (let i = 0; i <= 24; i++) { const t = i / 24; const px = -16 + t * 32, py = Math.sin(t * Math.PI * 4) * 8; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
     ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
-  } else {
-    ctx.fillStyle = '#b5452b'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 16, -0.3, 0, 7); ctx.fill();
-    ctx.fillStyle = '#f3e0c8'; ctx.beginPath(); ctx.ellipse(6, -4, 7, 4, -0.3, 0, 7); ctx.fill();
-    ctx.strokeStyle = '#f3e0c8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(-4, 2, 4, 9); ctx.stroke();
+  } else { // кусочек мяса на косточке: раньше овал с полосой читался как хмурое лицо
+    ctx.strokeStyle = '#f3e6d0'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(4, 4); ctx.lineTo(18, 13); ctx.stroke(); // косточка
+    ctx.fillStyle = '#f3e6d0'; ctx.beginPath(); ctx.arc(20, 10, 4.2, 0, 7); ctx.arc(17, 17, 4.2, 0, 7); ctx.fill(); // головка кости
+    ctx.fillStyle = '#b5452b'; ctx.beginPath(); ctx.ellipse(-5, -3, 16, 13, -0.4, 0, 7); ctx.fill(); // мясо
+    ctx.fillStyle = '#d9705a'; ctx.beginPath(); ctx.ellipse(-9, -7, 7, 4, -0.4, 0, 7); ctx.fill(); // блик
+    ctx.strokeStyle = 'rgba(255,230,210,0.45)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-5, -3, 9, 0.5, 2.0); ctx.stroke(); // волокна
   }
   ctx.restore();
 }
@@ -148,16 +163,17 @@ function drawTefaBall() {
 // остаток его времени, исчерпана — серая; при лимите больше одного справа остаток берсерков
 function drawPowerMeter() {
   const x = 40, y = 30, w = 140, h = 10, bz = isBerserk(), spent = powerSpent() && !bz, ready = powerReady();
-  ctx.save(); ctx.translate(22, y + 5); // значок-пламя
-  ctx.fillStyle = spent ? 'rgba(255,255,255,0.25)' : ready || bz ? '#ffe08a' : '#ff9a2a';
-  ctx.beginPath(); ctx.moveTo(0, -11); ctx.quadraticCurveTo(9, -2, 6, 5); ctx.quadraticCurveTo(0, 10, -6, 5); ctx.quadraticCurveTo(-9, -2, 0, -11); ctx.fill();
+  // сила золотая, опасность оранжево-красная (спека v2.1.1 §8): значок-молния, а не капля, чтобы шкалу не путали с маслом
+  ctx.save(); ctx.translate(22, y + 5);
+  ctx.fillStyle = spent ? 'rgba(255,255,255,0.25)' : ready || bz ? '#ffe08a' : '#e8b030';
+  ctx.beginPath(); ctx.moveTo(3, -11); ctx.lineTo(-6, 1); ctx.lineTo(-1, 1); ctx.lineTo(-3, 11); ctx.lineTo(6, -2); ctx.lineTo(1, -2); ctx.closePath(); ctx.fill();
   ctx.restore();
   ctx.fillStyle = 'rgba(255,255,255,0.15)'; rrect(x, y, w, h, 5); ctx.fill();
   const frac = bz ? power.berserkT / berserkDur() : spent ? 0 : clamp(power.v / POWER_FULL, 0, 1);
   if (frac > 0) {
     ctx.save();
     if (ready) { ctx.shadowColor = 'rgba(255,220,120,0.9)'; ctx.shadowBlur = 8 + 8 * (0.5 + 0.5 * Math.sin(tGame * 8)); }
-    ctx.fillStyle = bz ? '#ff7a2a' : ready ? '#ffe08a' : '#ff9a2a'; rrect(x, y, w * frac, h, 5); ctx.fill();
+    ctx.fillStyle = bz ? '#fff0b8' : ready ? '#ffe08a' : '#e8b030'; rrect(x, y, w * frac, h, 5); ctx.fill(); // копится, готова, берсерк тает
     ctx.restore();
   }
   if (berserkLimit() > 1) { ctx.fillStyle = '#fff'; ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('×' + (berserkLimit() - power.used), x + w + 8, y + 10); }
@@ -189,8 +205,9 @@ function drawWorld() { // всё внутри поля; вызывающий с
   for (const t of texts) {
     const k = t.t; ctx.globalAlpha = 1 - k * k; ctx.fillStyle = t.color; ctx.textAlign = 'center';
     ctx.font = `900 ${t.big ? 30 : 22}px system-ui, sans-serif`;
-    ctx.fillText(t.str, t.x, t.y - camY - k * 70);
+    ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(30,14,8,0.6)'; // тёмная обводка: читается и поверх Тефы
+    ctx.strokeText(t.str, t.x, t.y - camY - k * TEXT_RISE); ctx.fillText(t.str, t.x, t.y - camY - k * TEXT_RISE);
   }
   ctx.globalAlpha = 1;
 }
-expose({ drawBg, drawWorld, drawHUD, drawPowerMeter, drawPlatform, drawHazard, drawFly, drawPours });
+expose({ drawBg, drawWorld, drawHUD, drawPowerMeter, drawPlatform, drawHazard, drawFly, drawPours, drawItem });
````

- [ ] **Шаг 4. Убедиться, что всё зелёное**

Run: `npm test`

Expected: одиннадцать строк `… ok` (`test_core` … `test_render`, `smoke`), из шума только два блока `YaGames.init failed, using stub …` от `test_sdk`.

- [ ] **Шаг 5. Посмотреть снимки**

`npm run shot`:
  - `shots/hazards.png`: у лопастей оранжево-красная ступица и пунктир зоны, у ножа красная кромка. Наливов два — плановый и добавленный сценой; сцену поправит задача 8;
  - `shots/play.png`: шкала янтарная со значком-молнией;
  - `shots/berserk.png`: надписи «Берсерк!» и монеты стоят друг над другом, не слипаясь.

Помидор и мясо на косточке на этих сценах в кадр не попадают. Крупно их видно на `shots/cheese.png` в задаче 8.

Открыть PNG и посмотреть глазами, а не описывать код. Листы `shots/design_tefa_*.png` не перезаписывать.

- [ ] **Шаг 6. Коммит**

````bash
git add src/fx.js src/render.js tools/test_render.js
git commit -m "feat: язык цветов и форм — помидор, мясо на косточке, акценты опасностей, янтарная шкала, читаемые надписи" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
````

---

## Task 8. Снимки, README, журнал, уточнения к спеке (спека §12, §13, §16)

Новые сцены снимков: полная шкала, последний кусок, сыр, налив; сцена опасностей с одним наливом и ножом. README описывает правила v2.1.1, журнал получает запись сессии 7, спека — раздел §16 с уточнениями, найденными на прототипе.

**Files:**
- Modify: `tools/shot.js`
- Modify: `README.md`
- Modify: `docs/DEVLOG.md`
- Modify: `docs/specs/2026-09-24-v2-1-1-readability-design.md`

**Interfaces:**
- Consumes: всё из задач 1–7.
- Produces: сцены `charged`, `last_piece`, `cheese`, `pour` в `tools/shot.js`.

- [ ] **Шаг 1. Сцены снимков**

- Правка `tools/shot.js`:

````diff
diff --git a/tools/shot.js b/tools/shot.js
--- a/tools/shot.js
+++ b/tools/shot.js
@@ -19,8 +19,24 @@ const hazards = async (g, d) => {
   const bl = d.hazards.find(h => h.type === 'blades'); await up(g, d, bl ? Math.max(1, Math.round((-bl.y - 60) / d.ROW_H) - 2) : 18);
   d.spawnFly(true); d.flies[0].warnT = 0; d.flies[0].x = 60; d.flies[0].y = d.ball.y - 60;
   const kn = d.hazards.find(h => h.type === 'knife'); if (kn) { kn.x = 330; kn.y = d.ball.y - 220; kn.by = kn.y - 150; kn.t = 1.8; }
-  d.startPour(d.ball.x + 80); steps(g, 8); };
+  d.resetPours(1e9); d.startPour(d.ball.x + 80); steps(g, 8); }; // один налив сцены, плановые выключены
 const berserk = async (g, d) => { await up(g, d, 4); d.powerAdd(d.POWER_FULL); d.tryActivatePower(); d.spawnFly(false); d.flies[0].warnT = 0; d.flies[0].x = 380; d.flies[0].y = d.ball.y - 40; steps(g, 12); };
+// шкала полна: шкалу добиваем настоящей едой, чтобы сработало событие — Тефа светится, над ней «Тапни по Тефе!»
+const charged = async (g, d) => { await up(g, d, 4); d.resetPours(1e9); d.power.v = d.POWER_FULL - 1; const it = d.items.find(i => !i.dead); it.x = d.ball.x; it.y = d.ball.y; steps(g, 20); };
+// последний кусок: три укуса, испуганное лицо, красная пульсация
+const lastPiece = async (g, d) => { await up(g, d, 4); d.resetPours(1e9); d.ball.mass = 1; steps(g, 70); };
+// башня 3: Тефа на крошащемся сыре, соседний сыр уже пропал и видна пунктирная рамка
+const cheese = async (g, d) => {
+  const c = d.platforms.find(p => p.type === 'cheese' && p.row >= 3 && d.tower.path.includes(p.id)); await up(g, d, c.row - 1); d.resetPours(1e9);
+  d.jumpTo(c.x, c.y); for (let i = 0; i < 200 && d.ball.onPlatform !== c.id; i++) g.step(); steps(g, 18);
+  const other = d.platforms.find(p => p.type === 'cheese' && p !== c && Math.abs(p.y - c.y) < 450); if (other) { other.gone = true; other.backT = 2; } };
+// налив: первый половник уже льёт — капли в воздухе, пятно шипит на платформе; второй только наклоняется, пунктир мигает
+const pour = async (g, d) => {
+  await up(g, d, 4); d.resetPours(1e9);
+  const p = d.platforms.filter(q => q.id !== d.ball.onPlatform && q.type !== 'tray' && q.y - d.camY > 200 && q.y - d.camY < 800)
+    .sort((a, b) => Math.abs(b.x - d.ball.x) - Math.abs(a.x - d.ball.x))[0]; // видимая платформа дальше всех от Тефы
+  const fall = Math.round((p.y - d.camY - d.LADLE_Y - 6) / d.POUR_V * 60); // кадров от черпака до платформы
+  d.startPour(p.x); steps(g, Math.round(d.POUR_WARN * 60) + fall + 6); d.startPour(d.ball.x > 240 ? d.ball.x - 150 : d.ball.x + 150); steps(g, 12); };
 const dead = async (g, d) => { await up(g, d, 3); d.setRunCoins(23); d.die('fly'); steps(g, 60); };
 const finish = async (g, d) => { d.state = 'play'; d.run.foodEaten = Math.round(d.run.foodTotal * 0.9); d.run.time = 80; d.setRunCoins(31); d.finishTower(); steps(g, 40); };
 (async () => {
@@ -29,6 +45,10 @@ const finish = async (g, d) => { d.state = 'play'; d.run.foodEaten = Math.round(
   await shoot('play', 480, 854, play);
   await shoot('hazards', 480, 854, hazards, tower3);
   await shoot('berserk', 480, 854, berserk);
+  await shoot('charged', 480, 854, charged);
+  await shoot('last_piece', 480, 854, lastPiece);
+  await shoot('cheese', 480, 854, cheese, tower3);
+  await shoot('pour', 480, 854, pour);
   await shoot('fly_warn', 480, 854, async (g, d) => { await up(g, d, 2); d.spawnFly(true); steps(g, 3); });
   await shoot('dead', 480, 854, dead);
   await shoot('finish', 480, 854, finish);
````

- [ ] **Шаг 2. Снять и посмотреть**

Run: `npm run shot` — 15 файлов в `shots/`. Открыть и проверить глазами:
  - `hazards.png`: один налив, нож с красной кромкой, лопасти с оранжево-красной ступицей, муха;
  - `charged.png`: шкала полна, Тефа светится, надпись «Тапни по Тефе!» целиком в кадре;
  - `last_piece.png`: три укуса, испуганное лицо, красный тон;
  - `cheese.png`: Тефа на треснувшем сыре, вниз сыплются жёлтые крошки;
  - `pour.png`: у левой тарелки падают капли и шипит пятно; второй половник наклоняется, пунктир мигает;
  - `play.png`, `berserk.png`, `dead.png`, `finish.png`, `desktop.png`, `en_finish.png`, `tr_dead.png`: без наложений и обрезанных надписей.

- [ ] **Шаг 3. README, журнал, спека**

- Заменить `README.md` целиком (правок больше половины файла):

````markdown
# Тефтеля — вертикальная аркада для Яндекс Игр

Canvas-игра без ассетов и зависимостей: исходники в `src/*.js`, сборка склеивает их в один `dist/index.html`.
Цель проекта: опубликовать на Яндекс Играх и получать доход с рекламы. Ожидания скромные.

## Роли
- Владелец репо — геймдизайнер, принимает решения по механике и виду.
- ИИ-агент — программист и соавтор геймдизайна: идеи владельца разбирает критически, свои предлагает с обоснованием,
  всё пишет, собирает и **проверяет рендером** (см. «Как проверять»).

## С чего начать новому агенту
1. Этот README — текущее состояние правды.
2. `docs/DEVLOG.md` — блок «Текущий статус» и последняя запись: что решено и почему.
3. `docs/specs/` — дизайн этапов, `docs/plans/` — планы реализации. Актуальная петля — `docs/specs/2026-09-23-v2-core-loop-design.md`
   и поверх неё `docs/specs/2026-09-24-v2-1-1-readability-design.md` (главнее там, где они расходятся).

## Концепция
Маленькая тефтеля прыгает по платформам вверх по башне: тап задаёт точку приземления, а не направление —
каждый прыжок решение, промах наказывается сразу. Башня — конечный уровень с финишем и буквенным рейтингом;
башен бесконечно много, но выбора нет — одна текущая, прошёл — открылась следующая. Еда даёт монеты и заряжает
суперсилу, опасности отрывают куски фарша; сколько кусков осталось, видно по укусам на самой Тефе.
Оригинальный персонаж: никаких персонажей из существующих мультсериалов.

## Правила (v2.1.1, согласованы с дизайнером; все числа черновые — спека v2 §3–§6 и спека v2.1.1, она главнее)
Одно чёткое деление: **еда — всегда хорошо, опасности — всегда плохо.**

- **Прыжок в точку**: тап задаёт точку приземления `(tx, ty)` мира — вершина дуги низа Тефы считается так, чтобы на
  спуске она прошла ровно над точкой тапа (`aimJump`, `src/ball.js`); спуск считается от настоящей высоты цели, поэтому
  прыжок на платформу того же ряда или ниже не перелетает её. Высота дуги зажата в `JUMP_MIN_H..JUMP_MAX_H`
  (черновик 100–280 px), горизонтальная скорость — в `±VX_MAX` (420 px/с). Клавиатура: стрелки/A/D целятся на 170 px
  в сторону, W/пробел/вверх/Enter — прыжок вверх.
- **Заряды — ресурс**: 3 в воздухе (`chargesMax()` = 3 + ветка «Заряд», до 6). Каждый тап в воздухе тратит заряд;
  на нуле тап игнорируется с коротким звуком. Приземление на любую платформу возвращает все заряды — рисуются
  точками у Тефы.
- **Платформы**: тарелка (безопасна), сковородка (с ряда 3; таймер `PAN_TIME` ≈ 2 с, потом ожог, кусок и автопрыжок
  вверх), поднос (едет по горизонтали, Тефа едет вместе; в башне 1 медленно, 40–70 px/с), ломтик сыра (с башни 2:
  через 0.5 с после посадки трескается и пропадает, через 3 с отрастает, урона нет). Тарелок около половины, ширина
  100–140 px в башне 1, с номером башни уже, не меньше 80. Посадка — только сверху и в узкой полосе по высоте; снизу
  и сбоку платформы проницаемы, как в Doodle Jump.
- **Опасности** снимают по одному куску; мгновенно убивает только падение за экран. Муха наводится, предупреждает
  жужжанием и стрелкой у края 0.7 с, отстаёт через `FLY_CHASE` ≈ 6 с; влетает, если Тефа 3 с сидит на одной платформе
  или скрытая серия хорошей игры не меньше 6 (полная шкала силы удваивает шанс). Масло льют сверху: под строками HUD
  появляется половник, 0.6 с мигает красный пунктир столба, потом 4 капли по 700 px/с; капля на платформе оставляет
  шипящее пятно шириной 36 px на 1 с. Первый налив не раньше 5 с после старта и 4 с после нового чекпоинта, интервал
  `max(3, 9 − 0.3·(N − 1)) ± 1` с, с башни 6 иногда второй столб на 0.4 с позже. Нож на пружине висит поперёк пропасти
  (замах → удар → пауза, бьёт только в ударе): со второй башни в каждой башне с пропастью хотя бы один, шанс в пропасти
  `min(0.85, 0.4 + 0.03·(N − 2))`. Лопасти миксера с башни 3 стоят у ступеней так, что стоящую Тефу не задевают.
- **Жизни — масса**: `massMax()` = `MASS_BASE` 4 + ветка «Мясистость» (без потолка). Башня, «Продолжить» и
  «С чекпоинта» начинаются с полной массой, новый чекпоинт лечит до полной, еда не лечит. Удар отрывает кусок с
  брызгами, отбросом и 1 с неуязвимости; ноль кусков — «Шлёп!». Жизни показывает сама Тефа (`tefaHpLevel`): полная —
  довольная, минус кусок — один укус, дальше два укуса и капля пота, последний кусок — испуг и красное мигание; при
  лечении укус зарастает за 0.3 с. Ободка вокруг Тефы и иконок массы нет. Радиус `26 + 4·(min(mass, 8) − 1)`.
- **Суперсила**: шкала сверху слева (значок-молния, 30 очков): +1 за первую посадку на платформу за забег, +1 за еду,
  +2 за еду в полёте, +3 за отставшую муху; удар отнимает четверть шкалы (ветка «Стойкость» — половину и четверть
  этого), ветка «Кураж» ускоряет зарядку. Полная шкала светится вместе с Тефой, в первый раз за сессию всплывает
  «Тапни по Тефе!». Тап по Тефе (ближе `max(30, 1.3·r)` к центру), клик или клавиша E включают берсерк на
  `6 + 0.5·«Аппетит»` с; один на башню, ветка «Запал» (`up.fury`, до 2) добавляет. Тап по Тефе при неполной шкале,
  во время берсерка и после исчерпанного лимита — обычный прыжок. Смерть, «Продолжить» и «С чекпоинта» шкалу не
  обнуляют, «Заново» и новая башня обнуляют; в сохранение шкала не пишется.
- **Берсерк**: Тефа неуязвима и на вид крупнее ×1.6 от нижней точки, нож и лопасти ломаются (+2 монеты), муха и капля
  масла съедаются (+1 кусок и монеты за мясо), пятна и сковородки не жгут, магнит на еду 140 px, монеты за еду ×2.
  Смерть от падения заканчивает берсерк.
- **Еда**: ломтик помидора, макароны, мясо на косточке — монеты (1/2/3 × множители) и очки шкалы, без лечения.
  Магнита на еду вне берсерка нет принципиально — прицеливание в еду часть решения игрока.
- **Башни**: генерируются детерминированно по сиду N (`mulberry32`), `rows(N) = min(40 + 5N, 160)`, чекпоинт каждые
  `CP_EVERY = 20` рядов, верхний ряд — широкая платформа-крыша, финиш башни. Между чекпоинтами ряды заполняют
  фрагменты: ступени зигзагом, пропасть (2 пустых ряда, с башни 5 до 3) с площадкой отдыха 180 px и иногда дугой еды,
  которую ловят только в полёте, перелёт вбок на 300–340 px, развилка (короткий путь через пропасть с едой и длинный
  по ступеням). С номером башни ступеней меньше, остальных фрагментов больше. Генератор пишет безопасный путь `path`:
  каждую следующую платформу можно достать двумя прыжками за полёт, один заряд остаётся в запасе; `npm test` гоняет
  бота по этому пути через башни 1–100 без режима бога. Темы циклом по 5 башен — пока только «Кухня», остальные — v2.2.
- **Смерть, чекпоинт, продолжение**: «Шлёп!» и причина одной строкой без гендерных форм («Укус мухи», «Ожог на
  сковородке», «Нож», «Лопасти», «В пропасть!»). «Продолжить» за rewarded — на последней платформе приземления,
  с полной массой, 1.5 с неуязвимости, один раз на башню, рейтинг башни становится D. «С чекпоинта» бесплатно —
  старт с последней пройденной отметки этажа. «Заново» — башня с нуля.
- **Финиш и рейтинг**: приземление на крышу — башня пройдена. Буква по трём проверкам (без смертей; время не
  больше нормы `par(N) = rows(N)·2.4 с`; еды собрано не меньше 80%): три галочки — S, две — A, одна — B, ноль — C;
  было «Продолжить» — D. Награда `20·N × {S: 2, A: 1.5, B: 1.2, C: 1, D: 0.8}` монет, «Монеты ×2» за rewarded.
  Скин за первый S каждой пятой башни — с v2.2.
- **Титул**: крупно «Башня N» и тема, три строки подсказок, кнопка «Играть»; Тефа на тарелке, чекпоинт из
  сохранения подписан отдельной строкой. Летопись пройденных башен на титуле — с v2.2 (в v2.1 её ещё нет).
- **Магазин и прокачка**: девять веток (мясистость, корочка, аппетит, специи, кураж, стойкость, репеллент, заряд,
  запал) — экран магазина и сами покупки появятся в v2.3 (спека v2 §6). Сохранение (`save.up`) под них уже готово,
  апгрейды уже читаются формулами (`massMax`, `panTime`, `berserkLimit`, `berserkDur` и т. д.), взять их пока неоткуда.

### Сохранение (v4)
```
{ v: 4, earned, spent, up: { meat, crust, appetite, spice, nerve, grit, repel, charge, fury },
  skins: [], skin: 'none', tower: 1, log: { "1": { r: 'S', t: 123.4 } }, cp: 0 }
```
`coins()` = `max(0, earned − spent)`. Миграция v1–v3 → v4: `earned` остаётся, `spent = 0` (старые апгрейды
возвращаются монетами), `up` нули, `skin` остаётся, если есть в новом списке, `tower = 1`, `log = {}`, `cp = 0`;
`best`, `floor`, `startFloor` забываются; ключа `fury` в старых сохранениях нет, он равен 0. Слияние с облаком — максимум/лучшее по каждому полю отдельно (монеты и
уровни веток монотонны, летопись берёт лучший рейтинг), поэтому слияние никогда не отнимает у игрока прогресс.
Подробности и формула слияния летописи — спека §8.

## Тексты
- Персонаж — Тефа, без рода: в русских строках нет гендерных форм («Шлёп!», причины смерти без родовых
  окончаний — «Укус мухи», «Ожог на сковородке», а не «Обожглась»).

## Отвергнутые идеи (не возвращать без обсуждения)
Полный список решений и причин по v2 — `docs/specs/2026-09-23-v2-core-loop-design.md` §2 и §14, `docs/DEVLOG.md`
сессия 5. Коротко:
- **Тёмная кладовка** (видимость кругом) — трудно сделать хорошо, на телефоне раздражает.
- **Расходники в магазине, прокачка с тремя уровнями на ветку, карта башен как меню выбора** — магазин должен
  быть актуален бесконечно, а не разово; выбора башни нет намеренно (см. «Решения владельца», спека §2).
- **Мгновенная смерть от любого касания, магнит как апгрейд, урон от стен, автоотскок как в Doodle Jump** —
  отбирают решение у игрока или наказывают слишком резко.
- **Люк по массе и старт с любого этажа, этажи по 150 м как уровни, мусор как предметы** — механики этапа 3a,
  заменены башнями-уровнями и опасностями v2 (вердикт владельца после игры в 3a — спека §1).
- **Берсерк от обжорства без серии** — награда должна быть заслужена хорошей игрой, а не куплена едой.
- **Мгновенная смерть от лопастей, вентилятор-ветер и мясорубка вместо лопастей, лечение при включении берсерка,
  шкала-кнопка сверху и кнопка в углу** — владелец выбрал единый урон и тап по Тефе (спека v2.1.1 §2).
- **Гладкий коричневый шар** как персонаж — читается как какашка; отсюда и редизайн Тефы в задаче 6.
- **Кликер/idle** — заменён аркадой ещё на этапе 1: больше точек для rewarded-рекламы.
- **Unity WebGL** — тяжёлые сборки, Яндекс штрафует за загрузку; агент не может собрать.
- **Межстраничная реклама сразу после смерти** — две рекламы подряд с «Продолжить». Показываем перед стартом
  следующего забега.
- **ES-модули + бандлер**, **один файл без сборки** — см. `docs/DEVLOG.md`, сессия 1.

## Устройство кода
Обычные скрипты, порядок задаёт `index.html` (маркеры `<!-- src -->`); верхнеуровневые `const/let/function`
видны между файлами, зависимости только «вниз» по списку (модули ниже `game.js` возвращают события и не пишут
его состояние). Каждый модуль заканчивается `expose({…})` (core.js) — хуки для headless-тестов (`window.__dbg`);
`Object.assign` не годится, он вызывает геттеры один раз.

| Файл | Что делает |
|---|---|
| `src/core.js` | `W×H = 480×854`, холст на всё окно, поле по центру (`view`, `toGame`, `beginField`, `fieldBounds`), `CFG`, `expose()` для тестовых хуков |
| `src/i18n.js` | строки ru/en/tr, `T(key, n)`; `ru` → русский, `tr` → турецкий, всё остальное → английский |
| `src/audio.js` | синтез звуков WebAudio, `muteAudio/unmuteAudio` |
| `src/sdk.js` | `YG` — обёртка Yandex Games SDK с заглушкой: ready/start/stop, реклама промисами, данные игрока, пауза |
| `src/save.js` | `save {v:4, earned, spent, up, skins, skin, tower, log, cp}`, `coins()` = earned − spent; облако + localStorage, слияние — лучшее по полю |
| `src/ball.js` | физика тела: `aimJump` (прыжок в точку), масса и радиус, заряды, сквош и наклон трансформацией |
| `src/fx.js` | частицы, крошки мяса, всплывающие тексты (не налезают друг на друга и не вылезают за край поля) |
| `src/tefa.js` | `drawTefa(ctx, x, y, r, pose)` — вариант A «В томате» с жизнями-укусами, лицами состояний, свечением полной шкалы, берсерком и заживлением; тела уровней и сырой фарш кэшируются в offscreen-канвас |
| `src/tower.js` | сиды, `rows(N)`, `towerParams(N)`, `buildTower(N)` из фрагментов → платформы, опасности, еда, чекпоинты, крыша и безопасный путь `path` |
| `src/platforms.js` | типы платформ (тарелка/сковородка/поднос/сыр), посадка сверху, жар сковородки, крошение и отрастание сыра, события `burn`/`crumble` |
| `src/hazards.js` | муха, нож, лопасти, налив масла сверху: обновление, столкновения, влёт мух, события `hit/eaten/smash/flyGaveUp` |
| `src/power.js` | скрытая серия для мух, шкала суперсилы, лимит и таймер берсерка; события `ready`/`berserkEnd` |
| `src/game.js` | оркестрация: прицел прыжка, заряды, камера, урон и лечение, шкала и активация силы, смерть, чекпоинты, финиш и рейтинг, монеты |
| `src/render.js` | фон, мир (платформы/опасности/налив/еда/Тефа), HUD (шкала силы, монеты, номер башни, прогресс) |
| `src/screens.js` | титул, смерть, финиш, пауза, оверлей рекламы-заглушки, загрузка, `hitButton` |
| `src/main.js` | загрузка (`boot`), ввод (тап в точку, тап по Тефе, клавиатура и E), пауза от SDK/вкладки/фокуса, реклама между забегами, игровой цикл |
| `tools/bot.js` | бот для тестов и снимков: идёт по безопасному пути башни настоящими прыжками, второй прыжок — в воздухе |

Удалены вместе со старой петлёй: `world.js`, `floors.js`, `upgrades.js` — их обязанности заменили `tower.js`,
`platforms.js`, `hazards.js`, `fx.js`. В v2.1.1 `streak.js` заменён на `power.js`.

## Yandex Games SDK
- Подключение `<script src="/sdk.js" async>` (относительный путь — требование при загрузке архива в консоль).
  Ждём `YaGames` до 15 с по событию `load`/`error` тега (ошибка → заглушка сразу), `YaGames.init()` не дольше 10 с; со страницы `file://` сразу заглушка: реклама рисуется оверлеем на 1 с, «облако» живёт в localStorage.
- `LoadingAPI.ready()` — когда виден титул. `GameplayAPI.start()` — «Играть», «С чекпоинта», «Заново», «Следующая
  башня», тап после паузы, «Продолжить» за рекламу. `GameplayAPI.stop()` — смерть, финиш башни, любая реклама, пауза.
- Пауза: `game_api_pause`, скрытие вкладки, потеря фокуса. Звук глохнет, мир стоит, возврат в забег по тапу.
- Межстраничная реклама перед стартом забега (кроме самого первого старта сессии), не чаще раза в 180 с
  (`AD_INTERVAL`). Rewarded — на «Продолжить» и «Монеты ×2».
- Локальный тест в проде: `npx @yandex-games/sdk-dev-proxy -p dist` + draft-URL игры с `?game_url=https://localhost`
  (нужен черновик игры в консоли владельца).
- Загрузка стартует сразу при выполнении скрипта (`startBoot()` в main.js). Тесты ставят `CFG.manualBoot`
  и запускают её сами через `_env.boot()`, иначе фоновая загрузка мешала юнит-тестам.

## Как проверять (обязательно перед выдачей визуала)
- `npm test` — одиннадцать тестовых скриптов и smoke: `test_core`, `test_sdk`, `test_save`, `test_jump`, `test_tower`,
  `test_platforms`, `test_hazards`, `test_power`, `test_game`, `test_render` — юнит-тесты по модулям (бот проходит
  башни 1–100 внутри `test_tower`), и `tools/smoke.js` — полный поток: загрузка → тап по Тефе → башня 1 ботом по
  безопасному пути до крыши → финиш и запись в летопись → башня 2; смерть → «Продолжить» через rewarded-заглушку;
  пауза, клавиатура и E; `--dist` гоняет собранный файл. Ожидаемый шум: два блока `YaGames.init failed, using stub …`
  из `test_sdk.js`.
- `npm run shot` — скриншоты в `shots/` (нужен `npm i -D canvas`): `title` (титул «Башня 1», Тефа на тарелке),
  `title_cp` (титул с чекпоинтом из сохранения), `play` (HUD в деле — шкала силы, монеты, прогресс башни),
  `hazards` (нож, лопасти, налив и муха башни 3), `berserk` (берсерк и полоса его времени), `charged` (полная шкала,
  Тефа светится, «Тапни по Тефе!»), `last_piece` (последний кусок: укусы, испуг, красное мигание), `cheese` (Тефа на
  крошащемся сыре), `pour` (половник, пунктир, капли и пятно), `fly_warn` (стрелка-предупреждение о мухе у края),
  `dead` («Шлёп!», причина, «Продолжить»/«Заново»), `finish` (буква рейтинга и три галочки), `desktop` (поле по
  центру на 1280×720), `en_finish`/`tr_dead` (локализация). `node tools/shot_tefa.js` — лист состояний Тефы
  `shots/tefa_port.png`. Агент должен **смотреть на PNG**, а не описывать код: дважды визуал уходил непроверенным и был не тем.
- `npm run build` — `dist/index.html` + `dist/teftelya.zip`, smoke по собранному файлу. Zip загружается в консоль как есть.
- `index.html` открывается двойным кликом (ошибка загрузки `/sdk.js` в консоли ожидаема) — отдельный HTTP-сервер
  для проверки не нужен и не запускается.

## План этапов
Старые этапы 1–3a (фундамент+SDK, прежняя мета с апгрейдами и магнитом, этажи по 150 м с люком) заменены веткой
v2 — вердикт владельца и причины в `docs/specs/2026-09-23-v2-core-loop-design.md` §1, история — `docs/DEVLOG.md`
сессии 1–4. Текущий план (спека §13):
1. ✅ v2.1 Ядро — прыжок в точку, платформы и опасности башни 1, масса как здоровье, серия и берсерк, башни без
   выбора, рендер Тефы, сохранение v4. Слита в `main` 2026-09-24.
   v2.1.1 Читаемость — жизни на Тефе, урон по куску, суперсила по тапу, налив масла сверху, башня из фрагментов,
   язык цветов (спека `2026-09-24-v2-1-1-readability-design.md`, план `docs/plans/2026-09-24-v2-1-1-readability.md`),
   ветка `v2-1-1-readability`.
2. v2.2 Башни — летопись на титуле, темы и их правила для башен 2–5, по одной платформе и опасности из бэклога
   на башню, скины за первый S каждой пятой башни.
3. v2.3 Магазин — восемь веток прокачки, экран магазина с живой Тефой, скины, «Сила Тефы», цены по метрикам v2.1.
4. v2.4 Графика и звук — отрисовка платформ и опасностей, фоны тем, частицы, звуки на каждое событие.
5. Релиз: иконка, обложка, скриншоты, чеклист модерации (`docs/CHECKLIST-yandex-console.md`), загрузка в консоль
   — делает владелец, по готовности v2.x.

## Открытые вопросы к дизайнеру
- Все числа §3–§6 спеки v2 черновые; экономический проход после метрик v2.1 (доход за башню, время башни, доля смертей).
- Формула «Силы Тефы» `power(N)` и веса веток прокачки.
- Норма времени `par(N)` и порог еды 80% для рейтинга — проверить на реальной игре.
- Список скинов и их лёгкие эффекты (v2.3).
- Правила тем (v2.2) и порядок включения бэклога платформ/опасностей по башням.
- Нужен ли повтор пройденной башни ради рейтинга — владелец сказал «выбора нет», оставляем без повтора.
- v2.1.1: не стала ли игра слишком жёсткой для случайных игроков (смерти на башнях 1–3); не читается ли красный ломтик
  помидора как опасность; шкала и счётчик берсерков после перезагрузки страницы начинаются заново — так задумано.
````

- Правка `docs/DEVLOG.md`:

````diff
diff --git a/docs/DEVLOG.md b/docs/DEVLOG.md
--- a/docs/DEVLOG.md
+++ b/docs/DEVLOG.md
@@ -9,14 +9,55 @@
 - v2.1 «Ядро» слита в `main` и запушена 2026-09-24 (merge `7e92934`): прыжок в точку, платформы и опасности,
   масса как здоровье, серия и берсерк, башни без выбора, рендер Тефы (вариант A «В томате»), сохранение v4.
   `npm test` (одиннадцать скриптов и smoke) / `npm run shot` / `npm run build` зелёные.
-- Сыграв в v2.1, владелец потребовал правок читаемости и баланса. Они собраны в спеку v2.1.1
-  `docs/specs/2026-09-24-v2-1-1-readability-design.md`, которая дополняет спеку v2 и главнее её там, где они расходятся.
-  Работа идёт на ветке `v2-1-1-readability`: сначала владелец выбирает стиль состояний Тефы по листу 5
-  (`node tools/design_tefa.js round5`), потом план и реализация.
+- v2.1.1 «Читаемость» реализована на ветке `v2-1-1-readability` по плану `docs/plans/2026-09-24-v2-1-1-readability.md`
+  (спека `docs/specs/2026-09-24-v2-1-1-readability-design.md`, главнее спеки v2 там, где они расходятся): жизни на Тефе
+  укусами, урон по куску, суперсила по тапу на Тефу, налив масла сверху, сыр, башня из фрагментов, язык цветов.
+  `npm test` / `npm run shot` / `npm run build` зелёные. Слияние в `main` — после «да» владельца.
 - После v2.1.1 — план v2.2 «Башни»: летопись на титуле, темы и правила башен 2–5, подборы §3.4, по одной платформе и
   опасности из бэклога на башню, скины за первый S каждой пятой башни.
 - SDK живьём не проверялся (нужен черновик в консоли владельца). Экономика, графика окружения и звук черновые.
 
+## 2026-09-24 — Сессия 7: v2.1.1, план по прототипу и реализация
+
+**Как шли.** План писался по прототипу: каждую задачу сначала сделали и прогнали во временной копии ветки, в план
+вошёл только проверенный код. Прототип нашёл то, чего не было видно из спеки, — это ушло в план как уточнения.
+
+**Сделано** (восемь задач плана)
+- Урон и лечение: любая опасность снимает кусок, событий `kill` больше нет; еда не лечит; старт, «Продолжить» и
+  «С чекпоинта» с полной массой; новый чекпоинт лечит до полной; в берсерке съеденная муха или капля +1 кусок.
+- Жизни на Тефе (стиль A листа 5): укусы с сырым фаршем на срезе, лица состояний, красное мигание последнего куска,
+  заживление за 0.3 с; ободка и иконок массы нет.
+- Суперсила вместо серии (`src/power.js`): шкала сверху слева, тап по Тефе или E, лимит на башню, ветка «Запал».
+- Масло сверху: половник, красный пунктир, капли, шипящие пятна; половники из уровня удалены.
+- Сыр со второй башни; прицел считает спуск от настоящей высоты цели (раньше перелетал платформы того же ряда).
+- Башня из фрагментов с безопасным путём; бот (`tools/bot.js`) проходит башни 1–100 без режима бога прямо в `npm test`.
+  Замер на 100 башнях: тарелок 50 %, прыжок в воздухе нужен на 17–39 % взлётов, ни одного падения бота.
+- Язык цветов и форм: ломтик помидора и мясо на косточке, оранжево-красные акценты ножа и лопастей, шкала силы
+  янтарная.
+
+**Уточнения к спеке** (записаны в её §16)
+- Шкала силы копится янтарной со значком-молнией, а не оранжевой: оранжевый в §8 — цвет масла и опасности, а
+  каплевидный оранжевый значок на снимке читался как капля масла.
+- Ключ `power` не понадобился: у шкалы значок без подписи.
+- Перед чекпоинтом площадкой отдыха служит сама тарелка чекпоинта шириной 240 px.
+- Радиус тапа по Тефе — `max(30, 1.3·ball.r)`: видимое тело шире коллизии в 1.25 раза, это ≈ 1.1 видимого радиуса.
+- У ножа свой шанс в пропасти `min(0.85, 0.4 + 0.03·(N − 2))` и гарантированный первый нож со второй башни: с общим
+  шансом опасностей в башнях 2–6 ножей почти не было (0, 0, 0, 1, 0).
+- Половник висит под строками HUD, ручкой к середине экрана: у самого края он наезжал на счёт и номер башни.
+- Всплывающие надписи встают друг над другом по высоте строки, не вылезают за край поля и получили тёмную обводку:
+  при включении берсерка «Берсерк!» и монеты за съеденную муху налезали друг на друга.
+- Заживление рисуется из кэша тела и сырого фарша: без кэша кадр стоил в Chrome около 10 мс, из кэша около 0.3 мс.
+- Крошащийся сыр трескается и сыплет крошки, иначе на стоп-кадре не видно, что он сейчас пропадёт.
+
+**Проверка**
+- `npm test` пять прогонов подряд зелёные; снимки просмотрены глазами; сборка проходит smoke по `dist`.
+- Chrome без окна через CDP: 61 кадр/с на титуле и в игре; прыжки по пути, в том числе вторым прыжком в воздухе;
+  тап мышью по Тефе при полной шкале включает берсерк без прыжка; налив по расписанию; в консоли только ожидаемые
+  404 на `sdk.js` и `favicon.ico`.
+
+**Дальше**
+- Слияние в `main` по «да» владельца, потом план v2.2 «Башни».
+
 ## 2026-09-24 — Сессия 6: отзыв на v2.1, спека v2.1.1
 
 **Отзыв владельца** после трёх башен: серый ободок и панель жизней мешают; жизни должна показывать сама Тефа;
````

- Правка `docs/specs/2026-09-24-v2-1-1-readability-design.md`:

````diff
diff --git a/docs/specs/2026-09-24-v2-1-1-readability-design.md b/docs/specs/2026-09-24-v2-1-1-readability-design.md
--- a/docs/specs/2026-09-24-v2-1-1-readability-design.md
+++ b/docs/specs/2026-09-24-v2-1-1-readability-design.md
@@ -1,6 +1,7 @@
 # Тефтеля v2.1.1. Читаемость, суперсила, башня из фрагментов — дизайн
 
-Дата: 2026-09-24. Статус: утверждена владельцем; стиль состояний Тефы выбран (укусы, стиль A листа 5); ждёт плана.
+Дата: 2026-09-24. Статус: утверждена владельцем; стиль состояний Тефы выбран (укусы, стиль A листа 5); план —
+`docs/plans/2026-09-24-v2-1-1-readability.md`; уточнения при реализации — §16.
 
 Дополняет спеку v2 (`docs/specs/2026-09-23-v2-core-loop-design.md`). Где эти документы расходятся, действует этот.
 Затронуты §3 (платформы и опасности), §4 (масса, серия, берсерк), §5.1 (генерация башни), §6 (ветки прокачки), §7 (HUD),
@@ -64,7 +65,8 @@
 
 ### 3.3 Шкала суперсилы
 - Тонкая полоса со значком сверху слева на месте прежней панели.
-- Состояния: копится (оранжевая), полна (полоса и Тефа светятся искрами), исчерпана (серая до следующей башни).
+- Состояния: копится (янтарная, значок-молния; см. §16), полна (полоса и Тефа светятся искрами), исчерпана (серая до
+  следующей башни).
   Если лимит больше одного, рядом число оставшихся берсерков.
 - Когда шкала впервые за сессию стала полной, над Тефой всплывает подсказка «Тапни по Тефе!».
 
@@ -191,7 +193,7 @@
 ## 9. Тексты
 - Подсказки титула: «Тап — прыжок в точку тапа.», «Еда заряжает силу. Полная шкала — тапни по Тефе.»,
   «Сковородка жжёт, мухи кусают, масло льют сверху.» (ru/en/tr).
-- Новые ключи: `power` («Сила»), `tapTefa` («Тапни по Тефе!»). Ключ `streak` удаляется.
+- Новый ключ `tapTefa` («Тапни по Тефе!»). Ключ `streak` удаляется. Ключ `power` не понадобился (§16).
 - Русские строки о Тефе без гендерных форм.
 
 ## 10. Сохранение
@@ -237,3 +239,19 @@
 2. Не станет ли игра слишком жёсткой для случайных игроков: смотрим смерти на башнях 1–3 при проходе по балансу.
 3. Ломтик помидора красный: проверить на скриншотах, что он не читается как опасность.
 4. После перезагрузки страницы шкала и счётчик берсерков начинаются заново.
+
+## 16. Уточнения при реализации (2026-09-24)
+Найдены на прототипе плана; владелец видел их в плане до реализации.
+- §3.3: шкала копится янтарной (`#e8b030`) со значком-молнией, полная — светлое золото `#ffe08a`, берсерк — `#fff0b8`.
+  Оранжевый по §8 — цвет масла и опасности; оранжевая шкала с каплевидным значком читалась как масло.
+- §3.4: радиус тапа по Тефе в коде — `max(30, 1.3·ball.r)`. Видимое тело шире коллизии в 1.25 раза, так что это
+  ≈ 1.1 видимого радиуса.
+- §6.2: перед чекпоинтом площадкой отдыха служит сама тарелка чекпоинта шириной 240 px.
+- §7.2: половник висит под строками HUD (`LADLE_Y = 110` px от верха экрана), ручкой к середине экрана; капли
+  начинаются от черпака.
+- §7.3: у ножа свой шанс в пропасти `pKnife = min(0.85, 0.4 + 0.03·(N − 2))`; со второй башни в каждой башне с
+  пропастью хотя бы один нож. С общим `pHaz` в башнях 2–6 ножей почти не было.
+- §9: ключ `power` не нужен — у шкалы значок без подписи.
+- Всплывающие надписи встают друг над другом по высоте строки, не выходят за край поля и рисуются с тёмной обводкой.
+- Заживление 0.3 с рисуется из кэша: тело нового уровня мимо ещё открытой части укуса и сырой фарш готовой картинкой.
+- Крошащийся сыр трескается и сыплет крошки.
````

- [ ] **Шаг 4. Полная проверка**

Run: `npm test` и `npm run build`

Expected: одиннадцать строк `… ok`; сборка печатает `smoke ok (dist)` и размеры `dist/index.html` и `dist/teftelya.zip` (на прототипе 132.7 КБ и 42.6 КБ).

- [ ] **Шаг 5. Коммит**

````bash
git add README.md docs/DEVLOG.md docs/specs/2026-09-24-v2-1-1-readability-design.md tools/shot.js
git commit -m "docs+tools: сцены снимков v2.1.1, README, журнал, уточнения к спеке" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
````

---

## После задачи 8

- Финальное ревью всей ветки `v2-1-1-readability` против спеки: одна свежая проверка на самой сильной модели.
- Проверка в настоящем браузере:
  - титул, «Играть», прыжки по пути, в том числе вторым прыжком в воздухе;
  - полная шкала и тап мышью по Тефе;
  - налив масла;
  - в консоли только ожидаемые 404 на `sdk.js` и `favicon.ico`.
  На прототипе было 61 кадр/с, а кадр заживления из кэша стоил около 0.3 мс. Сервер для такой проверки — только порт 8765, погасить сразу после.
- Слияние в `main` и push — только после явного «да» владельца.
