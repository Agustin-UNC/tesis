import { PoseDetector } from './vision/poseDetector.js';
import { HandDetector } from './vision/handDetector.js';
import { FaceDetector } from './vision/faceDetector.js';
// Al inicio, agrega estos imports:
import { AudioEngine } from './audio/audioEngine.js';
import { Mapper } from './mapping/mapper.js';
import { PromptUI } from './ui/prompt.js';
import { GalleryUI } from './ui/gallery.js';
// === ELEMENTOS ===
const video   = document.getElementById('webcam');
const canvas  = document.getElementById('overlay');
const ctx     = canvas.getContext('2d');
const btnPlay = document.getElementById('btn-play');
const btnGallery = document.getElementById('btn-gallery');
const drawer  = document.getElementById('gallery-drawer');
const audioEngine = new AudioEngine();
const mapper = new Mapper(audioEngine);

// UI de Prompt y Galería
const gallery = new GalleryUI(audioEngine, mapper);
const prompt  = new PromptUI((values) => {
  gallery.filterByPrompt(values);
  drawer.classList.add('open'); // abre la galería automáticamente
});

// === ESTADO ===
let isPlaying = false;
let poseResults = null;
let handResults = null;
let faceResults = null;
let debugFrame = 0;

// === SINTETIZADOR EXPERIMENTAL ===
let synth = null;

// === DETECTORES ===
const poseDetector = new PoseDetector();
const handDetector = new HandDetector();
const faceDetector = new FaceDetector();

// Guardar resultados cuando llegan
poseDetector.onResults(r => { poseResults = r; });
handDetector.onResults(r => { handResults = r; });
faceDetector.onResults(r => { faceResults = r; });

// === CÁMARA ===
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 }, audio: false
    });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      console.log('✅ Cámara activa');
      requestAnimationFrame(loop); // arranca el loop de detección
    };
  } catch (err) {
    alert('❌ No se pudo acceder a la cámara: ' + err.message);
  }
}

// === LOOP PRINCIPAL (cada frame) ===
async function loop() {
  if (video.readyState === 4) {
    // Enviamos el frame a los 3 detectores
    await poseDetector.detect(video);
    await handDetector.detect(video);
    await faceDetector.detect(video);

    // DIAGNÓSTICO: Verificar cada ~1 seg si llegan datos
    debugFrame++;
    if (debugFrame % 60 === 0) {
      console.log('[Main Loop] Estado de detectores:', {
        pose: !!poseResults,
        hands: !!handResults,
        face: !!faceResults
      });
    }

    // Actualizamos el mapper con los datos del frame actual
    mapper.update(poseResults, handResults, faceResults);

    // Dibujamos todo
    draw();
  }
  requestAnimationFrame(loop);
}

// === DIBUJO SOBRE EL CANVAS ===
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- POSE: esqueleto corporal ---
  if (poseResults?.poseLandmarks) {
    // Conexiones del esqueleto
    const connections = window.POSE_CONNECTIONS;
    if (connections) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      for (const [a, b] of connections) {
        const pa = poseResults.poseLandmarks[a];
        const pb = poseResults.poseLandmarks[b];
        if (pa && pb) {
          ctx.beginPath();
          ctx.moveTo(pa.x * canvas.width, pa.y * canvas.height);
          ctx.lineTo(pb.x * canvas.width, pb.y * canvas.height);
          ctx.stroke();
        }
      }
    }
    // Puntos del cuerpo
    for (const lm of poseResults.poseLandmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ff0066';
      ctx.fill();
    }
  }

  // --- MANOS ---
  if (handResults?.multiHandLandmarks) {
    for (const hand of handResults.multiHandLandmarks) {
      for (const lm of hand) {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#00cfff';
        ctx.fill();
      }
    }
  }

  // --- ROSTRO ---
  if (faceResults?.multiFaceLandmarks) {
    for (const face of faceResults.multiFaceLandmarks) {
      for (const lm of face) {
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 1, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffcc00';
        ctx.fill();
      }
    }
  }
}

// === BOTONES ===
btnGallery.addEventListener('click', () => drawer.classList.toggle('open'));

btnPlay.addEventListener('click', async () => {
  isPlaying = !isPlaying;

  if (isPlaying) {
    await audioEngine.init();
    
    // 1. CREAR UN SINTETIZADOR CONTINUO (Drone)
    // Usamos FMSynth para un sonido "espacial" tipo sci-fi
    if (!synth) {
      synth = new Tone.FMSynth({
        harmonicity: 3,
        modulationIndex: 10,
        oscillator: { type: "sine" },
        envelope: { attack: 0.5, decay: 0.1, sustain: 1, release: 1 },
        modulation: { type: "square" },
        modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
      }).toDestination();
    }

    // 2. INTERCEPTAR EL MAPPER PARA CONTROLAR EL SINTE
    // Esto permite que el mapper controle nuestro sinte nuevo sin cambiar todo el código
    const originalSetEffect = audioEngine.setEffect.bind(audioEngine);
    audioEngine.setEffect = (param, value) => {
      if (param === 'synthVolume') {
        // Mapear 0-1 a decibeles (-60db a 0db)
        synth.volume.rampTo(Tone.gainToDb(Math.max(0.001, value)), 0.1);
      } else if (param === 'synthPitch') {
        // Mapear altura de mano (0-1) a frecuencia (100Hz - 600Hz)
        const freq = 100 + (value * 500);
        synth.frequency.rampTo(freq, 0.1);
      } else if (param === 'synthTimbre') {
        // Mapear altura mano izq a "rugosidad" del sonido
        synth.modulationIndex.rampTo(value * 20, 0.1);
      } else if (param === 'samplePitch') {
        // Controlar velocidad de reproducción del sample (0.5x a 2.0x)
        // Nota: Esto asume que tu AudioEngine soporta 'playbackRate' o lo pasamos directo
        originalSetEffect('playbackRate', 0.5 + (value * 1.5)); 
      } else {
        // Si no es para el sinte, usar el efecto normal (reverb, etc)
        originalSetEffect(param, value);
      }
    };

    // 3. DISPARAR EL SONIDO CONSTANTE (Sin mapeos iniciales)
    synth.triggerAttack("C3"); // Nota continua
    btnPlay.textContent = '⏹ STOP';

  } else {
    // Detener todo
    if (synth) synth.triggerRelease();
    if (audioEngine.stopAll) audioEngine.stopAll();
    btnPlay.textContent = '▶ PLAY';
  }
});
// === INIT ===
startCamera();