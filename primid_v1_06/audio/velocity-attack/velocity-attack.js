/**
 * Velocity-Dependent Attack Time Module
 * Based on feedback1: Real instruments have velocity-dependent attack characteristics
 * 
 * Research: Higher velocity = faster attack
 * This module calculates attack time based on velocity for more realistic piano response
 * 
 * Modified: Now scales relative to the primary envelope attack value
 */

/**
 * Calculate velocity-dependent attack time
 * Scales relative to the primary envelope attack value
 * Higher velocity = faster attack (shorter time)
 * Lower velocity = slower attack (longer time)
 * 
 * The velocity-dependent range is:
 * - High velocity: 0.3x to 0.7x of primary envelope attack
 * - Low velocity: 0.7x to 1.3x of primary envelope attack
 * 
 * This maintains the velocity-dependent behavior while respecting the user's
 * primary envelope attack setting.
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} primaryAttackTime - Primary envelope attack time in seconds (optional, will use envelopeSettings if not provided)
 * @returns {number} - Attack time in seconds
 */
function getAttackTimeForVelocity(velocity, primaryAttackTime = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocityAttack) {
        // If velocity attack is disabled, return primary envelope attack or default
        if (primaryAttackTime !== null) {
            return primaryAttackTime;
        }
        // Get from envelope settings if available
        if (window.envelopeSettings && window.envelopeSettings.attack !== undefined) {
            return window.envelopeSettings.attack;
        }
        return 0.002; // Default piano-like attack (2ms)
    }
    
    // Get primary envelope attack time
    let baseAttackTime = primaryAttackTime;
    if (baseAttackTime === null) {
        // Try to get from envelope settings
        if (window.envelopeSettings && window.envelopeSettings.attack !== undefined) {
            baseAttackTime = window.envelopeSettings.attack;
        } else {
            // Fallback to default
            baseAttackTime = 0.01; // Default 10ms
        }
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Velocity-dependent scaling relative to primary envelope attack:
    // High velocity (vNorm = 1.0): 0.3x base (faster attack)
    // Low velocity (vNorm = 0.0): 1.3x base (slower attack)
    // Linear interpolation between these extremes
    const minMultiplier = 0.3; // Fastest attack (high velocity)
    const maxMultiplier = 1.3; // Slowest attack (low velocity)
    const multiplier = minMultiplier + (1.0 - vNorm) * (maxMultiplier - minMultiplier);
    
    return baseAttackTime * multiplier;
}

/**
 * Get balanced attack time (Meeting 2: Frequency-dependent)
 * High notes: slightly shorter attack (more immediate, 3-4ms)
 * Low notes: slightly longer attack (more swell, 5-6ms)
 * Velocity effect: softer = slightly longer attack
 * 
 * @param {number} fundamentalFreq - Fundamental frequency in Hz
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} primaryAttackTime - Primary envelope attack time in seconds (optional)
 * @returns {number} - Balanced attack time in seconds
 */
function getBalancedAttackTime(fundamentalFreq, velocity, primaryAttackTime = null) {
    // Get base attack time
    let baseAttack = primaryAttackTime;
    if (baseAttack === null) {
        if (window.envelopeSettings && window.envelopeSettings.attack !== undefined) {
            baseAttack = window.envelopeSettings.attack;
        } else {
            baseAttack = 0.005; // Default 5ms
        }
    }
    
    // High notes: slightly shorter attack (more immediate)
    // Low notes: slightly longer attack (more swell)
    const freqFactor = Math.min(1.0, fundamentalFreq / 1000); // 0-1
    
    // High notes: 3-4ms, Low notes: 5-6ms
    const attackTime = baseAttack * (1.0 - (freqFactor * 0.3));
    
    // Velocity effect: softer = slightly longer attack
    return attackTime * (1.0 + ((127 - velocity) / 127 * 0.2));
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getAttackTimeForVelocity = getAttackTimeForVelocity;
    window.getBalancedAttackTime = getBalancedAttackTime;
}

