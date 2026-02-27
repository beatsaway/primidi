/**
 * Odd/Even Harmonic Balance Module
 * Based on piano-acoustics-foundations.md research
 * 
 * Research: Pianos emphasize odd harmonics (characteristic "woody" tone)
 * Odd:even ratio ≈ 2:1 for k ≤ 6
 * 
 * This module applies a boost to odd harmonics and attenuation to even harmonics
 * to simulate the characteristic piano timbre
 */

/**
 * Calculate odd/even harmonic balance factor
 * Odd harmonics get boosted, even harmonics get attenuated
 * 
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} fundamentalFreq - Fundamental frequency in Hz (optional, for frequency-dependent balance)
 * @returns {number} - Balance factor (1.0 = no change, >1.0 = boost, <1.0 = attenuation)
 */
function calculateOddEvenHarmonicBalance(harmonicNumber, fundamentalFreq = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.oddEvenHarmonicBalance) {
        return 1.0; // No balance adjustment when disabled
    }
    
    // Get settings if available
    const settings = (typeof window !== 'undefined' && window.oddEvenHarmonicBalanceSettings) ? window.oddEvenHarmonicBalanceSettings : {};
    const oddBoost = settings.oddBoost !== undefined ? settings.oddBoost : 1.2; // 20% boost for odd harmonics
    const evenAttenuation = settings.evenAttenuation !== undefined ? settings.evenAttenuation : 0.6; // 40% attenuation for even harmonics
    const maxHarmonic = settings.maxHarmonic !== undefined ? settings.maxHarmonic : 6; // Apply to first 6 harmonics
    
    // Only apply to first N harmonics (research says k ≤ 6)
    if (harmonicNumber > maxHarmonic) {
        return 1.0; // No balance adjustment for higher harmonics
    }
    
    // Fundamental (harmonic 1) is odd - boost it
    if (harmonicNumber === 1) {
        return oddBoost;
    }
    
    // Check if harmonic is odd or even
    if (harmonicNumber % 2 === 1) {
        // Odd harmonic: boost
        // Higher odd harmonics get less boost (decay with harmonic number)
        const boostDecay = 1.0 - ((harmonicNumber - 1) / (maxHarmonic * 2)) * 0.3; // Gradual decay
        return oddBoost * boostDecay;
    } else {
        // Even harmonic: attenuate
        // Higher even harmonics get less attenuation (gradual recovery)
        const attenuationDecay = 1.0 - ((harmonicNumber - 2) / (maxHarmonic * 2)) * 0.2; // Gradual recovery
        return evenAttenuation + (1.0 - evenAttenuation) * (1.0 - attenuationDecay);
    }
}

/**
 * Get odd/even balance ratio for a given harmonic range
 * Useful for analysis and visualization
 * 
 * @param {number} maxHarmonic - Maximum harmonic to analyze
 * @returns {Object} - {oddAmplitude, evenAmplitude, ratio}
 */
function getOddEvenBalanceRatio(maxHarmonic = 6) {
    let oddSum = 0;
    let evenSum = 0;
    
    for (let k = 1; k <= maxHarmonic; k++) {
        const balance = calculateOddEvenHarmonicBalance(k);
        if (k % 2 === 1) {
            oddSum += balance;
        } else {
            evenSum += balance;
        }
    }
    
    return {
        oddAmplitude: oddSum,
        evenAmplitude: evenSum,
        ratio: oddSum / (evenSum || 1) // Avoid division by zero
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateOddEvenHarmonicBalance = calculateOddEvenHarmonicBalance;
    window.getOddEvenBalanceRatio = getOddEvenBalanceRatio;
}
