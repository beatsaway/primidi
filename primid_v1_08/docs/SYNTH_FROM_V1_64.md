# Adding v1_64 Synth Sounds to v1_08

v1_64 has **sample-based** sounds (piano, guitar) and **synth-based** sounds (Warm Pad, Pluck, Organ, Bell, etc.). In v1_08 we already have the sample path (Piano Calm, Guitar Calm). This doc describes how to add the synth-based sounds so they can be chosen from the same Instrument dropdown and played with the same MIDI/keyboard.

---

## How v1_64 Synth Works

1. **Instrument registry**  
   Each synth is a **preset**: a function on `window.PremiumSoundInstrumentProfiles` that returns a **preset object**, e.g.:

   - **warmPad:** triangle + sine oscillators, ADSR, lowpass filter  
   - **pluck:** sawtooth, short decay, noise, lowpass  
   - **organ:** two square oscillators (detuned), long sustain, lowpass  
   - **bell:** sine + triangle, fast decay, low sustain, lowpass  
   - **bass, brightLead, softPiano, epiano, string** – same idea, different oscillators/filter/envelope  

2. **Preset object shape (synth)**  
   ```js
   {
     oscillators: [ { type: "sine"|"triangle"|"square"|"sawtooth", detune: 0 }, ... ],
     attack: 0.02,   // seconds
     decay: 0.12,
     sustain: 0.75,  // level 0–1
     release: 0.25,
     filter: { type: "lowpass", base: 1200, velocity: 2400 },  // cutoff = base + velocity * vel
     noise: 0.05     // optional, 0–1 for attack noise
   }
   ```

3. **Playback in v1_64**  
   In `premiumsound.js`, **synth notes** are played by:

   - Creating a **gain node** with an envelope (attack → decay → sustain; on noteOff, release to 0).
   - Creating one **OscillatorNode** per `preset.oscillators` (type, detune, frequency from MIDI note).
   - Optionally a **BiquadFilter** (lowpass with cutoff from preset.filter + velocity).
   - Optionally a short **noise** burst (buffer source) for “pluck” character.
   - Connecting: oscillators (+ noise) → filter (if any) → gain → dry/delay/reverb.

   v1_64’s `play()` is **scheduled**: it takes a list of `{ type: "noteOn"|"noteOff", note, velocity, timeSeconds }` and schedules everything in one go. So it’s **not** real-time MIDI; we need to adapt this to **real-time** noteOn/noteOff.

---

## How I Would Do It in v1_08

### 1. Reuse the preset format and voice logic (no samples)

- **Keep** the v1_64 **instrument scripts** so they still register on `PremiumSoundInstrumentProfiles` (warmPad, pluck, organ, bell, bass, brightLead, softPiano, epiano, string).
- **Do not** load the full `premiumsound.js` (sequencer, offline render, etc.). We only need the **synth voice recipe**: oscillators + envelope + filter + optional noise.
- **Port** that voice-building logic into a small **“SynthCalm”** (or “PremiumSynth”) module in v1_08 that:
  - Has **noteOn(ctx, midiNote, velocity)** and **noteOff(ctx, midiNote)** (and optionally **setSustainPedal**, **releaseAll**).
  - Uses **one preset at a time** (e.g. current dropdown value: `warmPad`, `pluck`, …).
  - On **noteOn**: resolve preset (same as v1_64: `PremiumSoundInstrumentProfiles[name]({ note, velocity, velocityNormalized, durationSeconds: 0 })`), then create one **voice**: oscillators + gain envelope + filter + optional noise, connect to a **masterGain**, start oscillators, store the voice in a map by `midiNote` (and handle multiple voices per note if we want polyphony per key).
  - On **noteOff**: find voice(s) for that note, apply **release** (gain ramp to 0), and **stop** oscillators (and noise) after `release` time so the tail plays.

So the **code that plays a note** is different from samples (oscillators + envelope instead of BufferSource + loop), but the **preset format** (oscillators, attack, decay, sustain, release, filter, noise) stays the same as v1_64.

### 2. One “SynthCalm” engine, many presets

