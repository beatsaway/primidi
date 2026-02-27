/**
 * Time-Varying Brightness Settings
 * Controls how brightness evolves over time during note duration
 */

if (typeof window !== 'undefined') {
    window.timeVaryingBrightnessSettings = {
        // Brightness boost during attack phase (0.0 = no boost, 1.0 = 100% boost)
        // Research: brightness peaks during attack
        attackBrightnessPeak: 0.3,
        
        // Brightness boost during decay phase (0.0 = no boost, 1.0 = 100% boost)
        // Research: brightness gradually decays after attack
        decayBrightness: 0.2,
        
        // Decay time in seconds (null = auto-calculate based on velocity)
        // Louder notes have longer brightness decay
        decayTime: null // Auto-calculate: 0.5s to 2.5s based on velocity
    };
}
