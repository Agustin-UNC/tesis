export class FaceDetector {
  constructor() {
    this.faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
  }
  onResults(callback) { this.faceMesh.onResults(callback); }
  async detect(video) { await this.faceMesh.send({ image: video }); }
}