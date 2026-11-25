'use strict';
// ---------- темы башен (спека v2.2a §3): пять тем по кругу, у каждой уникальные платформы по кругам ----------
// unique[i] задаёт платформу, которая появляется с круга i + 1. Ловушки и правила тем собраны в biomes.js.
const THEMES = [
  { id: 'kitchen', unique: ['board'] },         // первая кухня знакомит с одной доской у стены
  { id: 'fridge', unique: ['shelf'] },          // холодильник: скользкая полка
  { id: 'oven', unique: ['toaster'] },          // духовка: тостер подбрасывает через секунду
  { id: 'cellar', unique: ['gum'] },             // погреб: доска с прилипшей жвачкой
  { id: 'feast', unique: ['spatula'] },         // праздничный стол: лопатка-батут
];
function themeFor(N) { return THEMES[(N - 1) % THEMES.length]; }
function loopOf(N) { return Math.floor((N - 1) / THEMES.length) + 1; }
function uniquesFor(N) { const t = themeFor(N), L = loopOf(N); return t.unique.filter((u, i) => u && L >= i + 1); }
expose({ THEMES, themeFor, loopOf, uniquesFor });
