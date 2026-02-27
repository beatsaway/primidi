# Note Attack/Release and Sustain Pedal Implementation Guide

## How primid_v1_06 Handles Keyboard Input

### Key Press/Release Flow

1. **Key Press (keydown)**: 
   - `keypress-input.js` detects key press (asdfghjkl, etc.)
   - Calls `handleNoteOn(midiNote, velocity)` 
   - Prevents key repeat by tracking `pressedKeys` Set

2. **Key Release (keyup)**:
   - `keypress-input.js` detects key release
   - Calls `handleNoteOff(midiNote)`
   - Removes key from `pressedKeys` Set

### Note State Management

primid_v1_06 uses three Sets to track note states:

- **`physicallyHeldNotes`**: Notes where the key is currently pressed
- **`sustainedNotes`**: Notes that are held by the sustain pedal (key released but pedal down)
- **`activeNotes`**: All notes currently playing (either held or sustained)

### Note Release Logic

When a key is released (`handleNoteOff`):

1. **Check sustain pedal state**:
   ```javascript
   if (!sustainPedalActive) {
       // Release immediately
       synth.triggerRelease(noteName);
       activeNotes.delete(midiNote);
   } else {
       // Mark as sustained (not physically held)
       sustainedNotes.add(midiNote);
       // Keep note playing, but start decay
       startSustainDecay(midiNote, noteName);
   }
   ```

2. **Visual feedback**: Always release the visual key, regardless of sustain state

3. **When sustain pedal is released**: All notes in `sustainedNotes` are released

## Sample-Based Sound Implementation

### Current Problem

Your current `playNoteFromPiano` function:
- Creates a 1-second looped buffer
- Starts it and lets it play to completion
- No way to stop it early when key is released
- No per-note tracking

### Solution: Track Sources Per Note

You need to:

1. **Track active sources per MIDI note**:
   ```javascript
   const activeNoteSources = new Map(); // midiNote -> { source, gainNode, buffer }
   ```

2. **Use GainNode for volume control and release**:
   ```javascript
   // Create gain node for this note
   const gainNode = ctx.createGain();
   gainNode.gain.value = 1.0;
   
   // Connect: source -> gainNode -> destination
   source.connect(gainNode);
   gainNode.connect(ctx.destination);
   ```

3. **Loop the buffer indefinitely**:
   ```javascript
   source.loop = true;
   source.loopStart = 0;
   source.loopEnd = buffer.duration;
   ```

4. **Release on key up with fade-out**:
   ```javascript
   function releaseNote(midiNote) {
       const noteData = activeNoteSources.get(midiNote);
       if (!noteData) return;
       
       const { source, gainNode } = noteData;
       
       // Fade out over release time (e.g., 0.3 seconds)
       const releaseTime = 0.3;
       const now = ctx.currentTime;
       gainNode.gain.setValueAtTime(gainNode.gain.value, now);
       gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);
       
       // Stop source after fade
       source.stop(now + releaseTime);
       
       // Clean up
       activeNoteSources.delete(midiNote);
   }
   ```

### Implementation Pattern

