/**
 * Realistic Piano Envelope Model Module
 * Implements state-based decay times based on key state + pedal state combination
 * Based on research: Real piano behavior differs significantly based on state
 */

/**
 * Get decay times based on piano state
 * @param {number} keyFrequency - Frequency in Hz
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {boolean} pedalState - Whether sustain pedal is down
 * @param {boolean} keyState - Whether key is held down
 * @returns {Object} - {fastDecay, slowDecay, resonance}
 */
function getPianoEnvelopeDecayTimes(keyFrequency, velocity, pedalState, keyState) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.pianoEnvelopeModel) {
        // Return default values if disabled
        return {
            fastDecay: 0.3,
            slowDecay: 8.0,
            resonance: 0.5
        };
    }
    
    const baseFreq = keyFrequency;
    
    // Get settings if available, otherwise use defaults
    const settings = (typeof window !== 'undefined' && window.pianoEnvelopeModelSettings) 
        ? window.pianoEnvelopeModelSettings 
        : null;
    
    // Base decay times (in seconds)
    let fastDecay, slowDecay;
    
    if (baseFreq < 100) { // Low notes
        fastDecay = settings ? settings.lowFastDecay : 0.5;    // Initial 50% drop
        slowDecay = settings ? settings.lowSlowDecay : 15.0;   // Complete decay
    } else if (baseFreq < 400) { // Mid notes
        fastDecay = settings ? settings.midFastDecay : 0.3;
        slowDecay = settings ? settings.midSlowDecay : 8.0;
    } else { // High notes
        fastDecay = settings ? settings.highFastDecay : 0.1;
        slowDecay = settings ? settings.highSlowDecay : 3.0;
    }
    
    // Apply frequency scaling multiplier to exaggerate the difference
    // This makes lower notes decay even slower relative to high notes
    if (settings && settings.frequencyScaling !== undefined && settings.frequencyScaling !== 1.0) {
        // Map frequency to 0-1 range (low to high)
        // Use logarithmic mapping for more natural scaling
        const minFreq = 27.5; // A0
        const maxFreq = 4186; // C8
        const normalizedFreq = (Math.log2(baseFreq / minFreq)) / (Math.log2(maxFreq / minFreq));
        // normalizedFreq: 0 = lowest note, 1 = highest note
        
        // Calculate scaling factor:
        // - Low notes (normalizedFreq ≈ 0): multiply by frequencyScaling
        // - High notes (normalizedFreq ≈ 1): divide by frequencyScaling
        // - Mid notes: interpolate between
        // When scaling > 1.0: exaggerates difference (low notes slower, high notes faster)
        // When scaling < 1.0: reduces difference (more uniform)
        const lowScaling = settings.frequencyScaling;
        const highScaling = 1.0 / settings.frequencyScaling;
        const scalingFactor = lowScaling * (1.0 - normalizedFreq) + highScaling * normalizedFreq;
        
        fastDecay *= scalingFactor;
        slowDecay *= scalingFactor;
    }
    
    // Adjust based on state
    if (pedalState && keyState) {
        // Key down + pedal: Full resonance
        return { fastDecay, slowDecay, resonance: 1.0 };
    } else if (pedalState && !keyState) {
        // Pedal only: 30% faster decay, less resonance
        return {
            fastDecay: fastDecay * 0.7,
            slowDecay: slowDecay * 0.7,
            resonance: 0.6
        };
    } else if (!pedalState && keyState) {
        // Key only: Minimal resonance, medium decay
        return {
            fastDecay: fastDecay * 0.8,
            slowDecay: slowDecay * 0.9,
            resonance: 0.3
        };
    } else {
        // No pedal, no key: Fastest decay
        return {
            fastDecay: fastDecay * 0.5,
            slowDecay: slowDecay * 0.5,
            resonance: 0.1
        };
    }
}

/**
 * Get state string from key and pedal states
 * @param {boolean} keyDown - Whether key is down
 * @param {boolean} pedalDown - Whether pedal is down
 * @returns {string} - State string ('BOTH', 'PEDAL_ONLY', 'KEY_ONLY', 'NONE')
 */
function getPianoEnvelopeState(keyDown, pedalDown) {
    if (keyDown && pedalDown) return 'BOTH';
    if (!keyDown && pedalDown) return 'PEDAL_ONLY';
    if (keyDown && !pedalDown) return 'KEY_ONLY';
    return 'NONE';
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getPianoEnvelopeDecayTimes = getPianoEnvelopeDecayTimes;
    window.getPianoEnvelopeState = getPianoEnvelopeState;
}
