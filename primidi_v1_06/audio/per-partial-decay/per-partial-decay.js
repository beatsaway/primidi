/**
 * Per-Partial Decay Module
 * Based on research: "Higher partials should have faster attack and faster decay"
 * 
 * Research Insight: "Start simple—just try making the decay time of high harmonics 
 * shorter than lows—and you'll immediately hear a move towards realism."
 * 
 * This module implements per-partial decay rates where:
 * - Higher partials (harmonics) decay faster than lower ones
 * - This creates realistic spectral evolution (bright attack → mellow sustain)
 * - Can be combined with velocity-dependent decay for even more realism
 * 
 * Formula: decay_time[i] = base_decay * (1 + i * decay_scale)
 * Where i is the partial number (1 = fundamental, 2 = 2nd harmonic, etc.)
 */

/**
 * Calculate per-partial decay time
 * Higher partials decay faster, creating realistic spectral evolution
 * 
 * @param {number} baseDecayTime - Base decay time in seconds (for fundamental)
 * @param {number} partialNumber - Partial number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} decayScale - Decay scaling factor (default: 0.15, meaning 15% faster per partial)
 * @returns {number} - Decay time for this partial in seconds
 */
function calculatePerPartialDecayTime(baseDecayTime, partialNumber, decayScale = 0.15) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.perPartialDecay) {
        return baseDecayTime; // No per-partial decay when disabled
    }
    
    // Higher partials decay faster
    // Formula: decay_time[i] = base_decay * (1 - i * decay_scale)
    // Clamp to prevent negative values
    const partialDecayTime = baseDecayTime * (1 - (partialNumber - 1) * decayScale);
    
    // Ensure minimum decay time (don't let it go below 10% of base)
    return Math.max(baseDecayTime * 0.1, Math.max(0.01, partialDecayTime));
}

/**
 * Get per-partial decay envelope parameters
 * Returns decay time adjusted for partial number
 * 
 * @param {number} baseDecayTime - Base decay time in seconds
 * @param {number} partialNumber - Partial number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} decayScale - Decay scaling factor (optional, default: 0.15)
 * @returns {Object} - {decay: number} - Decay time for this partial
 */
function getPerPartialDecayEnvelope(baseDecayTime, partialNumber = 1, decayScale = 0.15) {
    const decay = calculatePerPartialDecayTime(baseDecayTime, partialNumber, decayScale);
    return { decay };
}

/**
 * Calculate decay scale factor based on settings
 * Allows fine-tuning of how much faster higher partials decay
 * 
 * @returns {number} - Decay scale factor (0.0 = no scaling, 0.2 = 20% faster per partial)
 */
function getDecayScaleFactor() {
    if (typeof window !== 'undefined' && window.perPartialDecaySettings) {
        return window.perPartialDecaySettings.decayScale || 0.15;
    }
    return 0.15; // Default: 15% faster per partial
}

/**
 * Get decay time for multiple partials
 * Useful for additive synthesis where you need decay times for all partials
 * 
 * @param {number} baseDecayTime - Base decay time in seconds
 * @param {number} numPartials - Number of partials to calculate
 * @param {number} decayScale - Decay scaling factor (optional)
 * @returns {Array<number>} - Array of decay times for each partial (index 0 = fundamental)
 */
function getPerPartialDecayTimes(baseDecayTime, numPartials, decayScale = null) {
    const scale = decayScale !== null ? decayScale : getDecayScaleFactor();
    const decayTimes = [];
    
    for (let i = 1; i <= numPartials; i++) {
        decayTimes.push(calculatePerPartialDecayTime(baseDecayTime, i, scale));
    }
    
    return decayTimes;
}

// Default settings
const perPartialDecaySettings = {
    decayScale: 0.15,  // 15% faster decay per partial
    enabled: true
};

// Store settings globally
if (typeof window !== 'undefined') {
    window.perPartialDecaySettings = perPartialDecaySettings;
    window.calculatePerPartialDecayTime = calculatePerPartialDecayTime;
    window.getPerPartialDecayEnvelope = getPerPartialDecayEnvelope;
    window.getDecayScaleFactor = getDecayScaleFactor;
    window.getPerPartialDecayTimes = getPerPartialDecayTimes;
}
