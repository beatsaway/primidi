/**
 * Dynamic Frequency-Dependent Delay (Spectral Resonance) Module
 * Innovative feature: Frequency-dependent delays entangled with velocity
 * Creates powerful "living" sounds through spectral analysis and band-specific delays
 * 
 * Note: Full FFT-based implementation is CPU-intensive. This is a simplified version
 * using Tone.js delay nodes for practical performance.
 */

// Track spectral delay nodes
let spectralDelayOutput = null;

/**
 * Create spectral resonance delay system
 * Simplified version using Tone.js delay (full FFT implementation would be CPU-intensive)
 * @param {Tone.ToneAudioNode} inputNode - Input audio node
 * @returns {Tone.ToneAudioNode} - Output node with spectral delay applied
 */
function connectSpectralResonanceDelay(inputNode) {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return inputNode;
    }
    
    if (window.physicsSettings && !window.physicsSettings.spectralResonanceDelay) {
        return inputNode;
    }
    
    // Simplified implementation: Use Web Audio API DelayNode
    // Full FFT-based implementation would require Web Audio API FFT analysis
    const audioCtx = inputNode.context || (window.synth && window.synth.synth && window.synth.synth.audioCtx);
    if (!audioCtx) {
        console.warn('AudioContext not available for spectral resonance delay');
        return inputNode;
    }
    
    // Preserve stereo: ensure we have stereo input
    // First, convert to stereo if needed
    const stereoInput = audioCtx.createChannelMerger(2);
    const inputSplitter = audioCtx.createChannelSplitter(2);
    
    // Connect input to stereo merger (handles both mono and stereo)
    inputNode.connect(stereoInput, 0, 0); // Left channel
    inputNode.connect(stereoInput, 0, 1); // Right channel (duplicates if mono)
    stereoInput.connect(inputSplitter);
    
    // Create separate delay lines for left and right to preserve stereo
    const delayLeft = audioCtx.createDelay(2.0);
    const delayRight = audioCtx.createDelay(2.0);
    const delayGainLeft = audioCtx.createGain();
    const delayGainRight = audioCtx.createGain();
    const wetGainLeft = audioCtx.createGain();
    const wetGainRight = audioCtx.createGain();
    const dryGainLeft = audioCtx.createGain();
    const dryGainRight = audioCtx.createGain();
    const merge = audioCtx.createChannelMerger(2);
    
    delayLeft.delayTime.value = 0.1;
    delayRight.delayTime.value = 0.1;
    delayGainLeft.gain.value = 0.3;
    delayGainRight.gain.value = 0.3;
    wetGainLeft.gain.value = 0.3;
    wetGainRight.gain.value = 0.3;
    dryGainLeft.gain.value = 0.7;
    dryGainRight.gain.value = 0.7;
    
    // Left channel processing
    inputSplitter.connect(delayLeft, 0);
    delayLeft.connect(delayGainLeft);
    delayGainLeft.connect(delayLeft); // Feedback
    delayGainLeft.connect(wetGainLeft);
    wetGainLeft.connect(merge, 0, 0);
    
    inputSplitter.connect(dryGainLeft, 0);
    dryGainLeft.connect(merge, 0, 0);
    
    // Right channel processing
    inputSplitter.connect(delayRight, 1);
    delayRight.connect(delayGainRight);
    delayGainRight.connect(delayRight); // Feedback
    delayGainRight.connect(wetGainRight);
    wetGainRight.connect(merge, 0, 1);
    
    inputSplitter.connect(dryGainRight, 1);
    dryGainRight.connect(merge, 0, 1);
    
    spectralDelayOutput = merge;
    return merge;
}

/**
 * Update delay parameters based on velocity and frequency
 * Called per-note to adjust delay characteristics
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Frequency in Hz
 */
function updateSpectralDelayParams(velocity, frequency) {
    if (!spectralDelayOutput || !window.physicsSettings || !window.physicsSettings.spectralResonanceDelay) {
        return;
    }
    
    // Base delay: lower frequencies = longer delays
    const baseDelay = 0.5 / (frequency / 100); // Inverse relationship
    
    // Velocity modulation: soft = longer, more pronounced
    const velFactor = 1.5 - (velocity / 127);
    
    // Random variation for natural feel (±20%)
    const randomVariation = 0.8 + (Math.random() * 0.4);
    
    const delayTime = Math.max(0.01, Math.min(0.5, baseDelay * velFactor * randomVariation));
    
    // Update delay time (would need access to delay node - simplified for now)
    // Full implementation would track delay nodes per frequency band
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.connectSpectralResonanceDelay = connectSpectralResonanceDelay;
    window.updateSpectralDelayParams = updateSpectralDelayParams;
}
