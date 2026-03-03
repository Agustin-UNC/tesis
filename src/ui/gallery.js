// Base de sonidos filtrable por prompt
const SOUND_LIBRARY = [
  // Alegre / Mayor
  { id: 'gong',      name: '🔔 Gong',          url: 'https://tonejs.github.io/audio/berklee/gong_1.mp3',        caracter: ['alegre','epico'],       estilo: ['experimental','cinematic'] },
  { id: 'guitar1',   name: '🎸 Guitarra Loop',   url: 'https://tonejs.github.io/audio/berklee/guitar_1.mp3',     caracter: ['alegre','melancolico'], estilo: ['organica','experimental'] },
  { id: 'cello',     name: '🎻 Cello',           url: 'https://tonejs.github.io/audio/berklee/cello_1.mp3',      caracter: ['melancolico','ambient'],estilo: ['cinematic','organica'] },
  { id: 'trumpet',   name: '🎺 Trompeta',        url: 'https://tonejs.github.io/audio/berklee/trumpet_1.mp3',    caracter: ['epico','alegre'],       estilo: ['cinematic','electronica'] },
  { id: 'piano',     name: '🎹 Piano',           url: 'https://tonejs.github.io/audio/berklee/piano_1.mp3',      caracter: ['melancolico','ambient'],estilo: ['organica','cinematic'] },
  { id: 'bass',      name: '🎵 Bass Synth',      url: 'https://tonejs.github.io/audio/berklee/bass_1.mp3',       caracter: ['tenso','industrial'],   estilo: ['electronica','industrial'] },
  { id: 'perc',      name: '🥁 Percusión',       url: 'https://tonejs.github.io/audio/berklee/perc_1.mp3',       caracter: ['epico','tenso'],        estilo: ['industrial','experimental'] },
];

export class GalleryUI {
  constructor(audioEngine, mapper) {
    this.audioEngine   = audioEngine;
    this.mapper        = mapper;
    this.filteredSounds = [...SOUND_LIBRARY];
    this.activeSound   = null;
    this._render(this.filteredSounds);
    this._setupEffectButtons();
  }

  // Filtra según el prompt aplicado
  filterByPrompt(promptValues) {
    this.filteredSounds = SOUND_LIBRARY.filter(sound => {
      const matchCaracter = !promptValues.caracter ||
        sound.caracter.includes(promptValues.caracter);
      const matchEstilo = !promptValues.estilo ||
        sound.estilo.includes(promptValues.estilo);
      return matchCaracter || matchEstilo;
    });

    console.log(`🎵 Sonidos filtrados: ${this.filteredSounds.length}`);
    this._render(this.filteredSounds);
  }

  _render(sounds) {
    const drawer = document.getElementById('gallery-drawer');
    drawer.innerHTML = `
      <div class="drawer-header">
        <h3>🎸 Galería de Sonidos</h3>
        <button id="btn-close-drawer">✕</button>
      </div>
      <p class="drawer-subtitle">${sounds.length} sonidos disponibles</p>
      <div class="sound-list">
        ${sounds.map(s => `
          <div class="sound-card" data-id="${s.id}" data-url="${s.url}">
            <span class="sound-name">${s.name}</span>
            <div class="sound-actions">
              <button class="btn-load" data-id="${s.id}" data-url="${s.url}">
                Cargar
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="mapping-section">
        <h4>🔗 Asignar Gesto → Efecto</h4>
        <div class="mapping-row">
          <select id="sel-body">
            <option value="rightHand">Mano Derecha</option>
            <option value="leftHand">Mano Izquierda</option>
            <option value="face">Boca</option>
            <option value="body">Brazos</option>
          </select>
          <span>→</span>
          <select id="sel-gesture">
            <option value="openness">Apertura</option>
            <option value="mouthOpen">Boca Abierta</option>
            <option value="headTilt">Inclinación</option>
            <option value="armsUp">Brazos Arriba</option>
          </select>
          <span>→</span>
          <select id="sel-effect">
            <optgroup label="🎹 Sintetizador (Generado)">
              <option value="synthVolume">Sinte: Volumen</option>
              <option value="synthPitch">Sinte: Tono (Pitch)</option>
              <option value="synthTimbre">Sinte: Timbre</option>
            </optgroup>
            <optgroup label="💿 Sampler (Galería)">
              <option value="volume">Sampler: Volumen</option>
              <option value="distortion">Sampler: Distorsión</option>
              <option value="samplePitch">Sampler: Velocidad/Tono</option>
              <option value="reverb">Global: Reverb</option>
              <option value="delay">Global: Delay</option>
            </optgroup>
          </select>
        </div>
        <button id="btn-add-mapping">+ Agregar Mapeo</button>
        <div id="mapping-list"></div>
      </div>
    `;

    // Cerrar drawer
    document.getElementById('btn-close-drawer')
      .addEventListener('click', () => {
        drawer.classList.remove('open');
      });

    // Botones "Cargar" de cada sonido
    drawer.querySelectorAll('.btn-load').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const { id, url } = e.target.dataset;
        await this._loadAndPlay(id, url);
      });
    });
  }

  async _loadAndPlay(id, url) {
    // Para el sonido anterior
    if (this.activeSound) this.audioEngine.stop(this.activeSound);

    const card = document.querySelector(`.sound-card[data-id="${id}"]`);
    if (card) card.classList.add('loading');

    await this.audioEngine.loadSound(id, url);
    this.audioEngine.play(id);
    this.activeSound = id;

    if (card) {
      card.classList.remove('loading');
      card.classList.add('active');
      document.querySelectorAll('.sound-card').forEach(c => {
        if (c.dataset.id !== id) c.classList.remove('active');
      });
    }

    console.log(`▶ Cargado y reproduciendo: ${id}`);
  }

  _setupEffectButtons() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-add-mapping') {
        const body    = document.getElementById('sel-body').value;
        const gesture = document.getElementById('sel-gesture').value;
        const effect  = document.getElementById('sel-effect').value;

        this.mapper.addMapping(body, gesture, effect);

        // Muestra el mapeo agregado
        const list = document.getElementById('mapping-list');
        const tag  = document.createElement('div');
        tag.className = 'mapping-tag';
        tag.innerHTML = `
          ${body} → ${gesture} → <strong>${effect}</strong>
          <span class="remove-mapping">✕</span>
        `;
        tag.querySelector('.remove-mapping').addEventListener('click', () => {
          tag.remove();
          this.mapper.removeMapping(body, gesture, effect);
        });
        list.appendChild(tag);
      }
    });
  }
}