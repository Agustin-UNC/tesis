export class PoseDetector {
  constructor() {
    this.pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
  }
  onResults(callback) { this.pose.onResults(callback); }
  async detect(video) { await this.pose.send({ image: video }); }
}