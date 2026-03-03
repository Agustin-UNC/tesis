export class HandDetector {
  constructor() {
    this.hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    this.hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6
    });
  }
  onResults(callback) { this.hands.onResults(callback); }
  async detect(video) { await this.hands.send({ image: video }); }
}