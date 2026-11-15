Source: https://patch.gg/blendi/oil-paint — Patch, MIT (LICENSE included).
Original checkout commit: 804c65fa3a6c6fcdc732ed1bde450fd140cfb4e9.
brush.js and dabs.js unchanged. pins.js adds vertex-index style callback and sampled per-dab skin color. common.js disables forest and figure shadow sampling for the isolated portrait (no shadow render passes). Original pinned stroke geometry, palette shading, brush atlas and impasto rendering retained.
Test-only imports from scripts/oil-human-test.js; no production hall integration.
Head scan and color texture: https://github.com/mrdoob/three.js/tree/r186/examples/models/gltf/LeePerrySmith — Lee Perry-Smith CC BY 3.0, license in public/portraits/test-model/LICENSE.txt. Geometry scaled/centered for the test; original files preserved.

Test adaptation: static mesh pins sample barycentric triangle positions/UVs to avoid duplicate vertex clumps. This sampler is for rigid head movement only, not skinned animation. A solid base mesh fills gaps under the original impasto strokes.
