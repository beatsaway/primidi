# Synth presets (from v1_64)

These files register **synth preset** objects on `window.PremiumSoundInstrumentProfiles`. They are copied from v1_64 and used by the synth engine when you add real-time synth playback to v1_08.

**Registry keys:** `bass`, `bell`, `brightLead`, `epiano`, `organ`, `pluck`, `softPiano`, `string`, `warmPad`.

Load these scripts **before** any engine that reads from `PremiumSoundInstrumentProfiles` (e.g. a future `synth-calm-engine.js`). See `docs/SYNTH_FROM_V1_64.md` for integration.