- **Single synth engine** in v1_08 that holds:
  - `currentPreset` (string): e.g. `"warmPad"`, `"pluck"`, `"organ"`.
  - A **masterGain** whose output goes into the same **mixer** as Piano Calm and Guitar Calm.
- When the user picks “Warm Pad” or “Pluck” from the dropdown, we set `currentPreset` and route **noteOn/noteOff** to this synth engine instead of the sample engines.
- No need to change how the dropdown or MIDI works; we only add another “instrument type” (synth) and another branch in **handleNoteOn** / **handleNoteOff** that calls the synth engine when a synth preset is selected.

### 3. Where the code lives

- **New file:** e.g. `primid_v1_08/audio/synth-calm-engine.js`  
  - Implements the **real-time** synth: noteOn/noteOff, sustain pedal, releaseAll, getMasterGain().  
  - Inside noteOn: resolve preset from `PremiumSoundInstrumentProfiles[currentPreset]`, then create voice (oscillators, gain envelope, filter, optional noise) exactly like v1_64’s `premiumsound.js` does for one note, but driven by **immediate** noteOn/noteOff instead of a precomputed event list.
- **Reuse v1_64 instrument scripts** in v1_08’s index:  
  - Add `<script src="path/to/v1_64/instrument-warm-pad.js">` (and pluck, organ, bell, bass, brightLead, softPiano, epiano, string) **before** the synth-calm-engine, so the registry is populated.  
  - We do **not** need `premiumsound.js` or `instruhandle.js` for the synth path (we only need the preset objects and our own engine).

### 4. Instrument dropdown and routing

- **Extend the Instrument dropdown** so it has three groups (or a flat list):  
  - **Piano Calm**, **Guitar Calm** (sample-based),  
  - **Warm Pad**, **Pluck**, **Organ**, **Bell**, **Bass**, **Bright Lead**, **Soft Piano**, **E. Piano**, **Strings** (synth-based).
- **handleNoteOn / handleNoteOff** logic:
  - If selected instrument is Piano Calm or Guitar Calm → call **PianoCalmEngine** or **GuitarCalmEngine** (as now).
  - If selected instrument is any synth preset → call **SynthCalmEngine** with `setPreset(name)` and then noteOn/noteOff (or the engine reads the dropdown itself).
- **Mixer:**  
  - Same as now: one “instrument” at a time. Either a sample engine (piano/guitar) or the synth engine is active; its **masterGain** is connected to the existing **mixer** that feeds **piano-calm-effects** (reverb, mid, etc.). So we add a **mixSynth** gain and connect SynthCalm’s masterGain to it; when a synth is selected we set mixPiano and mixGuitar to 0 and mixSynth to 1 (and the other way around when a sample instrument is selected).

### 5. Optional: keyboard pan and sustain for synth

- **Keyboard pan:** Apply the same per-note pan (or a simple stereo spread) to the synth output so it feels consistent with Piano/Guitar Calm.
- **Sustain pedal:** Synth engine can implement **setSustainPedal(down)** so noteOff only schedules release when pedal is up; same as sample engines.

---

## Summary

| Aspect | Sample (Piano/Guitar Calm) | Synth (Warm Pad, Pluck, etc.) |
|--------|----------------------------|--------------------------------|
| **Preset** | Zones + WAV paths + loop points | oscillators + ADSR + filter (+ noise) |
| **Note play** | BufferSource + playbackRate + loop | OscillatorNode(s) + GainNode envelope + BiquadFilter |
| **Where** | piano-calm-engine.js, guitar-calm-engine.js | New synth-calm-engine.js |
| **Preset source** | Hardcoded zones in engine | v1_64 instrument-*.js → PremiumSoundInstrumentProfiles |
| **Routing** | Same mixer → same effects | Same mixer → same effects |

So: **we learn the synth “sounds” from v1_64 by reusing their preset format and instrument scripts**, and **we add a new, real-time synth engine in v1_08** that turns those presets into live notes (oscillators + envelope + filter) and plugs into the existing Instrument dropdown and effects chain. No change to how samples work; only a second *kind* of instrument (synth) with different note-playing code.
