/**
 * Time-Varying Brightness Module
 * Based on feedback1 research: Real instruments have velocity-dependent brightness evolution
 * 
 * Research: 
 * - Attack Phase (0-50ms): Higher partials attack faster than fundamental
 * - Brightness peaks during attack, then gradually decays
 * - Louder notes have longer brightness decay
 * 
 * This module calculates brightness multiplier that evolves over time
 */

/**
 * Calculate time-varying brightness multiplier
 * Brightness peaks during attack, then decays over time
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @param {number} attackTime - Attack time in seconds (optional, will calculate if not provided)
 * @returns {number} - Brightness multiplier (1.0 = no change, >1.0 = brighter)
 */
function getTimeVaryingBrightness(velocity, timeSinceAttack, attackTime = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.timeVaryingBrightness) {
        return 1.0; // No brightness variation when disabled
    }
    
    // Get attack time if not provided
    if (attackTime === null) {
        if (typeof window !== 'undefined' && window.getAttackTimeForVelocity) {
            attackTime = window.getAttackTimeForVelocity(velocity);
        } else {
            // Fallback: calculate from velocity
            const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
            attackTime = 0.01 + (1.0 - vNorm) * 0.19; // 0.01s to 0.2s
        }
    }
    
    // Get settings if available
    const settings = (typeof window !== 'undefined' && window.timeVaryingBrightnessSettings) ? window.timeVaryingBrightnessSettings : {};
    const attackBrightnessPeak = settings.attackBrightnessPeak !== undefined ? settings.attackBrightnessPeak : 0.3; // 30% brightness boost during attack
    const decayTime = settings.decayTime !== undefined ? settings.decayTime : null; // Auto-calculate if null
    const decayBrightness = settings.decayBrightness !== undefined ? settings.decayBrightness : 0.2; // 20% brightness boost during decay
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Calculate decay time (louder = longer decay)
    let calculatedDecayTime = decayTime;
    if (calculatedDecayTime === null) {
        calculatedDecayTime = 0.5 + (1.0 - vNorm) * 2.0; // 0.5s to 2.5s
    }
    
    if (timeSinceAttack < attackTime) {
        // During attack: brightness peaks
        const attackProgress = timeSinceAttack / attackTime;
        // Sine wave peak: peaks at middle of attack, smooth transition
        const brightnessBoost = attackBrightnessPeak * Math.sin(attackProgress * Math.PI) * vNorm;
        return 1.0 + brightnessBoost;
    } else {
        // After attack: gradual decay of brightness
        const decayProgress = Math.min(1.0, (timeSinceAttack - attackTime) / calculatedDecayTime);
        // Exponential decay: brightness decays smoothly
        const brightnessBoost = decayBrightness * (1.0 - decayProgress) * vNorm;
        return 1.0 + brightnessBoost;
    }
}

/**
 * Soft note punchiness factor
 * Soft notes need more initial transient relative to sustain
 * Creates the characteristic "ping" of soft piano notes
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @returns {number} - Punch factor multiplier (1.0 = no change, >1.0 = more punch)
 */
function getSoftNotePunchFactor(velocity, harmonicNumber, timeSinceAttack) {
    if (velocity > 40) return 1.0; // Only for soft notes (velocity <= 40)
    
    // Soft notes: initial "ping" then quick mellowing
    // Higher harmonics get more punch (especially harmonics 2-4)
    const harmonicPunchFactor = harmonicNumber >= 2 && harmonicNumber <= 4 ? 1.5 : 1.0;
    const initialBoost = 1.0 + (2.0 * (40 - velocity) / 40) * harmonicPunchFactor; // Up to 3x boost for harmonics 2-4
    const decayTime = 0.03 + (velocity / 127 * 0.1); // 30-130ms
    
    const attack = Math.min(timeSinceAttack / 0.005, 1.0); // 5ms attack
    const sustain = Math.exp(-Math.max(0, timeSinceAttack - 0.005) / decayTime);
    
    return 1.0 + (initialBoost - 1.0) * attack * sustain;
}

/**
 * Karplus-Style noise burst (Meeting 3: KS-Inspired)
 * KS starts with random noise filtered by the string length
 * This gives soft notes their characteristic warmth and punchiness
 * 
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} time - Time since note attack in seconds
 * @returns {number} - Noise burst multiplier (1.0 = no change, >1.0 = noise boost)
 */
function addKarplusStyleNoiseBurst(harmonicNum, velocity, time) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        !window.physicsSettings.timeVaryingBrightness) {
        return 1.0; // No noise burst when disabled
    }
    
    if (time > 0.01) return 1.0; // Only affects first 10ms
    
    const isLowVelocity = velocity < 60;
    const isHarmonic2to6 = harmonicNum >= 2 && harmonicNum <= 6;
    
    if (isLowVelocity && isHarmonic2to6) {
        // Simulate filtered noise burst
        const noiseAmount = 1.0 + (1.0 - velocity/60) * 0.5; // Up to 50% boost
        const timeDecay = Math.exp(-time / 0.002); // 2ms decay like KS noise
        return noiseAmount * timeDecay;
    }
    
    return 1.0;
}

/**
 * Calculate brightness multiplier for a specific harmonic at a given time
 * Higher harmonics get more brightness boost during attack
 * Includes soft note punchiness factor
 * 
 * @param {number} harmonicNumber - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} timeSinceAttack - Time since note attack in seconds
 * @param {number} attackTime - Attack time in seconds (optional)
 * @returns {number} - Brightness multiplier for this harmonic
 */
function getHarmonicTimeVaryingBrightness(harmonicNumber, velocity, timeSinceAttack, attackTime = null) {
    const baseBrightness = getTimeVaryingBrightness(velocity, timeSinceAttack, attackTime);
    
    // Higher harmonics get more brightness boost during attack
    // This simulates the research finding: "Higher partials attack faster than fundamental"
    let harmonicBoost = 1.0;
    if (timeSinceAttack < (attackTime || 0.05)) {
        // During attack phase
        harmonicBoost = 1.0 + (harmonicNumber - 1) * 0.05; // 5% per harmonic
    }
    
    // Apply soft note punchiness factor
    const punchFactor = getSoftNotePunchFactor(velocity, harmonicNumber, timeSinceAttack);
    
    return baseBrightness * harmonicBoost * punchFactor;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getTimeVaryingBrightness = getTimeVaryingBrightness;
    window.getHarmonicTimeVaryingBrightness = getHarmonicTimeVaryingBrightness;
    window.getSoftNotePunchFactor = getSoftNotePunchFactor;
    window.addKarplusStyleNoiseBurst = addKarplusStyleNoiseBurst;
}
