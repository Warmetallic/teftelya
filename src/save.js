'use strict';
// ---------- сохранения v4: облако Яндекса + локальный резерв, слияние «лучшее по полям» ----------
// Реестр монет монотонный (earned/spent только растут), уровни веток только растут, летопись — лучший рейтинг по башне,
// поэтому слияние «максимум/лучшее по полям» никогда не отнимает у игрока и не уводит баланс в минус.
const SAVE_VERSION = 4;
const SAVE_KEY = 'teft_save';
// null — без потолка (спека v2 §6); nerve («Кураж») ускоряет зарядку шкалы, fury («Запал») — +1 берсерк на башню (спека v2.1.1 §4)
const UP_MAX = { meat: null, crust: null, appetite: null, spice: null, nerve: 2, grit: 2, repel: 15, charge: 3, fury: 2 };
const SKIN_ORDER = ['none', 'chef', 'glasses', 'crown', 'bow', 'mustache']; // порядок открытия скинов; каталог — v2.3
const RANK = ['D', 'C', 'B', 'A', 'S'];
const save = { v: SAVE_VERSION, earned: 0, spent: 0, up: _emptyUp(), skins: [], skin: 'none', tower: 1, log: {}, cp: 0 };
function _emptyUp() { const o = {}; for (const k of Object.keys(UP_MAX)) o[k] = 0; return o; }
function coins() { return Math.max(0, save.earned - save.spent); }
const _int = v => Math.max(0, Math.floor(+v || 0));
const _rank = r => Math.max(0, RANK.indexOf(r));
// приводит объект любой версии (или мусор) к схеме v4. v1 {coins} → earned; v1–v3: spent = 0 (старые апгрейды удалены — монеты возвращаются)
function migrate(obj) {
  const o = { v: SAVE_VERSION, earned: 0, spent: 0, up: _emptyUp(), skins: [], skin: 'none', tower: 1, log: {}, cp: 0 };
  if (!obj || typeof obj !== 'object') return o;
  o.earned = obj.earned !== undefined || obj.spent !== undefined ? _int(obj.earned) : _int(obj.coins);
  o.skin = SKIN_ORDER.includes(obj.skin) ? obj.skin : 'none';
  if (_int(obj.v) < 4) return o;
  o.spent = Math.min(o.earned, _int(obj.spent));
  const up = obj.up && typeof obj.up === 'object' ? obj.up : {};
  for (const k of Object.keys(UP_MAX)) o.up[k] = UP_MAX[k] === null ? _int(up[k]) : Math.min(UP_MAX[k], _int(up[k]));
  o.skins = Array.isArray(obj.skins) ? obj.skins.filter(s => SKIN_ORDER.includes(s) && s !== 'none') : [];
  o.tower = Math.max(1, _int(obj.tower));
  if (obj.log && typeof obj.log === 'object') for (const k of Object.keys(obj.log)) {
    const e = obj.log[k], n = _int(k); if (!e || !RANK.includes(e.r) || n < 1 || String(n) !== String(k)) continue;
    o.log[n] = { r: e.r, t: Math.max(0, +e.t || 0) };
  }
  o.cp = _int(obj.cp);
  return o;
}
function mergeSaves(a, b) {
  const o = { v: SAVE_VERSION, earned: Math.max(a.earned || 0, b.earned || 0), spent: Math.max(a.spent || 0, b.spent || 0), up: _emptyUp(), skins: [], skin: 'none',
    tower: Math.max(a.tower || 1, b.tower || 1), log: {}, cp: 0 };
  for (const k of Object.keys(UP_MAX)) o.up[k] = Math.max((a.up && a.up[k]) || 0, (b.up && b.up[k]) || 0);
  o.skins = [...new Set([...(a.skins || []), ...(b.skins || [])])];
  o.skin = SKIN_ORDER[Math.max(Math.max(0, SKIN_ORDER.indexOf(a.skin)), Math.max(0, SKIN_ORDER.indexOf(b.skin)))];
  for (const src of [a.log || {}, b.log || {}]) for (const k of Object.keys(src)) {
    const e = src[k], cur = o.log[k];
    if (!cur || _rank(e.r) > _rank(cur.r) || (_rank(e.r) === _rank(cur.r) && e.t < cur.t)) o.log[k] = { r: e.r, t: e.t };
  }
  const ta = a.tower || 1, tb = b.tower || 1;
  o.cp = ta === tb ? Math.max(a.cp || 0, b.cp || 0) : (ta > tb ? a.cp || 0 : b.cp || 0);
  return o;
}
function snapshot() { return migrate(save); } // migrate копирует и нормализует — снимок не делит ссылки с save
function sameSave(a, b) { return JSON.stringify(migrate(a)) === JSON.stringify(migrate(b)); }
function _readLocal() {
  const st = YG.storage; if (!st) return null;
  try {
    const raw = st.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
    const b = +st.getItem('teft_best') || 0, c = +st.getItem('teft_coins') || 0; // ключи прототипа (v1)
    if (b || c) { const o = { v: 1, best: b, coins: c }; st.setItem(SAVE_KEY, JSON.stringify(o)); st.removeItem('teft_best'); st.removeItem('teft_coins'); return o; }
  } catch (e) {}
  return null;
}
function _writeLocal(obj) { try { if (YG.storage) YG.storage.setItem(SAVE_KEY, JSON.stringify(obj)); } catch (e) {} }
let lastSent = '';
async function loadSave() {
  const cloudRaw = await YG.getData(), localRaw = _readLocal();
  const cloud = migrate(cloudRaw), local = migrate(localRaw);
  const merged = mergeSaves(cloud, local);
  Object.assign(save, merged);
  if (!localRaw || localRaw.v !== SAVE_VERSION || !sameSave(local, merged)) _writeLocal(merged);
  if (!cloudRaw || cloudRaw.v !== SAVE_VERSION || !sameSave(cloud, merged)) YG.setData(merged);
  lastSent = JSON.stringify(merged);
  return save;
}
// вызывать только при смерти, финише, чекпоинте, наградах и покупках: лимит облака 100 запросов за 5 минут
function persist() {
  const snap = snapshot(), json = JSON.stringify(snap);
  _writeLocal(snap);
  if (json !== lastSent) { lastSent = json; YG.setData(snap); }
}
expose({ save, coins, loadSave, persist, migrate, mergeSaves, snapshot, UP_MAX, SKIN_ORDER, RANK });
