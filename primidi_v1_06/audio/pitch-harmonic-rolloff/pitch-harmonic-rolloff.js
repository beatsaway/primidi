/**
 * Pitch-Dependent Harmonic Rolloff Module
 * Based on piano-acoustics-foundations.md research
 * 
 * Research: Lower notes have more audible harmonics than higher notes
 * Formula: aₖ(f₀) = g(f₀) × exp(-k × α(f₀))
 * Where α(f₀) = rolloff rate (increases with pitch)
 * 
 * Bass (A0): 10-15 harmonics clearly audible
 * Treble (C8): Only 2-3 harmonics audible
 * 
 * This module calculates the rolloff rate α based on pitch (fundamental frequency)
 */

/**
 * Calculate pitch-dependent rolloff rate α
 * Higher pitch = faster rolloff (fewer audible harmonics)
 * Lower pitch = slower rolloff (more audible harmonics)
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @returns {number} - Rolloff rate α (higher = faster rolloff)
 */
function calculatePitchDependentRolloff(fundamentalFreq) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.pitchHarmonicRolloff) {
        return 0.15; // Default rolloff when disabled
    }
    
    // Get settings if available
    const settings = (typeof window !== 'undefined' && window.pitchHarmonicRolloffSettings) ? window.pitchHarmonicRolloffSettings : {};
    const bassRolloff = settings.bassRolloff !== undefined ? settings.bassRolloff : 0.08; // Slow rolloff for bass (A0 ~27.5 Hz)
    const trebleRolloff = settings.trebleRolloff !== undefined ? settings.trebleRolloff : 0.35; // Fast rolloff for treble (C8 ~4186 Hz)
    const curveExponent = settings.curveExponent !== undefined ? settings.curveExponent : 1.2;
    
    // Normalize frequency to 0-1 range (A0 = 27.5 Hz to C8 = 4186 Hz)
    const A0_FREQ = 27.5;
    const C8_FREQ = 4186;
    const normalized = Math.max(0, Math.min(1, (fundamentalFreq - A0_FREQ) / (C8_FREQ - A0_FREQ)));
    
    // Exponential interpolation: rolloff increases with pitch
    const alpha = bassRolloff * Math.pow(trebleRolloff / bassRolloff, Math.pow(normalized, curveExponent));
    
    return alpha;
}

/**
 * Calculate harmonic amplitude with pitch-dependent rolloff
 * Formula: aₖ = exp(-k × α(f₀))
 * 
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @returns {number} - Amplitude multiplier for this harmonic (0-1)
 */
function calculatePitchDependentHarmonicAmplitude(harmonicNumber, fundamentalFreq) {
    const alpha = calculatePitchDependentRolloff(fundamentalFreq);
    return Math.exp(-harmonicNumber * alpha);
}

/**
 * Filter-based rolloff (Meeting 3: KS-Inspired)
 * Creates gentler, more natural rolloff by blending filter response with exponential
 * KS uses a lowpass in the feedback loop - we approximate with first-order filter response
 * 
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @returns {number} - Filter-based rolloff amplitude (0-1)
 */
function getFilterBasedRolloff(harmonicNum, fundamentalFreq) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        // If disabled, use simple exponential
        return Math.exp(-harmonicNum * 0.15);
    }
    
    // KS uses a lowpass in the feedback loop
    // We can approximate with a gentler curve
    const cutoffRatio = 0.5; // Higher = brighter
    const harmonicFreq = fundamentalFreq * harmonicNum;
    
    // First-order lowpass filter response
    const filterResponse = 1.0 / Math.sqrt(1.0 + Math.pow(harmonicFreq / (fundamentalFreq * cutoffRatio), 2));
    
    // Blend with original for control (70% exponential, 30% filter)
    const original = Math.exp(-harmonicNum * 0.15);
    return original * 0.7 + filterResponse * 0.3;
}

/**
 * Get maximum number of audible harmonics for a given pitch
 * Used for adaptive partial culling
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} threshold - Amplitude threshold below which harmonics are inaudible (default: 0.01)
 * @returns {number} - Maximum number of audible harmonics
 */
function getMaxAudibleHarmonics(fundamentalFreq, threshold = 0.01) {
    const alpha = calculatePitchDependentRolloff(fundamentalFreq);
    
    // Solve: exp(-k × α) = threshold
    // k = -ln(threshold) / α
    const maxHarmonics = Math.ceil(-Math.log(threshold) / alpha);
    
    // Clamp to reasonable range
    return Math.max(2, Math.min(20, maxHarmonics));
}

