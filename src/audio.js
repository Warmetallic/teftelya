'use strict';
// ---------- audio: синтез WebAudio, без файлов ----------
let AC = null, audioMuted = false;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && !audioMuted && AC.state === 'suspended') { try { AC.resume(); } catch (e) {} }
  return AC;
}
function muteAudio() { audioMuted = true; if (AC) { try { AC.suspend(); } catch (e) {} } }
function unmuteAudio() { audioMuted = false; if (AC) { try { AC.resume(); } catch (e) {} } }
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
expose({ tone, muteAudio, unmuteAudio, get audioMuted() { return audioMuted; } });
