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
