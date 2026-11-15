// Dev-only classic worker: synchronous WASM inference never blocks preview/UI.
const VERSION = '0.10.21';
let detector;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === 'init') {
      self.exports = {};
      // jsDelivr serves .cjs with a non-script MIME type. Rewrap the fetched
      // pinned bundle as JavaScript for classic Worker importScripts.
      const response = await fetch(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.cjs`);
      if (!response.ok) throw new Error(`MediaPipe download: HTTP ${response.status}`);
      const bundleURL = URL.createObjectURL(new Blob([await response.text()], { type: 'application/javascript' }));
      try { importScripts(bundleURL); } finally { URL.revokeObjectURL(bundleURL); }
      const { FilesetResolver, PoseLandmarker } = self.exports;
      detector = await PoseLandmarker.createFromOptions(
        await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`),
        { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task', delegate: 'CPU' },
          runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .6,
          minPosePresenceConfidence: .6, minTrackingConfidence: .6, outputSegmentationMasks: false });
      self.postMessage({ ready: true });
    } else {
      try {
        const result = detector.detectForVideo(data.bitmap, data.timestamp);
        self.postMessage({ world: result.worldLandmarks[0] ?? [], image: result.landmarks[0] ?? [] });
      } finally { data.bitmap.close(); }
    }
  } catch (error) { self.postMessage({ error: String(error) }); }
};
