/**
 * Lightweight Web Audio sound effects for presentation mode. Everything here is synthesized
 * (oscillators + gain envelopes) rather than shipped as audio files, so the app stays fully
 * self-contained and offline — no assets to bundle, no network fetches.
 */

const ENABLED_KEY = "quiz-night-sound-enabled";

let ctx: AudioContext | undefined;

function getContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const AudioContextClass =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return undefined;
    if (!ctx) {
      ctx = new AudioContextClass();
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return undefined;
  }
}

export function isSoundEnabled(): boolean {
  return localStorage.getItem(ENABLED_KEY) !== "false";
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(ENABLED_KEY, String(enabled));
}

interface Tone {
  /** Seconds from the effect's start time. */
  offset: number;
  freq: number;
  /** Seconds. */
  duration: number;
  type?: OscillatorType;
  peakGain?: number;
  /** Optional target frequency for a pitch sweep over the tone's duration. */
  sweepTo?: number;
}

function scheduleTones(tones: Tone[]): void {
  if (!isSoundEnabled()) return;
  const audioCtx = getContext();
  if (!audioCtx) return;

  try {
    const start = audioCtx.currentTime + 0.005;
    for (const tone of tones) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = tone.type ?? "sine";
      const toneStart = start + tone.offset;
      const toneEnd = toneStart + tone.duration;

      osc.frequency.setValueAtTime(tone.freq, toneStart);
      if (tone.sweepTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(tone.sweepTo, 1), toneEnd);
      }

      const peak = tone.peakGain ?? 0.2;
      gain.gain.setValueAtTime(0, toneStart);
      gain.gain.linearRampToValueAtTime(peak, toneStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, toneEnd);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(toneStart);
      osc.stop(toneEnd + 0.05);
    }
  } catch {
    // Sound effects are a nice-to-have — never let a scheduling error affect the presentation.
  }
}

/** Ascending major triad — a team answered correctly. */
export function playCorrect(): void {
  scheduleTones([
    { offset: 0, freq: 523.25, duration: 0.14, type: "triangle" },
    { offset: 0.1, freq: 659.25, duration: 0.14, type: "triangle" },
    { offset: 0.2, freq: 783.99, duration: 0.28, type: "triangle", peakGain: 0.22 },
  ]);
}

/** Short descending buzz — a team answered incorrectly. */
export function playIncorrect(): void {
  scheduleTones([
    { offset: 0, freq: 220, duration: 0.22, type: "sawtooth", peakGain: 0.15, sweepTo: 130 },
    { offset: 0.14, freq: 164, duration: 0.24, type: "sawtooth", peakGain: 0.15, sweepTo: 98 },
  ]);
}

/** A single neutral confirmation blip — used for frozen/manual awards. */
export function playConfirm(): void {
  scheduleTones([{ offset: 0, freq: 440, duration: 0.09, type: "sine", peakGain: 0.16 }]);
}

/** A short icy shimmer — a team was frozen by a joker. */
export function playFreeze(): void {
  scheduleTones([
    { offset: 0, freq: 1046.5, duration: 0.2, type: "sine", peakGain: 0.14 },
    { offset: 0.05, freq: 1318.5, duration: 0.28, type: "sine", peakGain: 0.12 },
  ]);
}

/** Quick rising sparkle — a team invoked a joker. */
export function playJoker(): void {
  scheduleTones([
    { offset: 0, freq: 392, duration: 0.08, type: "triangle", peakGain: 0.16 },
    { offset: 0.06, freq: 523.25, duration: 0.08, type: "triangle", peakGain: 0.16 },
    { offset: 0.12, freq: 659.25, duration: 0.08, type: "triangle", peakGain: 0.16 },
    { offset: 0.18, freq: 987.77, duration: 0.18, type: "triangle", peakGain: 0.2 },
  ]);
}

/** Triple beep — the question timer ran out. */
export function playTimerUp(): void {
  scheduleTones([
    { offset: 0, freq: 784, duration: 0.09, type: "square", peakGain: 0.14 },
    { offset: 0.14, freq: 784, duration: 0.09, type: "square", peakGain: 0.14 },
    { offset: 0.28, freq: 587.33, duration: 0.18, type: "square", peakGain: 0.16 },
  ]);
}

