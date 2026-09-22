'use strict';
// ---------- сохранения: облако Яндекса + локальный резерв, при загрузке максимум по полям ----------
const SAVE_VERSION = 1;
const SAVE_KEY = 'teft_save';
const save = { v: SAVE_VERSION, best: 0, coins: 0 };
// приводит объект любой версии (или мусор) к текущей схеме
function migrate(obj) {
  const o = { v: SAVE_VERSION, best: 0, coins: 0 };
  if (obj && typeof obj === 'object') {
    o.best = Math.max(0, Math.floor(+obj.best || 0));
    o.coins = Math.max(0, Math.floor(+obj.coins || 0));
  }
  return o;
}
function mergeSaves(a, b) {
  return { v: SAVE_VERSION, best: Math.max(a.best || 0, b.best || 0), coins: Math.max(a.coins || 0, b.coins || 0) };
}
function sameSave(a, b) { return a.best === b.best && a.coins === b.coins; }
function _readLocal() {
  const st = YG._storage; if (!st) return null;
  try {
    const raw = st.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
    // миграция с ключей прототипа
    const b = +st.getItem('teft_best') || 0, c = +st.getItem('teft_coins') || 0;
    if (b || c) { st.removeItem('teft_best'); st.removeItem('teft_coins'); const o = { v: 1, best: b, coins: c }; st.setItem(SAVE_KEY, JSON.stringify(o)); return o; }
  } catch (e) {}
  return null;
}
function _writeLocal(obj) { try { if (YG._storage) YG._storage.setItem(SAVE_KEY, JSON.stringify(obj)); } catch (e) {} }
async function loadSave() {
  const cloudRaw = await YG.getData(), localRaw = _readLocal();
  const cloud = migrate(cloudRaw), local = migrate(localRaw);
  const merged = mergeSaves(cloud, local);
  Object.assign(save, merged);
  if (!localRaw || !sameSave(local, merged)) _writeLocal(merged);
  if (!cloudRaw || !sameSave(cloud, merged)) YG.setData(merged);
  return save;
}
// вызывать только при смерти и наградах: лимит облака 100 запросов за 5 минут
function persist() {
  const snap = { v: SAVE_VERSION, best: save.best, coins: save.coins };
  _writeLocal(snap);
  YG.setData(snap);
}
expose({ save, loadSave, persist, migrate, mergeSaves });
