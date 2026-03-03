export class Mapper {
  constructor(audioEngine) {
    this.engine   = audioEngine;
    this.mappings = [];
    // Datos crudos del frame actual
    this.landmarks = {
      pose: null,
      hands: null,
      face: null
    };
  }

  // Recibe los resultados de los detectores
  update(poseResults, handResults, faceResults) {
    this.landmarks.pose  = poseResults?.poseLandmarks ?? null;
    this.landmarks.hands = handResults?.multiHandLandmarks ?? null;
    this.landmarks.face  = faceResults?.multiFaceLandmarks?.[0] ?? null;
    this._processAll();
  }

  // Agrega un mapeo: ej. addMapping('rightHand','openness','volume')
  addMapping(bodyPart, gesture, effect) {
    this.mappings.push({ bodyPart, gesture, effect });
    console.log(`🔗 Mapeado: ${bodyPart} → ${gesture} → ${effect}`);
  }

  // Elimina un mapeo específico
  removeMapping(bodyPart, gesture, effect) {
    this.mappings = this.mappings.filter(m => 
      !(m.bodyPart === bodyPart && m.gesture === gesture && m.effect === effect)
    );
  }

  clearMappings() { this.mappings = []; }

  _processAll() {
    for (const { bodyPart, gesture, effect } of this.mappings) {
      const value = this._extract(bodyPart, gesture);
      
      // DIAGNÓSTICO: Loguear aleatoriamente (5% de las veces) para ver valores
      if (Math.random() < 0.05) {
        console.log(`[Mapper] ${bodyPart} -> ${gesture}: Valor calculado = ${value?.toFixed(2)}`);
      }

      if (value !== null) {
        this.engine.setEffect(effect, value);
      }
    }
  }

  _extract(bodyPart, gesture) {
    switch (bodyPart) {

      case 'rightHand':
        if (gesture === 'openness') return this._handOpenness(0);
        if (gesture === 'y') return this._handY(0); // Altura
        if (gesture === 'x') return this._handX(0); // Posición horizontal
        break;

      case 'leftHand':
        if (gesture === 'openness') return this._handOpenness(1);
        if (gesture === 'y') return this._handY(1);
        if (gesture === 'x') return this._handX(1);
        break;

      case 'face':
        if (gesture === 'mouthOpen') return this._mouthOpenness();
        if (gesture === 'headTilt')  return this._headTilt();
        break;

      case 'body':
        if (gesture === 'armsUp') return this._armsUp();
        break;
    }
    return null;
  }

  // --- GESTOS ---

  // Apertura de mano: distancia pulgar↔meñique normalizada
  _handOpenness(handIndex) {
    const hand = this.landmarks.hands?.[handIndex];
    if (!hand) return null;
    const thumb = hand[4];
    const pinky = hand[20];
    const wrist = hand[0];
    const middleMCP = hand[9]; // Base del dedo medio (referencia de tamaño de mano)

    const handSize = this._dist(wrist, middleMCP);
    if (handSize === 0) return 0;

    // Normalizamos la apertura según el tamaño de la mano
    // Ratio: ~0.5 (cerrado) a ~1.5 (abierto)
    return Math.max(0, Math.min((this._dist(thumb, pinky) / handSize - 0.5), 1.0));
  }

  // Altura de la mano (invertida: 0 abajo, 1 arriba)
  _handY(handIndex) {
    const hand = this.landmarks.hands?.[handIndex];
    if (!hand) return null;
    const wrist = hand[0];
    // MediaPipe Y va de 0 (arriba) a 1 (abajo). Lo invertimos.
    return 1.0 - Math.max(0, Math.min(wrist.y, 1));
  }

  // Posición horizontal de la mano (0 izquierda, 1 derecha)
  _handX(handIndex) {
    const hand = this.landmarks.hands?.[handIndex];
    if (!hand) return null;
    const wrist = hand[0];
    return Math.max(0, Math.min(wrist.x, 1));
  }

  // Apertura de boca: distancia labios / distancia ojos
  _mouthOpenness() {
    const face = this.landmarks.face;
    if (!face) return null;
    const top    = face[13];  // labio superior
    const bottom = face[14];  // labio inferior
    const leftEye = face[33];
    const rightEye = face[263];

    const faceScale = this._dist(leftEye, rightEye); // Referencia de escala
    if (faceScale === 0) return 0;

    // Multiplicamos por 3 para ajustar la sensibilidad
    return Math.min((this._dist(top, bottom) / faceScale) * 3, 1.0);
  }

  // Inclinación de cabeza: diferencia Y entre orejas / ancho cabeza
  _headTilt() {
    const face = this.landmarks.face;
    if (!face) return null;
    const leftEar  = face[234];
    const rightEar = face[454];
    
    const tilt = Math.abs(leftEar.y - rightEar.y);
    const width = this._dist(leftEar, rightEar);
    
    if (width === 0) return 0;
    return Math.min((tilt / width) * 1.5, 1.0);
  }

  // Brazos levantados: normalizado por ancho de hombros
  _armsUp() {
    const pose = this.landmarks.pose;
    if (!pose) return null;
    const leftWrist   = pose[15];
    const rightWrist  = pose[16];
    const leftShoulder  = pose[11];
    const rightShoulder = pose[12];
    
    const avgWristY    = (leftWrist.y + rightWrist.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    
    const shoulderWidth = this._dist(leftShoulder, rightShoulder);
    if (shoulderWidth === 0) return 0;

    // Cuando muñecas están más arriba que hombros → valor alto
    return Math.max(0, Math.min((avgShoulderY - avgWristY) / (shoulderWidth * 1.5), 1.0));
  }

  _dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
}