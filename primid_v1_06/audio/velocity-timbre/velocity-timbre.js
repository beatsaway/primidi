/**
 * Velocity-Dependent Timbre Module (Improved)
 * Based on research4: Attack Transient Timbre - Velocity-to-Spectral Content
 * 
 * Implements improved velocity-dependent harmonic brightness with:
 * - Better harmonic rolloff model based on piano string research
 * - Velocity-dependent boost for higher harmonics
 * - Proper odd/even harmonic handling for square waves
 */

/**
 * Calculate velocity-dependent brightness index
 * Based on research4: brightness_index(v) = 1.0 + 0.5*(v/127)^0.7
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Brightness index (1.0 to 1.5)
 */
function calculateBrightnessIndex(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        return 1.0;
    }
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    return 1.0 + 0.5 * Math.pow(vNorm, 0.7);
}

/**
 * Improved harmonic rolloff based on real piano string research
 * Models: 
 * - Base rolloff: exp(-n * α)
 * - Velocity effect: increases high harmonic content for higher velocities
 * - Frequency-dependent: bass notes get MORE high harmonics when hit hard
 * - Odd/even harmonic differences (for square wave simulation)
 * 
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} fundamentalFreq - Fundamental frequency in Hz (optional, for balanced oscillator type)
 * @returns {number} - Amplitude multiplier for this harmonic (0-1)
 */
function calculateHarmonicRolloff(harmonicNumber, velocity, fundamentalFreq = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        return Math.exp(-harmonicNumber * 0.15); // Gentler rolloff when disabled
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // More realistic model based on piano string research:
    // 1. Base exponential decay (gentler than before)
    const baseRolloff = Math.exp(-harmonicNumber * 0.15);
    
    // 2. Velocity-dependent boost for higher harmonics
    // For high harmonics (>4), boost increases with velocity AND decreases less with harmonic number
    // BUT: Reduce boost for high/mid notes to keep them cleaner
    const isHighHarmonic = harmonicNumber > 4;
    const isHighNote = fundamentalFreq !== null && fundamentalFreq > 1000;
    const isMidNote = fundamentalFreq !== null && fundamentalFreq > 400 && fundamentalFreq <= 1000;
    const isBassNote = fundamentalFreq !== null && fundamentalFreq < 400;
    
    let velocityBoost;
    
    if (isHighHarmonic) {
        // High harmonics: boost depends on note range
        if (isBassNote) {
            // Bass notes: stronger boost for high harmonics when hit hard
            const freqFactor = 1.0 + (1.0 - fundamentalFreq / 400) * 0.5;  // Up to 1.5x more boost
            const highHarmonicBoost = 1.0 + (vNorm * 0.6 * freqFactor * Math.exp(-(harmonicNumber - 4) / 8));
            velocityBoost = highHarmonicBoost;
        } else if (isHighNote || isMidNote) {
            // High/mid notes: REDUCED boost for high harmonics to keep them cleaner
            // Still allow some boost, but much less
            const reductionFactor = isHighNote ? 0.4 : 0.6; // High notes: 40% of normal, mid: 60%
            const highHarmonicBoost = 1.0 + (vNorm * 0.3 * reductionFactor * Math.exp(-(harmonicNumber - 4) / 6));
            velocityBoost = highHarmonicBoost;
        } else {
            // Default for other notes
            const highHarmonicBoost = 1.0 + (vNorm * 0.4 * Math.exp(-(harmonicNumber - 4) / 8));
            velocityBoost = highHarmonicBoost;
        }
    } else {
        // Low harmonics: standard boost (same for all notes)
        velocityBoost = 1.0 + (vNorm * 0.3 * Math.exp(-harmonicNumber / 10));
    }
    
    // 3. Account for oscillator type (odd harmonics for square waves)
    // Use balanced oscillator type if frequency available (Phase 3)
    let oscillatorType;
    if (fundamentalFreq !== null && typeof window !== 'undefined' && window.getBalancedOscillatorType) {
        oscillatorType = window.getBalancedOscillatorType(velocity, fundamentalFreq);
    } else {
        oscillatorType = getOscillatorTypeForVelocity(velocity);
    }
    
    let harmonicFactor = 1.0;
    
    // For bass notes at high velocity, allow more harmonics (less square wave restriction)
    // isBassNote is already declared above (line 55)
    const shouldUseSquareRestriction = oscillatorType === 'square' && (!isBassNote || vNorm < 0.7);
    
    if (shouldUseSquareRestriction) {
        // Square waves: only odd harmonics, stronger rolloff
        if (harmonicNumber % 2 === 0) return 0; // Even harmonics = 0
        harmonicFactor = 1.0 / harmonicNumber; // 1/n rolloff for square waves
    } else if (oscillatorType === 'square' && isBassNote && vNorm >= 0.7) {
        // Bass notes at high velocity: allow even harmonics too (more realistic)
        // But still apply some rolloff
        harmonicFactor = 1.0 / Math.sqrt(harmonicNumber); // Gentler rolloff
    }
    
    // Additional velocity boost for high harmonics in bass notes
    let bassHighHarmonicBoost = 1.0;
    if (isBassNote && isHighHarmonic && vNorm > 0.6) {
        // Bass notes hit hard: extra boost for high harmonics (5-15)
        const extraBoost = 1.0 + ((vNorm - 0.6) * 0.4 * (1.0 - (harmonicNumber - 5) / 10));
        bassHighHarmonicBoost = Math.max(1.0, extraBoost);
    }
    
    return baseRolloff * velocityBoost * harmonicFactor * (1.0 + vNorm * 0.2) * bassHighHarmonicBoost;
}

