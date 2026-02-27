# Guitar Calm WAVs

Place the zone WAV files **directly in this folder** (no subfolder):

- `zone_0_midi25_keys_0-47.wav`
- `zone_1_midi25_keys_48-54.wav`
- `zone_2_midi25_keys_55-63.wav`
- `zone_3_midi25_keys_64-73.wav`
- `zone_4_midi25_keys_74-127.wav`

In the app, choose **Guitar Calm** from the **Instrument** dropdown in Sound settings to play these samples.

---

## Loop points

Each zone has a **loop region** (in **seconds** from the start of the WAV). The engine loops that region for the sustain part of the note. Loop points are defined in `primid_v1_08/audio/guitar-calm-engine.js`:

| File | loopStart (s) | loopEnd (s) |
|------|----------------|-------------|
| zone_0_midi25_keys_0-47.wav   | 1.611 | 1.638 |
| zone_1_midi25_keys_48-54.wav  | 2.059 | 2.134 |
| zone_2_midi25_keys_55-63.wav  | 1.536 | 1.629 |
| zone_3_midi25_keys_64-73.wav  | 1.159 | 1.206 |
| zone_4_midi25_keys_74-127.wav | 0.800 | 0.832 |

**If you re-record or edit WAVs:**

1. In your editor, find the **sustain** part (after attack/decay, where the tone is even).
2. Choose a short **loop** (e.g. 50–200 ms). Put **loop start** and **loop end** at **zero crossings** (waveform crossing zero) to avoid clicks.
3. Read the **start time** and **end time** in **seconds** from the start of the file.
4. Update that zone’s `loopStart` and `loopEnd` in `audio/guitar-calm-engine.js`.

Full guide: see project **WAV_LOOP_POINTS_AND_RERECORDING.txt**.
