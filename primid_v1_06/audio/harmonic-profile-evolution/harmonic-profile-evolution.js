/**
 * Harmonic Profile Evolution Module (Improved)
 * Implements per-harmonic decay rates with three-phase decay model
 * High harmonics (>8) have very short lifespans (50-100ms)
 * Creates realistic spectral evolution over time
 */

// Get strength setting (defaults to 1.0 if not available)
function getEvolutionStrength() {
    if (typeof window !== 'undefined' && window.harmonicProfileEvolutionSettings) {
        return window.harmonicProfileEvolutionSettings.strength || 1.0;
    }
    return 1.0;
}

/**
 * High-harmonic transient factor
 * High harmonics (above threshold) decay extremely quickly
 * @param {number} harmonicNum - Harmonic number (1-based)
 * @param {number} time - Time since note attack in seconds
 * @returns {number} - Transient factor (0-1)
 */
function getHighHarmonicTransientFactor(harmonicNum, time) {
    const highHarmonicThreshold = 8; // Harmonics above this behave differently
    
    if (harmonicNum <= highHarmonicThreshold) return 1.0;
    
    const strength = getEvolutionStrength();
    if (strength <= 0) return 1.0; // No evolution if strength is 0
    
    // Extreme high harmonics disappear within 50-100ms
    // Time constant decreases quadratically with harmonic number
    // Apply strength: higher strength = faster decay
    const baseTimeConstant = 0.05 / Math.pow(harmonicNum / 8, 2); // ~50ms for H8, ~12ms for H16
    const timeConstant = baseTimeConstant / strength; // Divide by strength to make decay faster
    
    // Quick burst then rapid fade
    const attackPeak = Math.min(time / 0.002, 1.0); // 2ms attack
    const decay = Math.exp(-time / timeConstant);
    
    return attackPeak * decay;
}

/**
 * Three-phase decay model (Research-based)
 * Phase 1: Hammer bounce/contact (5ms) - VERY fast for high harmonics
 * Phase 2: String settling (50ms) - Fast decay
 * Phase 3: Slow decay (2s+) - Current model
 * @param {number} harmonicNum - Harmonic number (1-based)
 * @param {number} time - Time since note attack in seconds
 * @returns {number} - Decay rate (0-1)
 */
function getThreePhaseDecay(harmonicNum, time) {
    const strength = getEvolutionStrength();
    if (strength <= 0) {
        // If strength is 0, return uniform decay (no evolution)
        return Math.exp(-time / 2.0);
    }
    
    const t1 = 0.005;  // Phase 1: Hammer bounce/contact (5ms)
    const t2 = 0.050;  // Phase 2: String settling (50ms)
    const t3 = 2.000;  // Phase 3: Slow decay (2s+)
    
    // Decay rates increase dramatically with harmonic number
    // Apply strength multiplier: higher strength = faster decay for high harmonics
    const r1 = Math.pow(harmonicNum, 2.0) * strength;  // VERY fast for high harmonics
    const r2 = Math.pow(harmonicNum, 1.5) * strength;  // Fast decay
    const r3 = Math.pow(harmonicNum, 0.7) * strength;  // Current model
    
    if (time < t1) {
        // Phase 1: Ultra-fast initial decay (hammer contact)
        return Math.exp(-time * r1 / t1);
    } else if (time < t2) {
        // Phase 2: Fast decay (string settling)
        const phase1End = Math.exp(-1); // End of phase 1
        return phase1End * Math.exp(-(time - t1) * r2 / (t2 - t1));
    } else {
        // Phase 3: Slow decay (sustained)
        const phase1End = Math.exp(-1);
        const phase2End = phase1End * Math.exp(-(t2 - t1) * r2 / (t2 - t1));
        return phase2End * Math.exp(-(time - t2) * r3 / t3);
    }
}

/**
 * Calculate harmonic evolution over time
 * Uses three-phase decay model for realistic spectral evolution
 * @param {number} time - Time since note attack in seconds
 * @param {Object} baseState - Base state from getPianoEnvelopeDecayTimes
 * @param {number} velocity - MIDI velocity (0-127) - optional, for velocity-dependent decay
 * @returns {Array} - Array of harmonic decay rates (index = harmonic number, 1-based)
 */
