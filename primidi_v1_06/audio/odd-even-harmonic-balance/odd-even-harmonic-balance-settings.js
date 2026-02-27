/**
 * Odd/Even Harmonic Balance Settings
 * Controls the balance between odd and even harmonics for piano-like timbre
 */

if (typeof window !== 'undefined') {
    window.oddEvenHarmonicBalanceSettings = {
        // Boost factor for odd harmonics (1.0 = no boost, >1.0 = boost)
        // Research: odd:even ratio ≈ 2:1, so oddBoost ≈ 1.2-1.3
        oddBoost: 1.2,
        
        // Attenuation factor for even harmonics (1.0 = no attenuation, <1.0 = attenuation)
        // Research: even harmonics should be quieter, so evenAttenuation ≈ 0.5-0.6
        evenAttenuation: 0.6,
        
        // Maximum harmonic number to apply balance to
        // Research: applies to k ≤ 6
        maxHarmonic: 6
    };
}
