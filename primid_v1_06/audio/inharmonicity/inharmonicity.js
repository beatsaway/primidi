/**
 * Inharmonicity Module (Enhanced with Velocity Dependency)
 * Implements pitch-dependent partial sharpening based on piano acoustics research
 * 
 * Research: Real piano strings are stiff, causing partials to be sharp
 * Formula: fₖ = k × f₀ × √(1 + B × k²)
 * 
 * NEW: Velocity-dependent inharmonicity
 * Research says: "The exponent α can be tied to velocity (harder strike = more stiffness = larger deviation)"
 * We implement this by scaling B coefficient with velocity:
 * B_effective = B_base * (1 + velocity_factor * (velocity/127)^κ)
 * 
 * Where:
 * - B = inharmonicity coefficient (pitch-dependent, velocity-scaled)
 * - B ≈ 0.0001 for bass strings (A0)
 * - B ≈ 0.02 for treble strings (C8)
 * - Higher velocity = more inharmonicity (stiffer string)
 */

/**
 * Calculate inharmonicity coefficient B based on MIDI note number and velocity
 * B increases with pitch (higher notes have more inharmonicity)
 * B also increases with velocity (harder strike = stiffer string = more inharmonicity)
 * 
 * @param {number} midiNote - MIDI note number (21 = A0, 108 = C8)
 * @param {number} velocity - MIDI velocity (0-127), optional
 * @returns {number} - Inharmonicity coefficient B (velocity-scaled)
 */
function calculateInharmonicityCoefficient(midiNote, velocity = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.inharmonicity) {
        return 0; // No inharmonicity when disabled
    }
    
    const A0_MIDI = 21; // A0 MIDI note number
    const C8_MIDI = 108; // C8 MIDI note number
    
    // Get settings from inharmonicitySettings if available
    const settings = (typeof window !== 'undefined' && window.inharmonicitySettings) ? window.inharmonicitySettings : {};
    const B_min = settings.bMin !== undefined ? settings.bMin : 0.0001;
    const B_max = settings.bMax !== undefined ? settings.bMax : 0.02;
    const curveExponent = settings.curveExponent !== undefined ? settings.curveExponent : 1.5;
    const bassBoost = settings.bassBoost !== undefined ? settings.bassBoost : 1.0;
    const bassBoostThreshold = settings.bassBoostThreshold !== undefined ? settings.bassBoostThreshold : 262;
    
    // Velocity scaling factor (research: harder strike = more stiffness = more inharmonicity)
    // Default: velocity_factor = 0.3, κ = 1.2 (moderate velocity response)
    const velocityFactor = settings.velocityFactor !== undefined ? settings.velocityFactor : 0.3;
    const velocityExponent = settings.velocityExponent !== undefined ? settings.velocityExponent : 1.2;
    
    // Normalize MIDI note to 0-1 range (A0 to C8)
    const normalized = Math.max(0, Math.min(1, (midiNote - A0_MIDI) / (C8_MIDI - A0_MIDI)));
    
    // Exponential interpolation (inharmonicity increases faster in treble)
    let B = B_min * Math.pow(B_max / B_min, Math.pow(normalized, curveExponent));
    
    // Apply bass boost if note frequency is below threshold
    const noteFreq = 440 * Math.pow(2, (midiNote - 69) / 12);
    if (noteFreq < bassBoostThreshold && bassBoost > 1.0) {
        // Apply boost that decreases as we approach the threshold
        const boostFactor = 1.0 + (bassBoost - 1.0) * (1.0 - noteFreq / bassBoostThreshold);
        B *= boostFactor;
    }
    
    // Apply velocity-dependent scaling (NEW)
    // Research: "harder strike = more stiffness = larger deviation"
    // Formula: B_effective = B_base * (1 + velocity_factor * (velocity/127)^κ)
    if (velocity !== null && velocity !== undefined) {
        const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
        const velocityScale = 1.0 + velocityFactor * Math.pow(vNorm, velocityExponent);
        B *= velocityScale;
    }
    
    return B;
}

/**
 * Calculate inharmonic partial frequency
 * Formula: fₖ = k × f₀ × √(1 + B × k²)
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} partialNumber - Partial number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} B - Inharmonicity coefficient (optional, will calculate if not provided)
 * @param {number} midiNote - MIDI note number (required if B not provided)
 * @param {number} velocity - MIDI velocity (optional, for velocity-dependent B)
 * @returns {number} - Inharmonic partial frequency in Hz
 */
function calculateInharmonicPartialFrequency(fundamentalFreq, partialNumber, B = null, midiNote = null, velocity = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.inharmonicity) {
        // No inharmonicity: return perfect harmonic
        return fundamentalFreq * partialNumber;
    }
    
    // Calculate B if not provided (now includes velocity dependency)
    if (B === null) {
        if (midiNote === null) {
            // Fallback: estimate midiNote from frequency
            midiNote = Math.round(69 + 12 * Math.log2(fundamentalFreq / 440));
        }
        B = calculateInharmonicityCoefficient(midiNote, velocity);
    }
    
    // If B is 0, return perfect harmonic
    if (B === 0) {
        return fundamentalFreq * partialNumber;
    }
    
    // Calculate inharmonic frequency: fₖ = k × f₀ × √(1 + B × k²)
    const inharmonicFreq = fundamentalFreq * partialNumber * Math.sqrt(1 + B * partialNumber * partialNumber);
    
    return inharmonicFreq;
}

/**
 * Get oscillator frequency with inharmonicity applied (velocity-dependent)
 * For use with standard oscillators (modifies fundamental frequency slightly)
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} midiNote - MIDI note number
 * @param {number} velocity - MIDI velocity (0-127), optional
 * @returns {number} - Adjusted frequency (slight sharpening for realism, velocity-dependent)
 */
function getInharmonicFundamentalFrequency(fundamentalFreq, midiNote, velocity = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.inharmonicity) {
        return fundamentalFreq;
    }
    
    // For standard oscillators, apply slight sharpening to fundamental
    // This is a simplified approach - full inharmonicity requires custom waveforms
    // Now includes velocity dependency
    const B = calculateInharmonicityCoefficient(midiNote, velocity);
    const sharpening = 1.0 + B * 0.1; // Slight sharpening (velocity affects B)
    return fundamentalFreq * sharpening;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateInharmonicityCoefficient = calculateInharmonicityCoefficient;
    window.calculateInharmonicPartialFrequency = calculateInharmonicPartialFrequency;
    window.getInharmonicFundamentalFrequency = getInharmonicFundamentalFrequency;
}
