/**
 * Lightweight synthesized audio engine using the Web Audio API.
 * No external assets needed — everything is generated procedurally:
 *  - low city ambience drone
 *  - rain / wind noise filtered
 *  - occasional traffic hiss
 *  - thunder claps during storms
 */
export class CityAudio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private thunderTimer: number | null = null;
  enabled = false;

  start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.0;
    this.master.connect(this.ctx.destination);

    // ambient drone — two detuned oscillators through a lowpass
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.04;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 220;
    droneGain.connect(this.master);
    lp.connect(droneGain);
    [55, 55.4, 82].forEach((f) => {
      const o = this.ctx!.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.connect(lp);
      o.start();
      this.nodes.push(o);
    });

    // pink-ish noise for wind / rain base
    const noise = this.makeNoise();
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.0;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 1000;
    noiseFilter.Q.value = 0.5;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.master);
    this.nodes.push(noise);
    (this as any)._noiseGain = noiseGain;
    (this as any)._noiseFilter = noiseFilter;

    // fade in master
    this.master.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 1.2);
    this.enabled = true;
  }

  private makeNoise() {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      // simple low-pass to make brown-ish noise
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.0;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    return src;
  }

  /** Update ambience based on current weather. */
  update(weather: { type: string; wind: number; precipitation: number; cloudCover: number }) {
    if (!this.ctx || !this.enabled) return;
    const ng = (this as any)._noiseGain as GainNode;
    const nf = (this as any)._noiseFilter as BiquadFilterNode;
    if (!ng || !nf) return;
    const now = this.ctx.currentTime;

    let target = 0.0;
    let freq = 800;
    if (weather.type === "rain") {
      target = 0.12 * (0.5 + weather.precipitation);
      freq = 1800;
    } else if (weather.type === "storm") {
      target = 0.2;
      freq = 1400;
    } else if (weather.type === "snow") {
      target = 0.05;
      freq = 900;
    } else if (weather.type === "fog") {
      target = 0.04;
      freq = 500;
    } else {
      target = 0.02 + weather.wind * 0.05;
      freq = 600;
    }
    ng.gain.linearRampToValueAtTime(target, now + 0.8);
    nf.frequency.linearRampToValueAtTime(freq, now + 0.8);

    // schedule thunder during storms
    if (weather.type === "storm" && this.thunderTimer == null) {
      this.thunderTimer = window.setInterval(() => {
        if (Math.random() < 0.5) this.thunder();
      }, 5000);
    } else if (weather.type !== "storm" && this.thunderTimer != null) {
      clearInterval(this.thunderTimer);
      this.thunderTimer = null;
    }
  }

  thunder() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.6, t + 0.02);
    g.gain.linearRampToValueAtTime(0, t + 1.1);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 350;
    src.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    src.start();
  }

  toggle() {
    if (!this.ctx) {
      this.start();
      return true;
    }
    this.enabled = !this.enabled;
    if (this.master) {
      this.master.gain.linearRampToValueAtTime(
        this.enabled ? 0.5 : 0,
        this.ctx.currentTime + 0.3,
      );
    }
    return this.enabled;
  }
}

export const cityAudio = new CityAudio();
