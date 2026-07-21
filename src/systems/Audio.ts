export class AudioBus {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock() {
    this.ensure();
  }

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain = 0.08,
    slide = 0,
  ) {
    if (this.muted) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, ctx.currentTime + dur);
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  shoot() {
    this.tone(180, 0.08, "square", 0.06, -80);
    this.tone(90, 0.1, "sawtooth", 0.04);
  }

  reload() {
    this.tone(220, 0.05, "triangle", 0.05);
    this.tone(320, 0.08, "triangle", 0.04, 80);
  }

  hit() {
    this.tone(140, 0.06, "sawtooth", 0.05, -40);
  }

  kill() {
    this.tone(90, 0.15, "sawtooth", 0.07, -60);
  }

  hurt() {
    this.tone(60, 0.25, "square", 0.08, -30);
  }

  start() {
    this.tone(260, 0.1, "square", 0.06);
    this.tone(390, 0.15, "square", 0.05);
  }

  bossHit() {
    this.tone(70, 0.12, "sawtooth", 0.09, -20);
  }

  defendWarn() {
    this.tone(520, 0.08, "square", 0.05);
    this.tone(380, 0.1, "square", 0.04);
  }

  defendSuccess() {
    this.tone(440, 0.08, "triangle", 0.06);
    this.tone(660, 0.12, "triangle", 0.05, 40);
  }

  continueBeep() {
    this.tone(440, 0.08, "square", 0.05);
  }

  win() {
    [262, 330, 392, 523].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, "triangle", 0.06), i * 120);
    });
  }
}