/**
 * Get balanced harmonic count (Meeting 2: Timbre Balance)
 * Reduces extreme differences: C8 gets 4-5 harmonics (not 2-3), A0 gets 12 (not 15)
 * Creates smoother timbre transition across registers
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @returns {number} - Balanced harmonic count (4-12 range)
 */
function getBalancedHarmonicCount(fundamentalFreq) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        // If pitch rolloff disabled, use original calculation
        return getMaxAudibleHarmonics(fundamentalFreq, 0.01);
    }
    
    const originalCount = getMaxAudibleHarmonics(fundamentalFreq, 0.01);
    
    // Reduce extreme differences:
    // C8 (~4186 Hz): Original 2-3 → Boost to 4-5 harmonics
    // A0 (~27.5 Hz): Original 15 → Reduce to 12 harmonics
    const targetMin = 4;   // Minimum harmonics even for highest notes
    const targetMax = 12;  // Maximum harmonics even for lowest notes
    
    // Linear mapping with logarithmic frequency
    const A0_FREQ = 27.5;
    const C8_FREQ = 4186;
    const logFreq = Math.log2(fundamentalFreq / A0_FREQ); // Normalize to A0
    const normalized = Math.max(0, Math.min(1, logFreq / Math.log2(C8_FREQ / A0_FREQ))); // 0-1 range
    
    const balancedCount = Math.round(targetMax - (normalized * (targetMax - targetMin)));
    
    // Clamp to reasonable range
    return Math.max(targetMin, Math.min(targetMax, balancedCount));
}

/**
 * Apply register-specific filtering to reduce high-note glassiness (Meeting 3: KS-Inspired)
 * Enhanced: Also applies to mid notes, stronger filtering for cleaner sound
 * High/mid notes need MORE filtering than low notes (opposite of current model)
 * Specifically targets metallic quality in high notes
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} amplitude - Current amplitude (0-1)
 * @returns {number} - Filtered amplitude
 */
function applyRegisterSpecificFiltering(fundamentalFreq, harmonicNum, amplitude) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        return amplitude; // No filtering when disabled
    }
    
    // Apply to high notes (>1000 Hz) and mid notes (400-1000 Hz)
    const isHighNote = fundamentalFreq > 1000;
    const isMidNote = fundamentalFreq > 400 && fundamentalFreq <= 1000;
    const isHighHarmonic = harmonicNum > 4;
    
    if ((isHighNote || isMidNote) && isHighHarmonic) {
        // Stronger filtering for high harmonics in high/mid notes
        const extraAttenuation = Math.pow(0.85, harmonicNum - 4); // 15% reduction per harmonic (was 10%)
        
        let freqFactor;
        if (isHighNote) {
            freqFactor = Math.min(1.0, (fundamentalFreq - 1000) / 3000) + 0.3; // 0.3-1.3 range
        } else {
            freqFactor = Math.min(1.0, (fundamentalFreq - 400) / 600) * 0.5; // 0-0.5 range for mid
        }
        
        // Stronger reduction: up to 50% (was 30%)
        return amplitude * (1.0 - Math.min(0.5, 0.5 * freqFactor * extraAttenuation));
    }
    
    return amplitude;
}

/**
 * Reduce high-note glassiness (Meeting 2: Additional glassiness reduction)
 * Enhanced: Stronger reduction for high/mid notes to make them cleaner
 * Specifically targets metallic quality in high notes by reducing harmonics above 3
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} amplitude - Current amplitude (0-1)
 * @returns {number} - Reduced amplitude for high harmonics in high notes
 */
function reduceHighNoteGlassiness(fundamentalFreq, harmonicNum, amplitude) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        return amplitude; // No reduction when disabled
    }
    
    // Apply to both high notes (>1000 Hz) and mid notes (400-1000 Hz)
    const isHighNote = fundamentalFreq > 1000;
    const isMidNote = fundamentalFreq > 400 && fundamentalFreq <= 1000;
    
    if (!isHighNote && !isMidNote) return amplitude;
    
    // Reduce harmonics above 3 in high/mid notes
    if (harmonicNum > 3) {
        // Stronger reduction for higher frequencies
        const freqFactor = isHighNote 
            ? Math.min(1.0, (fundamentalFreq - 1000) / 3000) + 0.5  // High notes: 0.5-1.5
            : Math.min(1.0, (fundamentalFreq - 400) / 600) * 0.4;    // Mid notes: 0-0.4
        
        // Stronger harmonic reduction: 30% per harmonic (was 20%)
        const harmonicReduction = Math.pow(0.7, harmonicNum - 3); // 30% reduction per harmonic
        
        // More aggressive reduction for very high harmonics (>6)
        const veryHighHarmonicPenalty = harmonicNum > 6 ? Math.pow(0.85, harmonicNum - 6) : 1.0;
        
        const totalReduction = freqFactor * harmonicReduction * veryHighHarmonicPenalty;
        return amplitude * (1.0 - Math.min(0.8, totalReduction)); // Cap at 80% reduction
    }
    
    return amplitude;
}