function getHarmonicEvolution(time, baseState, velocity = null) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.harmonicProfileEvolution) {
        // Return uniform decay if disabled
        const uniformDecay = Math.exp(-time / baseState.slowDecay);
        return Array(16).fill(uniformDecay);
    }
    
    const { fastDecay, slowDecay, resonance } = baseState;
    const useThreePhase = typeof window !== 'undefined' && window.physicsSettings && 
                         window.physicsSettings.harmonicProfileEvolution !== false;
    
    // Higher harmonics decay faster
    const harmonicDecayRates = [];
    for (let harmonic = 1; harmonic <= 16; harmonic++) {
        let decayRate;
        
        if (useThreePhase && harmonic > 6) {
            // Use three-phase decay for harmonics above 6
            decayRate = getThreePhaseDecay(harmonic, time);
        } else {
            // Use two-phase decay for lower harmonics (backward compatible)
            const strength = getEvolutionStrength();
            const harmonicFactor = Math.pow(harmonic, 0.7) * strength; // Apply strength
            
            if (time < fastDecay) {
                // Fast decay phase
                decayRate = Math.exp(-time / (fastDecay / harmonicFactor));
            } else {
                // Slow decay phase
                const remainingTime = time - fastDecay;
                decayRate = 
                    Math.exp(-fastDecay / (fastDecay / harmonicFactor)) *
                    Math.exp(-remainingTime / (slowDecay / (harmonicFactor * 0.5)));
            }
        }
        
        // Apply high-harmonic transient factor (for harmonics >8)
        if (harmonic > 8) {
            const transientFactor = getHighHarmonicTransientFactor(harmonic, time);
            decayRate *= transientFactor;
        }
        
        // Apply resonance factor (reduced to prevent tremolo-like oscillations)
        // Reduced from 0.5 to 0.3 to minimize bouncy behavior
        decayRate *= (1.0 - (0.3 * (1 - resonance) * (harmonic / 16)));
        
        harmonicDecayRates[harmonic] = Math.max(0, Math.min(1, decayRate));
    }
    
    return harmonicDecayRates;
}

/**
 * Get decay rate for a specific harmonic at a given time
 * @param {number} harmonic - Harmonic number (1-based)
 * @param {number} time - Time since note attack in seconds
 * @param {Object} baseState - Base state from getPianoEnvelopeDecayTimes
 * @returns {number} - Decay rate (0-1)
 */
function getHarmonicDecayRate(harmonic, time, baseState) {
    const evolution = getHarmonicEvolution(time, baseState);
    return evolution[harmonic] || 1.0;
}

/**
 * Evolving harmonic content (Meeting 3: KS-Inspired)
 * KS: Starts rich, quickly simplifies
 * Higher harmonics fade in/out differently - creates dynamic spectral evolution
 * 
 * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
 * @param {number} time - Time since note attack in seconds
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Evolution factor (0-1)
 */
function getEvolvingHarmonicContent(harmonicNum, time, velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && 
        !window.physicsSettings.harmonicProfileEvolution) {
        return 1.0; // No evolution when disabled
    }
    
    const strength = getEvolutionStrength();
    if (strength <= 0) return 1.0; // No evolution if strength is 0
    
    // KS: Starts rich, quickly simplifies
    const attackPhase = Math.min(1.0, time / 0.02); // First 20ms
    
    // Higher harmonics fade in/out differently
    if (harmonicNum === 1) return 1.0; // Fundamental stays
    
    // Apply strength: higher strength = faster fade
    const fadeOutStart = 0.002 * harmonicNum; // Higher harmonics fade sooner
    const fadeRate = (0.01 * Math.pow(harmonicNum, 1.5)) / strength; // Divide by strength to make fade faster
    
    if (time < fadeOutStart) {
        // Build up during attack
        return time / fadeOutStart;
    } else {
        // Rapid decay after peak
        return Math.exp(-(time - fadeOutStart) / fadeRate);
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.getHarmonicEvolution = getHarmonicEvolution;
    window.getHarmonicDecayRate = getHarmonicDecayRate;
    window.getHighHarmonicTransientFactor = getHighHarmonicTransientFactor;
    window.getThreePhaseDecay = getThreePhaseDecay;
    window.getEvolvingHarmonicContent = getEvolvingHarmonicContent;
}
