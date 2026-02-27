/**
 * Two-Stage Decay Module
 * Based on research4: Two-Stage Decay Model (Meyer 1966, 1994)
 * 
 * Implements velocity-dependent two-stage decay:
 * - Stage 1 (0-50ms): Fast decay, δ₁(v) ∝ v^0.3
 * - Stage 2 (50ms+): Slow decay, δ₂(v) ∝ v^0.1
 * 
 * Formula:
 * x(t) = A₁(v) * exp(-δ₁(v)*t) + A₂(v) * exp(-δ₂(v)*t)
 * 
 * Where:
 * - δ₁(v) = δ₁₀ * (1 + 0.5*(v/127)^0.5) - Faster initial decay for louder notes
 * - δ₂(v) = δ₂₀ * (1 + 0.2*(v/127)^0.3) - Slightly faster long decay
 * - A₁(v)/A₂(v) = 0.7 * (v/127)^0.4 - Louder notes have more initial transient energy
 */

/**
 * Calculate two-stage decay parameters based on velocity
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} baseDecay1 - Base fast decay time constant (default 0.05s)
 * @param {number} baseDecay2 - Base slow decay time constant (default 2.0s)
 * @returns {Object} - {decay1, decay2, amplitudeRatio}
 */
function calculateTwoStageDecay(velocity, baseDecay1 = 0.05, baseDecay2 = 2.0) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.twoStageDecay) {
        return {
            decay1: baseDecay1,
            decay2: baseDecay2,
            amplitudeRatio: 0.7
        };
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Velocity-dependent decay rates
    // δ₁(v) = δ₁₀ * (1 + 0.5*(v/127)^0.5) - Faster initial decay for louder notes
    const decay1 = baseDecay1 * (1 + 0.5 * Math.pow(vNorm, 0.5));
    
    // δ₂(v) = δ₂₀ * (1 + 0.2*(v/127)^0.3) - Slightly faster long decay
    const decay2 = baseDecay2 * (1 + 0.2 * Math.pow(vNorm, 0.3));
    
    // A₁(v)/A₂(v) = 0.7 * (v/127)^0.4 - Louder notes have more initial transient energy
    const amplitudeRatio = 0.7 * Math.pow(vNorm, 0.4);
    
    return {
        decay1: Math.max(0.01, Math.min(0.2, decay1)),
        decay2: Math.max(0.5, Math.min(5.0, decay2)),
        amplitudeRatio: Math.max(0.3, Math.min(1.0, amplitudeRatio))
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateTwoStageDecay = calculateTwoStageDecay;
}