/** A quick upward whoosh — the reveal slide just appeared. */
export function playReveal(): void {
  scheduleTones([{ offset: 0, freq: 180, duration: 0.35, type: "sawtooth", peakGain: 0.12, sweepTo: 720 }]);
}

/** A short victory fanfare — the final results slide appeared. */
export function playFanfare(): void {
  scheduleTones([
    { offset: 0, freq: 523.25, duration: 0.16, type: "triangle", peakGain: 0.2 },
    { offset: 0.15, freq: 659.25, duration: 0.16, type: "triangle", peakGain: 0.2 },
    { offset: 0.3, freq: 783.99, duration: 0.16, type: "triangle", peakGain: 0.2 },
    { offset: 0.45, freq: 1046.5, duration: 0.5, type: "triangle", peakGain: 0.24 },
  ]);
}

/**
 * Looping background music, synthesized like everything else here — a bouncy bassline under a
 * syncopated arpeggio, over an upbeat I–vi–IV–V progression. Uses the standard "lookahead"
 * scheduling technique (poll frequently, schedule notes into the Web Audio clock slightly ahead
 * of time) so the loop stays tight regardless of JS timer jitter.
 */

const MUSIC_ENABLED_KEY = "quiz-night-music-enabled";

/** Opt-in, unlike sound effects — background music is a bigger, more opinionated addition, so it
 * stays off until the host explicitly turns it on via the toggle in presentation mode. */
export function isMusicEnabled(): boolean {
  return localStorage.getItem(MUSIC_ENABLED_KEY) === "true";
}

export function setMusicEnabled(enabled: boolean): void {
  localStorage.setItem(MUSIC_ENABLED_KEY, String(enabled));
}

const MUSIC_BPM = 128;
const SIXTEENTH_SECONDS = 60 / MUSIC_BPM / 4;
const STEPS_PER_BAR = 16;
const SCHEDULE_AHEAD_SECONDS = 0.1;
const SCHEDULER_INTERVAL_MS = 25;
const MUSIC_NORMAL_GAIN = 0.05;
const MUSIC_DUCKED_GAIN = 0.015;
const GAIN_RAMP_SECONDS = 0.4;

/** One bar each; bass is the chord root, arp cycles through the chord on eighth notes. */
const MUSIC_PROGRESSION = [
  { bass: 130.81, arp: [261.63, 329.63, 392.0, 329.63] }, // C
  { bass: 110.0, arp: [220.0, 261.63, 329.63, 261.63] }, // Am
  { bass: 87.31, arp: [174.61, 220.0, 261.63, 220.0] }, // F
  { bass: 98.0, arp: [196.0, 246.94, 293.66, 246.94] }, // G
];

interface MusicState {
  schedulerId: number;
  nextStepTime: number;
  step: number;
  ducked: boolean;
}

let music: MusicState | undefined;

/**
 * The master gain node, created once and reused for the whole page lifetime rather than
 * recreated on every startMusic(). If it were recreated per-start, calling startMusic() again
 * before a previous stopMusic()'s fade-out finished would leave two gain chains briefly
 * overlapping — one fading out, one fading in — summing to audibly more than normal volume for
 * a moment before settling. Reusing a single node makes that impossible.
 */
let musicGain: GainNode | undefined;

/**
 * Fixed anchor for step 0, set the first time the loop ever starts and never touched again.
 * Restarting the loop (e.g. toggling the mute button off then on) computes where the beat would
 * be *if it had kept playing since this epoch* instead of resetting to step 0, so muting and
 * unmuting doesn't audibly jump back to the top of the bar.
 */
let musicEpoch: number | undefined;

function pluck(
  audioCtx: AudioContext,
  destination: GainNode,
  time: number,
  freq: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
): void {
  const osc = audioCtx.createOscillator();
  const toneGain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  toneGain.gain.setValueAtTime(0, time);
  toneGain.gain.linearRampToValueAtTime(peakGain, time + 0.008);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(toneGain);
  toneGain.connect(destination);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}

