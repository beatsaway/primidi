/**
 * Sympathetic String Resonance Delay Module
 * Simulates natural piano resonance when sustain pedal is held
 * Creates frequency-dependent delay/reverb effect based on harmonic multiples
 */

// Track active delay nodes per note
const sympatheticDelayNodes = new Map(); // midiNote -> delayNode

/**
 * Create sympathetic resonance delay for a note
 * @param {number} midiNote - MIDI note number
 * @param {number} frequency - Frequency in Hz
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {Tone.FeedbackDelay|null} - Delay node or null if disabled
 */
function createSympatheticResonanceDelay(midiNote, frequency, velocity) {
    if (typeof window === 'undefined') {
        return null;
    }
    
    if (window.physicsSettings && !window.physicsSettings.sympatheticResonanceDelay) {
        return null;
    }
    
    // Get audio context
    const audioCtx = (window.synth && window.synth.synth && window.synth.synth.audioCtx) || 
                     (window.Tone && window.Tone.context);
    if (!audioCtx) {
        return null;
    }
    
    // Calculate delay times for harmonic multiples
    const harmonics = [1, 2, 3, 4, 5, 6];
    const delays = [];
    
    for (const harmonic of harmonics) {
        const sympFreq = frequency * harmonic;
        const delayTime = 1 / sympFreq; // Fundamental period
        
        // Velocity affects resonance amount (softer = more resonance)
        const resonanceAmount = 0.1 * (1 - (velocity / 127));
        
        delays.push({
            time: delayTime,
            amount: resonanceAmount,
            frequency: sympFreq
        });
    }
    
    // Use the first harmonic delay time as the main delay
    // Multiple delays would require multiple delay nodes (more CPU intensive)
    const mainDelayTime = delays[0].time;
    const feedback = delays[0].amount;
    
    // Create Web Audio API delay node with feedback
    const delayNode = audioCtx.createDelay(2.0); // Max 2 second delay
    const delayGain = audioCtx.createGain(); // For feedback
    const wetGain = audioCtx.createGain(); // Wet signal gain
    const dryGain = audioCtx.createGain(); // Dry signal gain
    const merge = audioCtx.createChannelMerger(2); // Stereo merge
    
    delayNode.delayTime.value = mainDelayTime;
    delayGain.gain.value = feedback; // Feedback amount
    wetGain.gain.value = 0.3; // 30% wet signal
    dryGain.gain.value = 0.7; // 70% dry signal
    
    // Connect: input -> delay -> delayGain -> delay (feedback) + wetGain -> merge
    //         input -> dryGain -> merge
    delayNode.connect(delayGain);
    delayGain.connect(delayNode); // Feedback
    delayGain.connect(wetGain);
    wetGain.connect(merge, 0, 0); // Wet to left
    wetGain.connect(merge, 0, 1); // Wet to right
    
    // Store the complete delay system
    const delaySystem = {
        input: delayNode,
        output: merge,
        delayNode: delayNode,
        delayGain: delayGain,
        wetGain: wetGain,
        dryGain: dryGain,
        merge: merge,
        connect: (source) => {
            source.connect(delayNode);
            source.connect(dryGain);
            dryGain.connect(merge, 0, 0);
            dryGain.connect(merge, 0, 1);
            return merge;
        },
        disconnect: () => {
            delayNode.disconnect();
            delayGain.disconnect();
            wetGain.disconnect();
            dryGain.disconnect();
            merge.disconnect();
        }
    };
    
    return delaySystem;
}

/**
 * Connect sympathetic resonance delay to audio chain
 * @param {Tone.ToneAudioNode} inputNode - Input audio node
 * @returns {Tone.ToneAudioNode} - Output node (delay or input if disabled)
 */
function connectSympatheticResonanceDelay(inputNode) {
    if (typeof window === 'undefined') {
        return inputNode;
    }
    
    if (window.physicsSettings && !window.physicsSettings.sympatheticResonanceDelay) {
        return inputNode;
    }
    
    // For now, return input node - delay will be applied per-note
    // Full implementation would require per-note delay routing
    // With Web Audio API, we can now implement per-note delays properly
    return inputNode;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.createSympatheticResonanceDelay = createSympatheticResonanceDelay;
    window.connectSympatheticResonanceDelay = connectSympatheticResonanceDelay;
    window.sympatheticDelayNodes = sympatheticDelayNodes;
}