/**
 * Mid-range character enhancement (Meeting 2: Polish)
 * Enhanced: Focus on low harmonics (2-4) for body, reduce high harmonics (5-6)
 * The middle register (C3-C5) should have the most "piano-like" character
 * Boosts harmonics 2-4 in the middle register, reduces harmonics 5-6 for cleaner sound
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @returns {number} - Enhancement factor (1.0 = no change, >1.0 = boost, <1.0 = reduction)
 */
function getMidRangeEnhancement(fundamentalFreq, harmonicNum) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        return 1.0; // No enhancement when disabled
    }
    
    // Focus on middle register (C3-C5)
    const isMidRange = fundamentalFreq > 130 && fundamentalFreq < 520; // C3-C5
    
    if (!isMidRange) return 1.0;
    
    // Boost low harmonics (2-4) for body
    if (harmonicNum >= 2 && harmonicNum <= 4) {
        // Create a bell curve enhancement around harmonic 3
        const centerHarmonic = 3;
        const width = 1.5; // ±1.5 harmonics
        
        const distance = Math.abs(harmonicNum - centerHarmonic);
        if (distance <= width) {
            // Gaussian-like boost: up to 25% (was 20%)
            const maxBoost = 1.25;
            const boost = maxBoost * Math.exp(-Math.pow(distance, 2) / (2 * Math.pow(width/2, 2)));
            return boost;
        }
    }
    
    // Reduce high harmonics (5-6) for cleaner sound
    if (harmonicNum >= 5 && harmonicNum <= 6) {
        return 0.75; // 25% reduction for cleaner sound
    }
    
    return 1.0;
}

/**
 * High-note low harmonic support (Meeting 4: Body Enhancement)
 * Enhanced: Also applies to mid notes, stronger boost for more "thud" and body
 * High/mid notes need more low harmonics (1-4) to have "body" and warmth
 * Prevents high notes from sounding too thin or glassy
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @returns {number} - Enhancement factor (1.0 = no change, >1.0 = boost)
 */
function getHighNoteLowHarmonicSupport(fundamentalFreq, harmonicNum) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        return 1.0; // No enhancement when disabled
    }
    
    // Boost low harmonics (1-4) in high notes (> 1000 Hz) and mid notes (400-1000 Hz)
    const isHighNote = fundamentalFreq > 1000;
    const isMidNote = fundamentalFreq > 400 && fundamentalFreq <= 1000;
    const isLowHarmonic = harmonicNum >= 1 && harmonicNum <= 4; // Extended to H4 for more body
    
    if ((!isHighNote && !isMidNote) || !isLowHarmonic) return 1.0;
    
    // More boost for higher frequencies (they need more help)
    let freqFactor;
    if (isHighNote) {
        freqFactor = Math.min(1.0, (fundamentalFreq - 1000) / 3000); // 0-1 range from 1000-4000 Hz
    } else {
        // Mid notes: moderate boost
        freqFactor = Math.min(1.0, (fundamentalFreq - 400) / 600) * 0.6; // 0-0.6 range
    }
    
    // Harmonic 1 (fundamental) gets most boost, harmonic 4 gets less
    const harmonicFactor = 1.0 - ((harmonicNum - 1) * 0.15); // 1.0 for H1, 0.85 for H2, 0.7 for H3, 0.55 for H4
    
    // Stronger boost: up to 50% for fundamental at highest frequencies (was 30%)
    const maxBoost = 1.5;
    const boost = 1.0 + (freqFactor * harmonicFactor * 0.5);
    
    return Math.min(maxBoost, boost);
}

/**
 * Low-note high harmonic cleanup (Meeting 4: Clean Balance)
 * Low notes should have harmonics in higher frequencies but keep them clean
 * Reduces very high harmonics (>8) in low notes to prevent muddiness
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} amplitude - Current amplitude (0-1)
 * @returns {number} - Cleaned amplitude
 */
