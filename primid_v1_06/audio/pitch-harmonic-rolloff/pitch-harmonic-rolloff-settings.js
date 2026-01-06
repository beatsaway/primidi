/**
 * Pitch-Dependent Harmonic Rolloff Settings
 * Controls how harmonic rolloff varies with pitch
 */

if (typeof window !== 'undefined') {
    window.pitchHarmonicRolloffSettings = {
        // Rolloff rate for bass notes (A0 ~27.5 Hz)
        // Lower value = slower rolloff = more harmonics audible
        bassRolloff: 0.08,
        
        // Rolloff rate for treble notes (C8 ~4186 Hz)
        // Higher value = faster rolloff = fewer harmonics audible
        trebleRolloff: 0.35,
        
        // Curve exponent for interpolation between bass and treble
        // Higher = more dramatic change in mid-range
        curveExponent: 1.2
    };
}
