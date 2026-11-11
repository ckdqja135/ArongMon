// 효과음과 배경음악 (Web Audio). 펄스파·삼각파·노이즈로 칩튠 소리를 낸다.
// 브라우저 정책상 첫 키 입력/터치 뒤에 소리가 켜진다.
import { SONGS, type Song } from '../data/music';
import { settings } from '../game/settings';

let ctx: AudioContext | null = null;
let master: GainNode;
let sfxBus: GainNode;
let musicBus: GainNode;
let pulse: PeriodicWave;
let noiseBuf: AudioBuffer;

let wanted: string | null = null;
let playing: { id: string; gain: GainNode; timer: number } | null = null;

function init() {
  if (ctx) return;
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.32;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.9;
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = 0.45;
  musicBus.connect(master);
  // 25% 펄스파 (휴대용 게임기 느낌)
  const n = 32;
  const re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * 0.25);
  pulse = ctx.createPeriodicWave(re, im);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

/** 첫 사용자 입력 때 호출 */
export function unlockAudio() {
  init();
  if (ctx!.state === 'suspended') void ctx!.resume();
  if (wanted && !playing) playMusic(wanted);
}

export function setSoundEnabled(on: boolean) {
  settings.sound = on;
  if (!ctx) return;
  master.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.02);
}

