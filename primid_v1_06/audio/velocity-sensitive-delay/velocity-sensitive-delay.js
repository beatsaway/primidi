/**
 * Velocity-Sensitive Delay Module
 * Implements delay mapped to velocity - softer playing = longer delays, harder playing = tighter delays
 * Based on research findings: Not common on traditional pianos, but creative and useful
 */

/**
 * Calculate delay time from velocity
 * Inverse relationship: soft -> long delays, hard -> tight delays
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} baseFrequency - Base frequency in Hz
 * @returns {number} - Delay time in seconds
 */
function calculateDelayFromVelocity(velocity, baseFrequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocitySensitiveDelay) {
        return 0; // No delay if disabled
    }
    
    // Softer playing = longer, more noticeable delay
    // Harder playing = tighter, more integrated delay
    
    // Inverse relationship: soft -> long delays
    const normalizedVel = Math.max(0, Math.min(127, velocity)) / 127;
    const minDelay = 0.05;  // 50ms
    const maxDelay = 0.5;   // 500ms
    
    // Exponential curve: soft notes have proportionally longer delays
    const delayTime = maxDelay * Math.pow((1 - normalizedVel), 1.5) + minDelay;
    
    // Adjust for frequency - lower notes get slightly longer delays
    const freqAdjust = 1.0 + (100 / Math.max(baseFrequency, 20)) * 0.1;
    
    return delayTime * freqAdjust;
}

/**
 * Calculate string resonance delay for sympathetic resonance simulation
 * Physical modeling: delay time = 1/frequency of sympathetic string
 * @param {number} baseFrequency - Base frequency in Hz
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {Array} - Array of delay objects {time, amount, frequency}
 */
function calculateStringResonanceDelay(baseFrequency, velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.velocitySensitiveDelay) {
        return [];
    }
    
    // Physical modeling: delay time = 1/frequency of sympathetic string
    // Sympathetic strings are typically harmonic multiples
    const harmonics = [1, 2, 3, 4, 5, 6];
    const delays = [];
    
    for (const harmonic of harmonics) {
        const sympFreq = baseFrequency * harmonic;
        const delayTime = 1 / sympFreq; // Fundamental period
        
        // Velocity affects resonance amount, not timing
        const resonanceAmount = 0.1 * (1 - (velocity / 127));
        
        delays.push({
            time: delayTime,
            amount: resonanceAmount,
            frequency: sympFreq
        });
    }
    
    return delays;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateDelayFromVelocity = calculateDelayFromVelocity;
    window.calculateStringResonanceDelay = calculateStringResonanceDelay;
}