function cleanLowNoteHighHarmonics(fundamentalFreq, harmonicNum, amplitude) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        return amplitude; // No cleaning when disabled
    }
    
    // Only apply to low notes (< 400 Hz)
    const isLowNote = fundamentalFreq < 400;
    const isVeryHighHarmonic = harmonicNum > 8;
    
    if (!isLowNote || !isVeryHighHarmonic) return amplitude;
    
    // Reduce very high harmonics (>8) in low notes for cleaner sound
    // But allow harmonics 5-8 to come through (they're in higher frequencies)
    const reduction = Math.pow(0.9, harmonicNum - 8); // 10% reduction per harmonic above 8
    
    return amplitude * (1.0 - (0.3 * reduction)); // Up to 30% reduction
}

/**
 * Mid-range resonance boost for perceived loudness balance
 * Boosts harmonics that fall in the 1-3kHz range (where human hearing is most sensitive)
 * This gives lower and higher keys more "body" and perceived loudness
 * 
 * The mid-range (1-3kHz) is where the "resonance" and "body" of piano sound comes from.
 * Lower keys need their higher harmonics boosted to reach this range.
 * Higher keys need their lower harmonics boosted to reach this range.
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @returns {number} - Enhancement factor (1.0 = no change, >1.0 = boost)
 */
function getMidRangeResonanceBoost(fundamentalFreq, harmonicNum) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        return 1.0; // No boost when disabled
    }
    
    // Calculate the frequency of this harmonic
    const harmonicFreq = fundamentalFreq * harmonicNum;
    
    // Target range: 1-3kHz (where human hearing is most sensitive)
    const TARGET_MIN = 1000;  // 1 kHz
    const TARGET_MAX = 3000;  // 3 kHz
    const TARGET_CENTER = 2000; // 2 kHz (peak sensitivity)
    
    // Check if this harmonic falls in the target range
    if (harmonicFreq < TARGET_MIN || harmonicFreq > TARGET_MAX) {
        return 1.0; // No boost outside target range
    }
    
    // Determine if this is a lower key or higher key
    // Lower keys: fundamental < 400 Hz (need higher harmonics boosted)
    // Higher keys: fundamental > 1000 Hz (need lower harmonics boosted)
    // Mid keys: 400-1000 Hz (already have good balance, less boost needed)
    const isLowerKey = fundamentalFreq < 400;
    const isHigherKey = fundamentalFreq > 1000;
    const isMidKey = fundamentalFreq >= 400 && fundamentalFreq <= 1000;
    
    // Calculate boost based on how far from target center
    // Peak boost at 2kHz, tapering to edges
    const distanceFromCenter = Math.abs(harmonicFreq - TARGET_CENTER);
    const maxDistance = TARGET_CENTER - TARGET_MIN; // 1000 Hz
    const normalizedDistance = Math.min(1.0, distanceFromCenter / maxDistance);
    
    // Gaussian-like curve: peak at center, tapering to edges
    const centerBoost = Math.exp(-Math.pow(normalizedDistance, 2) * 2);
    
    // Base boost amount depends on key register
    let baseBoost;
    if (isLowerKey) {
        // Lower keys: stronger boost (they need more help reaching mid-range)
        // Boost increases as fundamental gets lower
        const lowKeyFactor = 1.0 - (fundamentalFreq / 400); // 0-1 range, higher for lower keys
        baseBoost = 0.15 + (lowKeyFactor * 0.25); // 15-40% boost range
    } else if (isHigherKey) {
        // Higher keys: even stronger boost (they need the most help)
        // Boost increases as fundamental gets higher
        const highKeyFactor = Math.min(1.0, (fundamentalFreq - 1000) / 3000); // 0-1 range
        baseBoost = 0.20 + (highKeyFactor * 0.35); // 20-55% boost range
    } else {
        // Mid keys: minimal boost (they already have good balance)
        baseBoost = 0.05; // 5% boost
    }
    
    // Apply center boost curve
    const totalBoost = 1.0 + (baseBoost * centerBoost);
    
    // Cap at reasonable maximum (60% boost)
    return Math.min(1.6, totalBoost);
}

/**
 * ISO 226 Peak Sensitivity Reduction
 * Reduces harmonics in the 1-3 kHz range (especially around 2500 Hz)
 * where human hearing is most sensitive (Fletcher-Munson/ISO 226 peak)
 * 
 * This prevents harmonics in this range from sounding too loud due to
 * peak sensitivity, creating a more balanced perceived loudness
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} amplitude - Current amplitude (0-1)
 * @returns {number} - Reduced amplitude
 */
