export class PromptUI {
  constructor(onPromptChange) {
    this.onPromptChange = onPromptChange;
    this.values = {};
    this._render();
  }

  _render() {
    const container = document.getElementById('prompt-form');
    container.innerHTML = `
      <h2>Prompt Musical</h2>

      <div class="prompt-field">
        <label>Carácter</label>
        <select name="caracter">
          <option value="alegre">Alegre</option>
          <option value="melancolico">Melancólico</option>
          <option value="tenso">Tenso</option>
          <option value="epico">Épico</option>
          <option value="ambient">Ambient</option>
        </select>
      </div>

      <div class="prompt-field">
        <label>Tonalidad</label>
        <select name="tonalidad">
          <option value="mayor">Mayor</option>
          <option value="menor">Menor</option>
          <option value="cromatica">Cromática</option>
          <option value="pentatonica">Pentatónica</option>
        </select>
      </div>

      <div class="prompt-field">
        <label>Estilo</label>
        <select name="estilo">
          <option value="experimental">Experimental</option>
          <option value="electronica">Electrónica</option>
          <option value="organica">Orgánica</option>
          <option value="industrial">Industrial</option>
          <option value="cinematic">Cinematic</option>
        </select>
      </div>

      <div class="prompt-field">
        <label>Textura</label>
        <select name="textura">
          <option value="densa">Densa</option>
          <option value="minimalista">Minimalista</option>
          <option value="caótica">Caótica</option>
          <option value="suave">Suave</option>
        </select>
      </div>

      <div class="prompt-field">
        <label>Dinámica</label>
        <select name="dinamica">
          <option value="crescendo">Crescendo</option>
          <option value="estable">Estable</option>
          <option value="explosiva">Explosiva</option>
        </select>
      </div>

      <button id="btn-apply-prompt">✦ Aplicar Prompt</button>
    `;

    document.getElementById('btn-apply-prompt')
      .addEventListener('click', () => {
        const selects = container.querySelectorAll('select');
        selects.forEach(s => { this.values[s.name] = s.value; });
        console.log('🎛️ Prompt aplicado:', this.values);
        this.onPromptChange(this.values);
      });
  }

  getValues() { return this.values; }
}