const NOTE_IDX: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
export function freq(note: string): number {
  const m = /^([A-G]#?)(\d)$/.exec(note);
  if (!m) return 0;
  const midi = 12 * (Number(m[2]) + 1) + NOTE_IDX[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

type Wave = 'pulse' | 'square' | 'triangle' | 'sawtooth' | 'sine';

function tone(out: AudioNode, wave: Wave, f0: number, t: number, dur: number, vol: number, f1 = f0) {
  const c = ctx!;
  const o = c.createOscillator();
  if (wave === 'pulse') o.setPeriodicWave(pulse);
  else o.type = wave;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005);
  g.gain.setValueAtTime(vol * 0.75, t + Math.min(dur * 0.4, 0.08));
  g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(out: AudioNode, t: number, dur: number, vol: number, filter: BiquadFilterType, fq: number) {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = fq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

// ── 효과음 ──
export type Sfx =
  | 'cursor' | 'select' | 'cancel' | 'bump' | 'door' | 'jump' | 'exclaim' | 'item'
  | 'attack' | 'hit' | 'hitBig' | 'faint' | 'statUp' | 'statDown' | 'status' | 'enter'
  | 'throw' | 'shake' | 'caught' | 'levelup' | 'heal' | 'badge' | 'evolve' | 'bike' | 'ring' | 'fly';

export function sfx(name: Sfx) {
  if (!ctx || !settings.sound) return;
  const t = ctx.currentTime + 0.005;
  const o = sfxBus;
  const arp = (notes: string[], step: number, wave: Wave = 'pulse', vol = 0.22) =>
    notes.forEach((n, i) => tone(o, wave, freq(n), t + i * step, step * 0.95, vol));
  switch (name) {
    case 'cursor': return tone(o, 'pulse', 1760, t, 0.03, 0.12);
    case 'select': return tone(o, 'pulse', 1320, t, 0.06, 0.16, 1980);
    case 'cancel': return tone(o, 'pulse', 990, t, 0.06, 0.14, 660);
    case 'bump': return tone(o, 'square', 110, t, 0.07, 0.18, 90);
    case 'door': noise(o, t, 0.18, 0.25, 'lowpass', 1200); return tone(o, 'triangle', 300, t, 0.18, 0.2, 150);
    case 'jump': return tone(o, 'pulse', 400, t, 0.18, 0.15, 900);
    case 'exclaim': return arp(['E6', 'B6'], 0.07);
    case 'item': return arp(['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], 0.08);
    case 'attack': return noise(o, t, 0.12, 0.18, 'highpass', 2500);
    case 'hit': noise(o, t, 0.16, 0.45, 'lowpass', 1800); return tone(o, 'square', 180, t, 0.1, 0.18, 60);
    case 'hitBig': noise(o, t, 0.3, 0.6, 'lowpass', 1400); return tone(o, 'square', 140, t, 0.22, 0.25, 40);
    case 'faint': return tone(o, 'pulse', 880, t, 0.55, 0.2, 80);
    case 'statUp': return arp(['C5', 'E5', 'G5', 'C6', 'E6'], 0.05, 'pulse', 0.15);
    case 'statDown': return arp(['C6', 'G5', 'E5', 'C5', 'G4'], 0.05, 'pulse', 0.15);
    case 'status': return tone(o, 'triangle', 600, t, 0.3, 0.25, 300);
    case 'enter': return tone(o, 'pulse', 300, t, 0.15, 0.15, 1200);
    case 'throw': return tone(o, 'triangle', 200, t, 0.4, 0.25, 900);
    case 'shake': noise(o, t, 0.05, 0.3, 'bandpass', 3000); return tone(o, 'square', 220, t, 0.05, 0.12);
    case 'caught': return arp(['G5', 'C6', 'E6', 'G6'], 0.09);
    case 'levelup': return arp(['C5', 'D5', 'E5', 'G5', 'C6', 'E6'], 0.06);
    case 'heal': return arp(['E5', 'G5', 'C6', 'G5', 'E6', 'C6', 'G6'], 0.12, 'triangle', 0.35);
    case 'badge': return arp(['C5', 'E5', 'G5', 'C6', 'r', 'G5', 'C6', 'E6'].map((n) => (n === 'r' ? 'C0' : n)), 0.11);
    case 'evolve': return arp(['C5', 'G5', 'E6', 'C6', 'G6', 'E7'], 0.09, 'triangle', 0.3);
    case 'bike': return arp(['G5', 'D6'], 0.06, 'pulse', 0.12);
    case 'fly': noise(o, t, 0.5, 0.3, 'bandpass', 900); return tone(o, 'triangle', 240, t, 0.5, 0.18, 980);
    case 'ring': return arp(['E6', 'C6', 'E6', 'C6', 'E6', 'C6', 'C0', 'E6', 'C6', 'E6', 'C6', 'E6', 'C6'], 0.05, 'pulse', 0.12);
  }
}

// ── 배경음악 ──
interface Ev { t: number; dur: number; f: number; drum?: 'k' | 's' | 'h' }

function parseTrack(src: string, unit: number): { evs: Ev[]; len: number } {
  const evs: Ev[] = [];
  let t = 0;
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === '|') continue;
    const [name, n] = tok.split('.');
    const dur = Number(n || 1) * unit;
    if (name === 'k' || name === 's' || name === 'h') evs.push({ t, dur, f: 0, drum: name });
    else if (name !== 'r') evs.push({ t, dur, f: freq(name) });
    t += dur;
  }
  return { evs, len: t };
}

function scheduleSong(song: Song, gain: GainNode, start: number): number {
  const unit = 60 / song.bpm / 2;
  let len = 0;
  for (const tr of song.tracks) {
    const { evs, len: l } = parseTrack(tr.notes, unit);
    len = Math.max(len, l);
    for (const e of evs) {
      const at = start + e.t;
      if (e.drum === 'k') noise(gain, at, 0.08, tr.vol * 1.4, 'lowpass', 300);
      else if (e.drum === 's') noise(gain, at, 0.1, tr.vol, 'bandpass', 1800);
      else if (e.drum === 'h') noise(gain, at, 0.03, tr.vol * 0.6, 'highpass', 7000);
      else tone(gain, tr.wave, e.f, at, e.dur * 0.92, tr.vol);
    }
  }
  return len;
}

export function playMusic(id: string | null) {
  wanted = id;
  if (!ctx) return;
  if (playing?.id === id) return;
  stopMusic();
  if (!id) return;
  const song = SONGS[id];
  if (!song) return;
  const gain = ctx.createGain();
  gain.gain.value = 1;
  gain.connect(musicBus);
  let next = ctx.currentTime + 0.1;
  next += scheduleSong(song, gain, next);
  const timer = window.setInterval(() => {
    if (!ctx || !song.loop) return;
    if (ctx.currentTime + 1 > next) next += scheduleSong(song, gain, next);
  }, 250);
  playing = { id, gain, timer };
}

export function stopMusic() {
  if (!playing || !ctx) return;
  const { gain, timer } = playing;
  clearInterval(timer);
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  setTimeout(() => gain.disconnect(), 400);
  playing = null;
}