function applyISO226PeakSensitivityReduction(fundamentalFreq, harmonicNum, amplitude) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        return amplitude; // No reduction when disabled
    }
    
    // Calculate the frequency of this harmonic
    const harmonicFreq = fundamentalFreq * harmonicNum;
    
    // Target range: 1-3 kHz (peak sensitivity range)
    const PEAK_FREQ = 2500;  // Peak sensitivity at 2500 Hz
    const RANGE_MIN = 1000;  // 1 kHz (expanded from 2 kHz)
    const RANGE_MAX = 3000;  // 3 kHz
    
    // Only apply to harmonics in this range
    if (harmonicFreq < RANGE_MIN || harmonicFreq > RANGE_MAX) {
        return amplitude;
    }
    
    // Calculate distance from peak (2500 Hz)
    const distanceFromPeak = Math.abs(harmonicFreq - PEAK_FREQ);
    // Use the larger distance (to 1k or 3k) for normalization
    const maxDistance = Math.max(PEAK_FREQ - RANGE_MIN, RANGE_MAX - PEAK_FREQ); // 1500 Hz (to 1k)
    
    // Gaussian-like reduction curve: peak reduction at 2500 Hz, tapering to edges
    const normalizedDistance = distanceFromPeak / maxDistance; // 0-1 range
    const reductionCurve = Math.exp(-Math.pow(normalizedDistance, 2) * 3); // Sharp bell curve
    
    // Maximum reduction: 20% at peak (2500 Hz)
    // This accounts for the peak sensitivity in human hearing
    const maxReduction = 0.20;
    const reduction = maxReduction * reductionCurve;
    
    return amplitude * (1.0 - reduction);
}

/**
 * Tame high harmonics in C5-G6 range (523-1568 Hz)
 * This range can feel too loud due to very high harmonics
 * Reduces high harmonics (>4) in this frequency range to balance perceived loudness
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} amplitude - Current amplitude (0-1)
 * @returns {number} - Tamed amplitude
 */
function tameC5G6HighHarmonics(fundamentalFreq, harmonicNum, amplitude) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        window.physicsSettings.pitchHarmonicRolloff === false) {
        return amplitude; // No taming when disabled
    }
    
    // Target range: C5 to G6 (523-1568 Hz)
    const C5_FREQ = 523;
    const G6_FREQ = 1568;
    
    // Only apply to notes in this range
    if (fundamentalFreq < C5_FREQ || fundamentalFreq > G6_FREQ) {
        return amplitude;
    }
    
    // Only reduce high harmonics (>4) - keep low harmonics for body
    if (harmonicNum <= 4) {
        return amplitude;
    }
    
    // Calculate reduction based on:
    // 1. How high the harmonic is (higher = more reduction)
    // 2. Where in the C5-G6 range the note is (center gets more reduction)
    
    // Harmonic reduction: more reduction for higher harmonics
    const harmonicReduction = Math.pow(0.85, harmonicNum - 4); // 15% reduction per harmonic above 4
    
    // Frequency factor: notes in the middle of C5-G6 range get more reduction
    const rangeCenter = (C5_FREQ + G6_FREQ) / 2; // ~1045 Hz
    const distanceFromCenter = Math.abs(fundamentalFreq - rangeCenter);
    const maxDistance = (G6_FREQ - C5_FREQ) / 2; // Half the range
    const normalizedDistance = Math.min(1.0, distanceFromCenter / maxDistance);
    // Peak reduction at center, tapering to edges
    const freqFactor = 1.0 - (normalizedDistance * 0.5); // 0.5-1.0 range
    
    // Apply reduction: up to 30% reduction for high harmonics in center of range
    const totalReduction = harmonicReduction * freqFactor;
    const reductionAmount = 0.30 * totalReduction; // Max 30% reduction
    
    return amplitude * (1.0 - reductionAmount);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculatePitchDependentRolloff = calculatePitchDependentRolloff;
    window.calculatePitchDependentHarmonicAmplitude = calculatePitchDependentHarmonicAmplitude;
    window.getMaxAudibleHarmonics = getMaxAudibleHarmonics;
    window.getBalancedHarmonicCount = getBalancedHarmonicCount;
    window.applyRegisterSpecificFiltering = applyRegisterSpecificFiltering;
    window.reduceHighNoteGlassiness = reduceHighNoteGlassiness;
    window.getMidRangeEnhancement = getMidRangeEnhancement;
    window.getFilterBasedRolloff = getFilterBasedRolloff;
    window.getHighNoteLowHarmonicSupport = getHighNoteLowHarmonicSupport;
    window.cleanLowNoteHighHarmonics = cleanLowNoteHighHarmonics;
    window.getMidRangeResonanceBoost = getMidRangeResonanceBoost;
    window.tameC5G6HighHarmonics = tameC5G6HighHarmonics;
    window.applyISO226PeakSensitivityReduction = applyISO226PeakSensitivityReduction;
}