/**
 * Get oscillator type based on velocity (simplified timbre simulation)
 * Higher velocity = brighter sound (more harmonics)
 * 
 * This is a practical approximation for real-time synthesis:
 * - Sine = pure tone (soft velocities)
 * - Triangle = some harmonics (medium velocities)
 * - Square = moderate harmonics (loud velocities) - less harsh than sawtooth
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {string} - Tone.js oscillator type
 */
function getOscillatorTypeForVelocity(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        return 'sine';
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Use different oscillator types to simulate harmonic content
    // Sine = pure, Triangle = some harmonics, Square = moderate harmonics (less harsh than sawtooth)
    // More gradual transitions for smoother timbre changes
    if (vNorm < 0.4) {
        return 'sine'; // Soft = pure tone
    } else if (vNorm < 0.75) {
        return 'triangle'; // Medium = some harmonics
    } else {
        return 'square'; // Loud = moderate harmonics (square is less harsh than sawtooth)
    }
}

/**
 * Get balanced oscillator type (Meeting 2: Frequency-weighted)
 * High notes (>C6) become more sine-like even at high velocities
 * Low notes become more square-like even at medium velocities
 * Enhanced: Bass notes reach square mode more easily at high velocities for more harmonics
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @returns {string} - Oscillator type ("sine", "triangle", or "square")
 */
function getBalancedOscillatorType(velocity, fundamentalFreq) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityTimbre) {
        return 'sine';
    }
    
    const velNorm = velocity / 127;
    
    // High notes (>C6) become more sine-like even at high velocities
    // Low notes become more square-like even at medium velocities
    const C6_FREQ = 1046; // C6 frequency
    const freqWeight = Math.max(0, Math.min(1, (fundamentalFreq - C6_FREQ) / 2000));
    // freqWeight: 0 at C6, 1 at very high notes
    
    // Bass notes (< 400 Hz) get lower thresholds to reach square mode (more harmonics)
    const isBassNote = fundamentalFreq < 400;
    const bassBoost = isBassNote ? -0.15 : 0; // Bass notes reach square mode 15% earlier
    
    const sineThreshold = 0.3 + (0.1 * freqWeight); // 0.3-0.4 (higher for high notes)
    const triangleThreshold = 0.6 + (0.1 * freqWeight) + bassBoost; // Lower for bass notes
    
    if (velNorm < sineThreshold) return 'sine';
    if (velNorm < triangleThreshold) return 'triangle';
    return 'square';
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateBrightnessIndex = calculateBrightnessIndex;
    window.calculateHarmonicRolloff = calculateHarmonicRolloff;
    window.getOscillatorTypeForVelocity = getOscillatorTypeForVelocity;
    window.getBalancedOscillatorType = getBalancedOscillatorType;
}
