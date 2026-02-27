/**
 * Frequency Compensation Module (Equal-Loudness Contours)
 * Based on velocity-loudness-mapping.md research
 * 
 * Applies ISO 226:2003-based frequency compensation to make notes sound
 * equally loud across the piano range (A0-C8). This compensates for human
 * hearing sensitivity which varies dramatically with frequency.
 * 
 * CPU Impact: Medium - Runs on every note, involves Math.pow calculations
 * 
 * Formula: Applies gain adjustment based on frequency and target listening level
 * to compensate for equal-loudness contours (Fletcher-Munson curves)
 */

/**
 * Stage 2: Frequency Compensation (Equal-Loudness Contours)
 * Applies ISO 226:2003-based compensation for target listening level
 * 
 * @param {number} frequency - Frequency in Hz
 * @param {number} targetSPL - Target listening level in dB SPL (default 85)
 * @returns {number} - Gain adjustment in dB
 */
function getFrequencyCompensation(frequency, targetSPL = 85) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.frequencyCompensation) {
        return 0; // No compensation when disabled
    }
    
    const f_ref = 1000; // Reference frequency (1 kHz)
    const freq_ratio = frequency / f_ref;
    
    // Simplified ISO 226 equal-loudness contour approximation
    // More accurate would use lookup tables or full ISO 226 equations
    
    if (targetSPL < 60) {
        // Quiet listening: massive bass/treble boost needed
        if (frequency < f_ref) {
            // Bass boost: more boost for lower frequencies
            return 20 * (1 - Math.pow(freq_ratio, 0.3));
        } else {
            // Treble boost
            return 10 * (Math.pow(freq_ratio, 0.2) - 1);
        }
    } else if (targetSPL < 80) {
        // Medium listening level: moderate compensation
        if (frequency < f_ref) {
            return 10 * (1 - Math.pow(freq_ratio, 0.2));
        } else {
            return 5 * (Math.pow(freq_ratio, 0.1) - 1);
        }
    } else {
        // Loud listening (85+ dB): relatively flat, minimal compensation
        if (frequency < f_ref) {
            return 3 * (1 - Math.pow(freq_ratio, 0.1));
        } else {
            return 2 * (Math.pow(freq_ratio, 0.05) - 1);
        }
    }
}

/**
 * Apply frequency compensation to amplitude
 * Converts dB compensation to linear gain and applies it
 * 
 * @param {number} baseAmplitude - Base amplitude (0-1)
 * @param {number} frequency - Frequency in Hz
 * @param {number} targetSPL - Target listening level (default 85)
 * @returns {number} - Compensated amplitude (0-1)
 */
function applyFrequencyCompensation(baseAmplitude, frequency, targetSPL = 85) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.frequencyCompensation) {
        return baseAmplitude; // No compensation when disabled
    }
    
    const compensationDB = getFrequencyCompensation(frequency, targetSPL);
    const compensationLinear = Math.pow(10, compensationDB / 20); // Convert dB to linear gain
    
    // Apply compensation and clamp to [0, 1]
    return Math.max(0, Math.min(1, baseAmplitude * compensationLinear));
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getFrequencyCompensation = getFrequencyCompensation;
    window.applyFrequencyCompensation = applyFrequencyCompensation;
}

