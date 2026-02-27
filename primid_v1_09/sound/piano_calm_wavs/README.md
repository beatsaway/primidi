# Piano Calm WAVs

Place the zone WAV files in this folder (paths are relative to `sound/`, so `piano_calm_wavs/zone_0_...wav`):

- `zone_0_midi0_keys_0-34.wav`
- `zone_1_midi0_keys_35-41.wav`
- `zone_2_midi0_keys_42-47.wav`
- `zone_3_midi0_keys_48-52.wav`
- `zone_4_midi0_keys_53-57.wav`
- `zone_5_midi0_keys_58-62.wav`
- `zone_6_midi0_keys_63-68.wav`
- `zone_7_midi0_keys_69-75.wav`
- `zone_8_midi0_keys_76-83.wav`
- `zone_9_midi0_keys_84-92.wav`
- `zone_10_midi0_keys_93-127.wav`

In the app, choose **Piano Calm** from the **Instrument** dropdown in Sound settings to play these samples.

---

## Loop points

Each zone has a **loop region** (in **seconds** from the start of the WAV). The engine loops that region for the sustain part of the note. Loop points are defined in `primid_v1_08/audio/piano-calm-engine.js`:

| File | loopStart (s) | loopEnd (s) |
|------|----------------|-------------|
| zone_0_midi0_keys_0-34.wav    | 2.415 | 2.558 |
| zone_1_midi0_keys_35-41.wav   | 1.679 | 1.734 |
| zone_2_midi0_keys_42-47.wav   | 1.514 | 1.696 |
| zone_3_midi0_keys_48-52.wav   | 1.326 | 1.462 |
| zone_4_midi0_keys_53-57.wav   | 1.249 | 1.295 |
| zone_5_midi0_keys_58-62.wav   | 0.906 | 0.956 |
| zone_6_midi0_keys_63-68.wav   | 0.595 | 0.633 |
| zone_7_midi0_keys_69-75.wav   | 0.423 | 0.519 |
| zone_8_midi0_keys_76-83.wav   | 0.680 | 0.723 |
| zone_9_midi0_keys_84-92.wav   | 0.415 | 0.427 |
| zone_10_midi0_keys_93-127.wav | 0.344 | 0.367 |

**If you re-record or edit WAVs:**

1. In your editor, find the **sustain** part (after attack/decay, where the tone is even).
2. Choose a short **loop** (e.g. 50–200 ms). Put **loop start** and **loop end** at **zero crossings** (waveform crossing zero) to avoid clicks.
3. Read the **start time** and **end time** in **seconds** from the start of the file.
4. Update that zone’s `loopStart` and `loopEnd` in `audio/piano-calm-engine.js`.

Full guide: see project **WAV_LOOP_POINTS_AND_RERECORDING.txt**.
