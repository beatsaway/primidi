/**
 * Two-Stage Velocity Mapping System
 * Based on research findings for perceptually correct MIDI velocity mapping
 * 
 * Stage 1: Velocity → Amplitude (frequency-independent, perceptual mapping)
 * Stage 2: Amplitude → SPL with Frequency Compensation (equal-loudness contours)
 * 
 * This separates concerns and allows independent tuning of:
 * - Velocity curve "feel" (Stage 1)
 * - Frequency balance (Stage 2)
 */

/**
 * Stage 1: Velocity to Amplitude Mapping
 * Uses constant k value (recommended: 1.8-2.2, default 2.0)
 * This controls the "feel" of the velocity response
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} k - Exponent (default 2.0, range 1.5-2.5)
 * @returns {number} - Amplitude (0-1)
 */
function velocityToAmplitude(velocity, k = 2.0) {
    // Clamp velocity to valid range
    const clampedVel = Math.max(0, Math.min(127, velocity));
    
    // Apply minimum velocity threshold - velocities below 5 produce no sound
    // This prevents very quiet notes from being too loud
    if (clampedVel < 5) {
        return 0;
    }
    
    // Normalize to 0-1 range, but adjust for minimum threshold
    // Map 5-127 to 0-1 range for more sensitive low-velocity response
    const normalized = (clampedVel - 5) / (127 - 5);
    
    // Apply power curve with steeper exponent for better low-velocity sensitivity
    // Use slightly higher exponent (k * 1.1) to make low velocities quieter
    return Math.pow(normalized, k * 1.1);
}

/**
 * Stage 2: Frequency Compensation (Equal-Loudness Contours)
 * Applies ISO 226:2003-based compensation for target listening level
 * 
 * @param {number} frequency - Frequency in Hz
 * @param {number} targetSPL - Target listening level in dB SPL (default 85)
 * @returns {number} - Gain adjustment in dB
 */
function getFrequencyCompensation(frequency, targetSPL = 85) {
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
 * Complete Two-Stage Mapping: Velocity → Final Amplitude
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Frequency in Hz
 * @param {number} k - Velocity exponent (default 2.0)
 * @param {number} targetSPL - Target listening level (default 85)
 * @returns {number} - Final amplitude (0-1) with frequency compensation applied
 */
function velocityToAmplitudeWithCompensation(velocity, frequency, k = 2.0, targetSPL = 85) {
    // Stage 1: Velocity → Base Amplitude
    const baseAmplitude = velocityToAmplitude(velocity, k);
    
    // Stage 2: Apply frequency compensation
    const compensationDB = getFrequencyCompensation(frequency, targetSPL);
    const compensationLinear = Math.pow(10, compensationDB / 20); // Convert dB to linear gain
    
    // Apply compensation and clamp to [0, 1]
    const finalAmplitude = Math.max(0, Math.min(1, baseAmplitude * compensationLinear));
    
    return finalAmplitude;
}

/**
 * Alternative: Convert amplitude to dB, apply compensation, convert back
 * This is closer to the research formula but may be less intuitive
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Frequency in Hz
 * @param {number} k - Velocity exponent (default 2.0)
 * @param {number} targetSPL - Target listening level (default 85)
 * @returns {number} - Final amplitude (0-1)
 */
function velocityToAmplitudeWithCompensationDB(velocity, frequency, k = 2.0, targetSPL = 85) {
    // Stage 1: Velocity → Base Amplitude
    const baseAmplitude = velocityToAmplitude(velocity, k);
    
    // Convert to dB
    const dB_base = 20 * Math.log10(baseAmplitude + 1e-10); // Add tiny value to avoid log(0)
    
    // Stage 2: Apply frequency compensation in dB domain
    const compensationDB = getFrequencyCompensation(frequency, targetSPL);
    const dB_final = dB_base + compensationDB;
    
    // Convert back to linear amplitude
    const finalAmplitude = Math.pow(10, dB_final / 20);
    
    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, finalAmplitude));
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.velocityToAmplitude = velocityToAmplitude;
    window.getFrequencyCompensation = getFrequencyCompensation;
    window.velocityToAmplitudeWithCompensation = velocityToAmplitudeWithCompensation;
    window.velocityToAmplitudeWithCompensationDB = velocityToAmplitudeWithCompensationDB;
}