function scheduleMusicStep(audioCtx: AudioContext, destination: GainNode, step: number, time: number): void {
  const bar = MUSIC_PROGRESSION[Math.floor(step / STEPS_PER_BAR) % MUSIC_PROGRESSION.length];
  const stepInBar = step % STEPS_PER_BAR;

  if (stepInBar % 4 === 0) {
    pluck(audioCtx, destination, time, bar.bass, SIXTEENTH_SECONDS * 3.5, "triangle", 1);
  }
  if (stepInBar % 2 === 0) {
    const note = bar.arp[(stepInBar / 2) % bar.arp.length];
    pluck(audioCtx, destination, time, note, SIXTEENTH_SECONDS * 1.6, "square", 0.35);
  }
}

function getMusicGain(audioCtx: AudioContext): GainNode {
  if (!musicGain) {
    musicGain = audioCtx.createGain();
    musicGain.gain.setValueAtTime(0, audioCtx.currentTime);
    musicGain.connect(audioCtx.destination);
  }
  return musicGain;
}

function applyMusicGain(ducked: boolean): void {
  const audioCtx = getContext();
  if (!audioCtx || !musicGain) return;
  const target = ducked ? MUSIC_DUCKED_GAIN : MUSIC_NORMAL_GAIN;
  musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
  musicGain.gain.linearRampToValueAtTime(target, audioCtx.currentTime + GAIN_RAMP_SECONDS);
}

/**
 * Starts the background music loop, if not already running. Nothing is scheduled while music is
 * off — this should only be called while it's meant to be audible — so there's no mute state that
 * could momentarily leak sound. Resuming after stopMusic() picks the beat up from where it would
 * be had it never stopped (see musicEpoch) instead of restarting it, and ducked reflects whatever
 * the presentation's current slide calls for instead of always assuming full volume.
 */
export function startMusic(ducked = false): void {
  if (music) return;
  const audioCtx = getContext();
  if (!audioCtx) return;

  try {
    if (musicEpoch === undefined) musicEpoch = audioCtx.currentTime;
    const elapsedSteps = (audioCtx.currentTime - musicEpoch) / SIXTEENTH_SECONDS;
    const step = Math.max(0, Math.ceil(elapsedSteps));
    const nextStepTime = musicEpoch + step * SIXTEENTH_SECONDS;

    const gain = getMusicGain(audioCtx);
    const state: MusicState = { schedulerId: 0, nextStepTime, step, ducked };
    state.schedulerId = window.setInterval(() => {
      const ctxNow = getContext();
      if (!ctxNow) return;
      while (state.nextStepTime < ctxNow.currentTime + SCHEDULE_AHEAD_SECONDS) {
        scheduleMusicStep(ctxNow, gain, state.step, state.nextStepTime);
        state.nextStepTime += SIXTEENTH_SECONDS;
        state.step += 1;
      }
    }, SCHEDULER_INTERVAL_MS);
    music = state;
    applyMusicGain(ducked);
  } catch {
    // Background music is a nice-to-have — never let a scheduling error affect the presentation.
  }
}

/** Stops the background music loop — used both for muting and for leaving the presentation. */
export function stopMusic(): void {
  if (!music) return;
  window.clearInterval(music.schedulerId);
  music = undefined;

  const audioCtx = getContext();
  if (!audioCtx || !musicGain) return;
  musicGain.gain.cancelScheduledValues(audioCtx.currentTime);
  musicGain.gain.setValueAtTime(musicGain.gain.value, audioCtx.currentTime);
  musicGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
}

/** Lowers the music volume — used while a reveal/scoring slide has focus. */
export function duckMusic(): void {
  if (!music) return;
  music.ducked = true;
  applyMusicGain(true);
}

/** Restores the music volume after duckMusic(). */
export function unduckMusic(): void {
  if (!music) return;
  music.ducked = false;
  applyMusicGain(false);
}
