'use strict';
// ---------- сохранения: облако Яндекса + локальный резерв, при загрузке максимум по полям ----------
// v2 — монотонный журнал: earned/spent только растут, баланс = earned − spent; уровни апгрейдов тоже только растут.
// Поэтому слияние «максимум по полям» корректно: игрок никогда не теряет, а баланс не уходит в минус
// (на каждом устройстве spent ≤ earned, значит max(earned) − max(spent) ≥ 0).
const SAVE_VERSION = 2;
const SAVE_KEY = 'teft_save';
const UP_MAX = { jumps: 2, magnet: 3 };   // максимальные уровни апгрейдов; каталог и цены — в upgrades.js
const save = { v: SAVE_VERSION, best: 0, earned: 0, spent: 0, up: { jumps: 0, magnet: 0 } };
function coins() { return Math.max(0, save.earned - save.spent); }
const _int = v => Math.max(0, Math.floor(+v || 0));
// приводит объект любой версии (или мусор) к текущей схеме; v1 {coins} → earned = coins, spent = 0
function migrate(obj) {
  const o = { v: SAVE_VERSION, best: 0, earned: 0, spent: 0, up: { jumps: 0, magnet: 0 } };
  if (obj && typeof obj === 'object') {
    o.best = _int(obj.best);
    if (obj.earned !== undefined || obj.spent !== undefined) { o.earned = _int(obj.earned); o.spent = _int(obj.spent); }
    else o.earned = _int(obj.coins);
    const up = obj.up && typeof obj.up === 'object' ? obj.up : {};
    for (const k of Object.keys(UP_MAX)) o.up[k] = Math.min(UP_MAX[k], _int(up[k]));
  }
  return o;
}
function mergeSaves(a, b) {
  const o = { v: SAVE_VERSION, best: Math.max(a.best || 0, b.best || 0), earned: Math.max(a.earned || 0, b.earned || 0), spent: Math.max(a.spent || 0, b.spent || 0), up: {} };
  for (const k of Object.keys(UP_MAX)) o.up[k] = Math.max((a.up && a.up[k]) || 0, (b.up && b.up[k]) || 0);
  return o;
}
function snapshot() { return { v: SAVE_VERSION, best: save.best, earned: save.earned, spent: save.spent, up: { jumps: save.up.jumps, magnet: save.up.magnet } }; }
function sameSave(a, b) { return JSON.stringify(migrate(a)) === JSON.stringify(migrate(b)); }
function _readLocal() {
  const st = YG.storage; if (!st) return null;
  try {
    const raw = st.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
    // миграция с ключей прототипа (v1)
    const b = +st.getItem('teft_best') || 0, c = +st.getItem('teft_coins') || 0;
    if (b || c) { const o = { v: 1, best: b, coins: c }; st.setItem(SAVE_KEY, JSON.stringify(o)); st.removeItem('teft_best'); st.removeItem('teft_coins'); return o; }
  } catch (e) {}
  return null;
}
function _writeLocal(obj) { try { if (YG.storage) YG.storage.setItem(SAVE_KEY, JSON.stringify(obj)); } catch (e) {} }
let lastSent = '';   // последний снимок, отправленный в облако — чтобы не слать повторно один и тот же
async function loadSave() {
  const cloudRaw = await YG.getData(), localRaw = _readLocal();
  const cloud = migrate(cloudRaw), local = migrate(localRaw);
  const merged = mergeSaves(cloud, local);
  Object.assign(save, merged);
  // переписываем хранилище, если оно пустое, старой версии или отличается от слитого
  if (!localRaw || localRaw.v !== SAVE_VERSION || !sameSave(local, merged)) _writeLocal(merged);
  if (!cloudRaw || cloudRaw.v !== SAVE_VERSION || !sameSave(cloud, merged)) YG.setData(merged);
  lastSent = JSON.stringify(merged);
  return save;
}
// вызывать только при смерти, наградах и покупках: лимит облака 100 запросов за 5 минут
function persist() {
  const snap = snapshot();
  const json = JSON.stringify(snap);
  _writeLocal(snap);
  if (json !== lastSent) { lastSent = json; YG.setData(snap); }
}
expose({ save, coins, loadSave, persist, migrate, mergeSaves, UP_MAX });
