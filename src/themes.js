'use strict';
// ---------- темы башен (спека v2.2a §3): пять тем по кругу, у каждой уникальные платформы по кругам ----------
// unique[i] — уникальность, которая появляется в теме с (i + 1)-го круга; null — на этом круге нет. Вторые уникальности
// холодильника, духовки, раковины и праздничного стола и правила тем — v2.2b.
const THEMES = [
  { id: 'kitchen', unique: [null, 'board'] },   // кухня: первый круг учебный, доска с ножом со второго
  { id: 'fridge', unique: ['shelf'] },          // холодильник: скользкая полка
  { id: 'oven', unique: ['toaster'] },          // духовка: тостер подбрасывает через секунду
  { id: 'sink', unique: ['bowl'] },             // раковина: липкая миска
  { id: 'feast', unique: ['spatula'] },         // праздничный стол: лопатка-батут
];
function themeFor(N) { return THEMES[(N - 1) % THEMES.length]; }
function loopOf(N) { return Math.floor((N - 1) / THEMES.length) + 1; }
function uniquesFor(N) { const t = themeFor(N), L = loopOf(N); return t.unique.filter((u, i) => u && L >= i + 1); }
expose({ THEMES, themeFor, loopOf, uniquesFor });