```javascript
// Track active notes
const activeNoteSources = new Map(); // midiNote -> { source, gainNode, buffer }
const sustainedNotes = new Set(); // Notes held by sustain pedal
let sustainPedalActive = false;

async function playNoteFromPiano(midiNote, velocity = 100) {
    // Stop existing note if retriggering
    if (activeNoteSources.has(midiNote)) {
        releaseNoteImmediate(midiNote);
    }
    
    // ... get region and create buffer (same as before) ...
    
    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // Enable looping
    
    // Create gain node for volume control
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0;
    
    // Connect: source -> gainNode -> destination
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Adjust pitch
    if (originalFrequency && originalFrequency > 50 && originalFrequency < 2000) {
        const playbackRate = targetFrequency / originalFrequency;
        source.playbackRate.value = playbackRate;
    }
    
    // Start playing
    source.start(0);
    
    // Track this note
    activeNoteSources.set(midiNote, { source, gainNode, buffer });
    
    // Visual feedback
    pressPianoKey(midiNote);
}

function releaseNote(midiNote) {
    // If sustain pedal is active, mark as sustained instead of releasing
    if (sustainPedalActive) {
        sustainedNotes.add(midiNote);
        // Visual key still releases
        releasePianoKey(midiNote);
        return;
    }
    
    // Release immediately
    releaseNoteImmediate(midiNote);
}

function releaseNoteImmediate(midiNote) {
    const noteData = activeNoteSources.get(midiNote);
    if (!noteData) return;
    
    const { source, gainNode } = noteData;
    const ctx = getAudioContext();
    
    // Fade out over release time
    const releaseTime = 0.3; // 300ms release
    const now = ctx.currentTime;
    
    // Cancel any scheduled changes
    gainNode.gain.cancelScheduledValues(now);
    
    // Fade to zero
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);
    
    // Stop source after fade completes
    try {
        source.stop(now + releaseTime + 0.1); // Small buffer
    } catch (e) {
        // Already stopped
    }
    
    // Clean up
    activeNoteSources.delete(midiNote);
    sustainedNotes.delete(midiNote);
    releasePianoKey(midiNote);
}

// Handle sustain pedal
function handleControlChange(controller, value) {
    if (controller === 64) { // Sustain pedal
        const wasActive = sustainPedalActive;
        sustainPedalActive = value >= 64;
        
        // If pedal released, release all sustained notes
        if (wasActive && !sustainPedalActive) {
            const notesToRelease = Array.from(sustainedNotes);
            notesToRelease.forEach(midiNote => {
                releaseNoteImmediate(midiNote);
            });
        }
    }
}
```

## How Sustain Pedal Affects Sound

### Without Pedal (Normal Release)
- Key press → Note starts playing (looped)
- Key release → Note fades out over release time (0.3s) and stops

### With Pedal Down
- Key press → Note starts playing
- Key release → Note **continues playing** (marked as sustained)
- Visual key releases, but audio keeps playing
- When pedal released → All sustained notes fade out and stop

### Pedal Behavior
1. **Pedal pressed while key held**: Normal behavior
2. **Key released while pedal down**: Note sustains (keeps playing)
3. **Pedal released**: All sustained notes are released with fade-out

### Optional: Sustain Decay

You can add gradual volume decay for sustained notes (like primid_v1_06):

```javascript
function startSustainDecay(midiNote) {
    const noteData = activeNoteSources.get(midiNote);
    if (!noteData) return;
    
    const { gainNode } = noteData;
    const ctx = getAudioContext();
    
    // Decay over 5 seconds
    const decayTime = 5.0;
    const now = ctx.currentTime;
    
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(1.0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + decayTime); // Fade to 10% volume
}
```

## Key Differences: Additive Synth vs Sample-Based

| Feature | Additive Synth (primid_v1_06) | Sample-Based (your app) |
|---------|------------------------------|-------------------------|
| **Sustain** | Infinite (until released) | Need to loop buffer |
| **Release** | Envelope-based fade | Manual gain fade |
| **Per-note control** | Built-in (Tone.js) | Need to track manually |
| **Voice stealing** | Automatic | Manual management |
| **Polyphony** | Limited by voices | Limited by CPU/memory |

## Implementation Checklist

- [ ] Create `activeNoteSources` Map to track sources per note
- [ ] Add GainNode per note for volume control
- [ ] Enable looping on BufferSource (`source.loop = true`)
- [ ] Implement `releaseNote()` with fade-out
- [ ] Track `sustainedNotes` Set
- [ ] Add `sustainPedalActive` flag
- [ ] Implement `handleControlChange()` for pedal (CC 64)
- [ ] Update `playNoteFromPiano()` to use new tracking
- [ ] Update note release handlers to call `releaseNote()`
- [ ] Handle pedal release to release all sustained notes

## Notes

- **Looping**: Sample buffers must loop to sustain indefinitely
- **Gain fade**: Use GainNode for smooth release, not abrupt stop
- **Cleanup**: Always clean up sources and gain nodes to prevent memory leaks
- **Retriggering**: Stop existing note before starting new one (same MIDI note)
- **Visual feedback**: Always update visual keys, even when audio is sustained
