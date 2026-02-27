/**
 * Sustain Decay Module
 * Implements gradual volume decay for sustained notes when sustain pedal is active.
 * Real pianos have slow decay even with sustain pedal - notes don't sustain forever.
 * Notes fade out gradually even while sustain pedal is held, just more slowly than without pedal.
 * 
 * Uses Web Audio API per-note volume control for realistic fade-out.
 */

/**
 * Calculate sustain decay time constant based on MIDI note number
 * Lower notes decay slower (longer sustain), higher notes decay faster (shorter sustain)
 * 
 * @param {number} midiNote - MIDI note number (21 = A0, 108 = C8)
 * @returns {number} - Sustain decay time constant in seconds
 */
function calculateSustainDecayTime(midiNote) {
    const A0_MIDI = 21; // A0 MIDI note number
    // Use settings if available, otherwise use defaults
    const T0 = (window.sustainDecaySettings && window.sustainDecaySettings.baseTime) ? window.sustainDecaySettings.baseTime : 8.0;
    const k = (window.sustainDecaySettings && window.sustainDecaySettings.decayFactor) ? window.sustainDecaySettings.decayFactor : 2.5;
    
    const semitoneOffset = midiNote - A0_MIDI;
    const sustainDecayTime = T0 * Math.pow(2, -semitoneOffset / 12 * k);
    
    // Clamp to reasonable range: 3s to 25s
    // With pedal, notes should sustain longer but still fade out gradually
    return Math.max(3.0, Math.min(25.0, sustainDecayTime));
}

/**
 * Start gradual volume decay for a sustained note
 * Gradually reduces the synth's envelope sustain level to fade out the note
 * 
 * @param {number} midiNote - MIDI note number
 * @param {string} noteName - Note name (e.g., "C4")
 * @param {Object} dependencies - Required dependencies from main.js
 */
function startSustainDecay(midiNote, noteName, dependencies) {
    if (typeof window === 'undefined') {
        return;
    }
    
    if (window.physicsSettings && !window.physicsSettings.sustainDecay) {
        // Feature disabled - notes will sustain at full volume
        return;
    }
    
    const { sustainedNotes, physicallyHeldNotes, activeNotes, sustainDecayAutomations, noteVolumeNodes, synth } = dependencies;
    
    // Cancel any existing decay automation for this note
    if (sustainDecayAutomations.has(midiNote)) {
        const existing = sustainDecayAutomations.get(midiNote);
        if (existing && existing.cancel) {
            existing.cancel();
        }
    }
    
    // Calculate decay time based on note frequency (lower notes decay slower)
    const baseSustainDecayTime = calculateSustainDecayTime(midiNote);
    // With pedal, sustain is extended but still decays
    // Use settings if available, otherwise use default 2.5x multiplier
    const pedalMultiplier = (window.sustainDecaySettings && window.sustainDecaySettings.pedalMultiplier) ? window.sustainDecaySettings.pedalMultiplier : 2.5;
    const sustainDecayTime = baseSustainDecayTime * pedalMultiplier; // Extended sustain with pedal, still pitch-dependent
    
    // Get audio context time
    const audioCtx = synth.synth ? synth.synth.audioCtx : (window.Tone && window.Tone.context ? window.Tone.context : null);
    if (!audioCtx) {
        console.warn('AudioContext not available for sustain decay');
        return;
    }
    
    const startTime = audioCtx.currentTime;
    const endTime = startTime + sustainDecayTime;
    
    // Use Web Audio API per-note volume control (if available)
    // This is the key benefit of Web Audio API - per-voice control!
    if (synth.rampNoteVolume) {
        // Use the new Web Audio API synth's per-note volume control
        // Fade from 1.0 (full volume) to 0.001 (silent) over sustainDecayTime
        synth.rampNoteVolume(noteName, 0.001, sustainDecayTime);
        
        // Schedule note release when volume is effectively silent
        const releaseTime = endTime - 0.2; // Release 200ms before end
        
        const releaseTimeout = setTimeout(() => {
            // Only release if still sustained and not physically held
            if (sustainedNotes.has(midiNote) && !physicallyHeldNotes.has(midiNote)) {
                try {
                    synth.triggerRelease(noteName);
                } catch (e) {
                    // Ignore errors
                }
                activeNotes.delete(midiNote);
                sustainedNotes.delete(midiNote);
                sustainDecayAutomations.delete(midiNote);
            }
        }, (releaseTime - startTime) * 1000);
        
        // Store automation info
        const automation = {
            startTime: startTime,
            decayTime: sustainDecayTime,
            endTime: endTime,
            releaseTimeout: releaseTimeout,
            noteName: noteName, // Store noteName for cancel
            synth: synth, // Store synth reference for cancel
            cancel: () => {
                clearTimeout(releaseTimeout);
                // Cancel the volume ramp but preserve current volume (don't reset to 1.0)
                // The note will be released immediately after cancel, so the release envelope will handle fade-out
                if (synth && synth.synth && synth.synth.audioCtx) {
                    const now = synth.synth.audioCtx.currentTime;
                    // Cancel scheduled volume ramps and preserve current volume
                    // The release envelope will fade out from whatever the current volume is
                    const voices = synth.activeVoices ? synth.activeVoices.get(noteName) : null;
                    if (voices && voices.length > 0) {
                        voices.forEach(voice => {
                            if (synth.synth.activeNotes && synth.synth.activeNotes.get(voice.noteId)) {
                                const note = synth.synth.activeNotes.get(voice.noteId);
                                if (note && note.gainNode) {
                                    const currentValue = note.gainNode.gain.value;
                                    note.gainNode.gain.cancelScheduledValues(now);
                                    // Set current value to preserve it (release envelope will fade from here)
                                    note.gainNode.gain.setValueAtTime(currentValue, now);
                                }
                            }
                        });
                    }
                }
            }
        };
        
        sustainDecayAutomations.set(midiNote, automation);
    } else {
        // Fallback: Use Tone.js compatibility layer if Web Audio API synth not available
        console.warn('Web Audio API synth not available, using fallback');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateSustainDecayTime = calculateSustainDecayTime;
    window.startSustainDecay = startSustainDecay;
}
