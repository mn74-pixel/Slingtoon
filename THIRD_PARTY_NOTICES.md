# Third-party notices

## MediaPipe Tasks Vision

- Package: `@mediapipe/tasks-vision` 1.0.1
- Publisher: Google / MediaPipe Authors
- License declared by the package: Apache License 2.0
- Project: <https://github.com/google-ai-edge/mediapipe>
- Web documentation: <https://ai.google.dev/edge/mediapipe/solutions/vision>
- License copy: `vendor/mediapipe/LICENSE.txt`

Only the browser bundle and its WebAssembly runtime are vendored. SlingToon
loads them from the same GitHub Pages origin; the selected photo is not sent to
Google, OpenAI, or another server. The app's Content Security Policy sets
`connect-src 'self'`, blocking outbound runtime connections as an additional
privacy boundary.

## MediaPipe model assets

The two model assets below are the versions linked by the official MediaPipe
documentation and sample project. They are stored locally so inference can run
in the browser.

### Face Landmarker

- Source: <https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task>
- SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`

### Selfie Multiclass Image Segmenter

- Source: <https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite>
- Categories: background, hair, body skin, face skin, clothes, accessories
- SHA-256: `c6748b1253a99067ef71f7e26ca71096cd449baefa8f101900ea23016507e0e0`

The original model files are unmodified. Review the current MediaPipe model
terms before commercial distribution outside this prototype repository.
