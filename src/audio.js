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
function tone(f0, f1, dur, type = 'sine', vol = 0.25) {
  if (audioMuted) return;
  const ac = audio(); if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + dur);
  g.gain.setValueAtTime(vol, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
}
const sfx = {
  jump: m => tone(220 - m * 8, 420 - m * 10, 0.14, 'sine', 0.2),
  eat:  () => tone(rnd(500, 700), rnd(900, 1200), 0.09, 'triangle', 0.18),
  big:  () => { tone(300, 160, 0.18, 'square', 0.12); tone(600, 900, 0.12, 'triangle', 0.15); },
  hit:  () => tone(140, 60, 0.25, 'sawtooth', 0.22),
  die:  () => { tone(300, 40, 0.6, 'sawtooth', 0.25); },
};
Object.assign(DBG, { tone, muteAudio, unmuteAudio, get audioMuted() { return audioMuted; } });
