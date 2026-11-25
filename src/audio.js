'use strict';
// ---------- audio: синтез WebAudio, без файлов ----------
let AC = null, audioMuted = false, soundEnabled = true;
function syncAudio() {
  if (!AC) return;
  try {
    const pending = audioMuted || !soundEnabled ? AC.suspend() : AC.resume();
    pending?.catch(()=>{});
  } catch {}
}
function audio() {
  if (audioMuted || !soundEnabled) return null;
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (AC.state === 'suspended') syncAudio();
  return AC;
}
function muteAudio() { audioMuted = true; syncAudio(); }
function unmuteAudio() { audioMuted = false; syncAudio(); }
function setSound(enabled) { soundEnabled = enabled; syncAudio(); }
function tone(f0, f1, dur, type = 'sine', vol = 0.25, delay = 0) {
  if (audioMuted) return;
  const ac = audio(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  const start=ac.currentTime+delay;
  o.type = type; o.frequency.setValueAtTime(f0, start);
  o.frequency.exponentialRampToValueAtTime(f1, start + dur);
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g).connect(ac.destination); o.start(start); o.stop(start + dur);
}
// Short, distinct tells accompany the visible windup of each signature trap.
const biomeTell = {
  icicle() { tone(1340,940,.075,'sine',.07); tone(1720,1330,.11,'sine',.035,.08); },
  steam() { tone(320,720,.2,'triangle',.045); },
  rat() { tone(860,1260,.075,'sine',.06); tone(1190,770,.07,'sine',.045,.09); },
  pepper() { tone(390,270,.055,'triangle',.08); tone(510,380,.045,'triangle',.07,.16); },
  flour() { tone(156,95,.095,'triangle',.1); tone(120,76,.09,'triangle',.07,.12); },
  brew() { tone(660,654,.19,'sine',.10); tone(994,974,.11,'sine',.045); },
  smoke() { tone(200,145,.12,'triangle',.08); tone(124,85,.19,'triangle',.07,.10); },
};
const sfx = {
  jump: m => tone(220 - m * 8, 420 - m * 10, 0.14, 'sine', 0.2),
  eat:  () => tone(rnd(500, 700), rnd(900, 1200), 0.09, 'triangle', 0.18),
  big:  () => { tone(300, 160, 0.18, 'square', 0.12); tone(600, 900, 0.12, 'triangle', 0.15); },
  examSkin: () => {
    for (const [i,f] of [523.25,659.25,783.99,1046.5].entries()) tone(f,f*.998,i===3?.32:.16,'triangle',.13,i*.085);
  },
  hit:  () => tone(140, 60, 0.25, 'sawtooth', 0.22),
  die:  () => { tone(300, 40, 0.6, 'sawtooth', 0.25); },
  buy:  () => { tone(600, 900, 0.08, 'triangle', 0.18); tone(900, 1300, 0.1, 'triangle', 0.15); },
};
expose({ tone, muteAudio, unmuteAudio, setSound, get soundEnabled() { return soundEnabled; }, get audioMuted() { return audioMuted; } });
