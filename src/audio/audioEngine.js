export class AudioEngine {
  constructor() {
    this.players = {};
    this.reverb      = new Tone.Reverb({ decay: 3, wet: 0 }).toDestination();
    this.distortion  = new Tone.Distortion({ distortion: 0, wet: 0 }).toDestination();
    this.delay       = new Tone.FeedbackDelay("8n", 0).toDestination();
    this.vol         = new Tone.Volume(0).toDestination();
    this.isStarted   = false;
  }

  async init() {
    await Tone.start();
    this.isStarted = true;
    console.log('✅ AudioEngine iniciado');
  }

  async loadSound(id, url) {
    return new Promise((resolve) => {
      const player = new Tone.Player({
        url,
        loop: true,
        autostart: false,
        onload: () => {
          console.log(`✅ Sonido cargado: ${id}`);
          resolve();
        }
      })
      .connect(this.reverb)
      .connect(this.distortion)
      .connect(this.delay)
      .connect(this.vol);

      this.players[id] = player;
    });
  }

  play(id) {
    if (this.players[id]?.state !== 'started') {
      this.players[id]?.start();
      console.log(`▶ Reproduciendo: ${id}`);
    }
  }

  stop(id) {
    if (this.players[id]?.state === 'started') {
      this.players[id]?.stop();
    }
  }

  stopAll() {
    Object.keys(this.players).forEach(id => this.stop(id));
  }

  // value siempre entre 0.0 y 1.0
  setEffect(effectName, value) {
    const v = Math.max(0, Math.min(1, value)); // clamp seguro
    switch (effectName) {
      case 'reverb':      this.reverb.wet.value = v; break;
      case 'distortion':  this.distortion.wet.value = v; break;
      case 'delay':       this.delay.wet.value = v; break;
      case 'volume':
        // Convierte 0-1 a decibelios (-40db a 0db)
        this.vol.volume.value = v === 0 ? -Infinity : Tone.gainToDb(v);
        break;
    }
  }
}