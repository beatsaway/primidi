/**
 * Enhanced Attack Noise Module
 * Implements realistic hammer strike noise component with frequency-dependent characteristics
 * 
 * Research: Hammer noise is proportional to velocity^1.5
 * Enhanced features:
 * - Frequency-dependent noise spectrum (bass = low-frequency thump, treble = high-frequency click)
 * - Velocity-dependent noise envelope (harder = sharper attack, longer decay)
 * - Multiple noise components: thump (20-100 Hz) for bass, click (2-5 kHz) for treble
 * - Very short duration (5-10ms) for realistic attack transients
 * 
 * Formula: N(v, f₀, t) = noise_amplitude(v) × [thump_component(f₀) + click_component(f₀)] × envelope(t)
 * Where noise_amplitude(v) ∝ velocity^1.5
 */

/**
 * Calculate attack noise amplitude based on velocity
 * Research: Hammer noise proportional to velocity^1.5
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @returns {number} - Noise amplitude (0-1)
 */
function calculateAttackNoiseAmplitude(velocity) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.attackNoise) {
        return 0; // No noise when disabled
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Noise amplitude ∝ velocity^1.5
    // Range: 0 to 0.2 (20% of note amplitude) - increased for more presence
    const maxNoiseAmplitude = 0.2;
    const noiseAmplitude = maxNoiseAmplitude * Math.pow(vNorm, 1.5);
    
    return noiseAmplitude;
}

/**
 * Calculate attack noise duration based on velocity and frequency
 * Higher velocity = longer noise, higher frequency = shorter noise
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Noise duration in seconds
 */
function calculateAttackNoiseDuration(velocity, frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.attackNoise) {
        return 0;
    }
    
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    
    // Base duration: 5-10ms depending on velocity (shorter for more realistic transients)
    const baseDuration = 0.005 + vNorm * 0.005; // 5-10ms
    
    // Higher frequencies have shorter noise (treble: 3-6ms, bass: 6-10ms)
    const freqFactor = frequency < 200 ? 1.0 : (frequency < 1000 ? 0.8 : 0.6);
    
    return baseDuration * freqFactor;
}

/**
 * Calculate thump component amplitude (low-frequency noise for bass notes)
 * Bass notes get more low-frequency "thump" (20-100 Hz)
 * 
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Thump component amplitude (0-1)
 */
function calculateThumpComponent(frequency) {
    // Bass notes (< 200 Hz) get full thump
    // Mid notes (200-1000 Hz) get reduced thump
    // Treble notes (> 1000 Hz) get minimal thump
    if (frequency < 200) {
        return 1.0; // Full thump for bass
    } else if (frequency < 1000) {
        return 1.0 - ((frequency - 200) / 800) * 0.8; // Gradual reduction
    } else {
        return 0.2; // Minimal thump for treble (still some for body)
    }
}

/**
 * Calculate click component amplitude (high-frequency noise for treble notes)
 * Treble notes get more high-frequency "click" (2-5 kHz)
 * 
 * @param {number} frequency - Note frequency in Hz
 * @returns {number} - Click component amplitude (0-1)
 */
function calculateClickComponent(frequency) {
    // Treble notes (> 1000 Hz) get full click
    // Mid notes (200-1000 Hz) get reduced click
    // Bass notes (< 200 Hz) get minimal click
    if (frequency > 1000) {
        return 1.0; // Full click for treble
    } else if (frequency > 200) {
        return (frequency - 200) / 800; // Gradual increase
    } else {
        return 0.1; // Minimal click for bass
    }
}

/**
 * Create attack noise filter settings for thump component (low-frequency)
 * 
 * @param {number} frequency - Note frequency in Hz
 * @returns {Object|null} - Filter settings for thump noise, or null if disabled
 */
function getThumpFilterSettings(frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.attackNoise) {
        return null;
    }
    
    // Thump filter: bandpass around 20-100 Hz
    // Bass notes get stronger thump
    const thumpCenter = 60; // Center frequency for thump
    const thumpWidth = 40; // Bandwidth
    
    return {
        type: 'bandpass',
        frequency: thumpCenter,
        Q: thumpCenter / thumpWidth // Q factor for bandwidth
    };
}

/**
 * Create attack noise filter settings for click component (high-frequency)
 * 
 * @param {number} frequency - Note frequency in Hz
 * @returns {Object|null} - Filter settings for click noise, or null if disabled
 */
function getClickFilterSettings(frequency) {
    if (typeof window !== 'undefined' && window.physicsSettings && !window.physicsSettings.attackNoise) {
        return null;
    }
    
    // Click filter: bandpass around 2-5 kHz
    // Treble notes get stronger click
    const clickCenter = 3500; // Center frequency for click
    const clickWidth = 1500; // Bandwidth
    
    return {
        type: 'bandpass',
        frequency: clickCenter,
        Q: clickCenter / clickWidth // Q factor for bandwidth
    };
}

/**
 * Create enhanced attack noise node for a note
 * Uses Web Audio API for better control and performance
 * Creates separate thump and click components based on frequency
 * 
 * @param {number} velocity - MIDI velocity (0-127)
 * @param {number} frequency - Note frequency in Hz
 * @returns {Object|null} - Noise configuration object, or null if disabled
 */
function createAttackNoiseNode(velocity, frequency) {
    if (typeof window === 'undefined') {
        return null;
    }
    
    if (window.physicsSettings && !window.physicsSettings.attackNoise) {
        return null;
    }
    
    // Get audio context (try to get from synth if available)
    let audioCtx = null;
    if (window.synth && window.synth.synth && window.synth.synth.audioCtx) {
        audioCtx = window.synth.synth.audioCtx;
    } else if (window.Tone && window.Tone.context) {
        audioCtx = window.Tone.context;
    } else {
        console.warn('AudioContext not available for attack noise');
        return null;
    }
    
    const noiseAmplitude = calculateAttackNoiseAmplitude(velocity);
    const noiseDuration = calculateAttackNoiseDuration(velocity, frequency);
    
    if (noiseAmplitude <= 0 || noiseDuration <= 0) {
        return null;
    }
    
    // Calculate component amplitudes
    const thumpAmplitude = calculateThumpComponent(frequency);
    const clickAmplitude = calculateClickComponent(frequency);
    
    // Create noise sources (one for thump, one for click)
    const thumpNoise = audioCtx.createBufferSource();
    const clickNoise = audioCtx.createBufferSource();
    
    // Generate noise buffers
    const sampleRate = audioCtx.sampleRate;
    const bufferLength = Math.ceil(noiseDuration * sampleRate);
    
    // Thump noise buffer (low-frequency filtered noise)
    const thumpBuffer = audioCtx.createBuffer(1, bufferLength, sampleRate);
    const thumpData = thumpBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
        thumpData[i] = (Math.random() * 2 - 1) * 0.5; // Pink noise approximation
    }
    thumpNoise.buffer = thumpBuffer;
    
    // Click noise buffer (high-frequency filtered noise)
    const clickBuffer = audioCtx.createBuffer(1, bufferLength, sampleRate);
    const clickData = clickBuffer.getChannelData(0);
    for (let i = 0; i < bufferLength; i++) {
        clickData[i] = (Math.random() * 2 - 1) * 0.3; // Slightly quieter
    }
    clickNoise.buffer = clickBuffer;
    
    // Create filters
    const thumpFilter = getThumpFilterSettings(frequency);
    const clickFilter = getClickFilterSettings(frequency);
    
    let thumpFilterNode = null;
    let clickFilterNode = null;
    
    if (thumpFilter && thumpAmplitude > 0.1) {
        thumpFilterNode = audioCtx.createBiquadFilter();
        thumpFilterNode.type = thumpFilter.type;
        thumpFilterNode.frequency.value = thumpFilter.frequency;
        thumpFilterNode.Q.value = thumpFilter.Q;
    }
    
    if (clickFilter && clickAmplitude > 0.1) {
        clickFilterNode = audioCtx.createBiquadFilter();
        clickFilterNode.type = clickFilter.type;
        clickFilterNode.frequency.value = clickFilter.frequency;
        clickFilterNode.Q.value = clickFilter.Q;
    }
    
    // Create envelopes (velocity-dependent: harder = sharper attack, longer decay)
    const vNorm = Math.max(0, Math.min(127, velocity)) / 127.0;
    const attackTime = 0.001 * (1.0 - vNorm * 0.5); // Harder = faster attack (0.5-1ms)
    const decayTime = noiseDuration * (0.5 + vNorm * 0.5); // Harder = longer decay
    
    const thumpGain = audioCtx.createGain();
    const clickGain = audioCtx.createGain();
    const masterGain = audioCtx.createGain();
    
    // Set initial gains
    thumpGain.gain.value = 0;
    clickGain.gain.value = 0;
    masterGain.gain.value = noiseAmplitude;
    
    // Connect thump component
    if (thumpFilterNode && thumpAmplitude > 0.1) {
        thumpNoise.connect(thumpFilterNode);
        thumpFilterNode.connect(thumpGain);
    } else {
        thumpNoise.connect(thumpGain);
    }
    thumpGain.connect(masterGain);
    
    // Connect click component
    if (clickFilterNode && clickAmplitude > 0.1) {
        clickNoise.connect(clickFilterNode);
        clickFilterNode.connect(clickGain);
    } else {
        clickNoise.connect(clickGain);
    }
    clickGain.connect(masterGain);
    
    // Create envelope automation
    const now = audioCtx.currentTime;
    
    // Thump envelope
    thumpGain.gain.setValueAtTime(0, now);
    thumpGain.gain.linearRampToValueAtTime(thumpAmplitude, now + attackTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime);
    
    // Click envelope
    clickGain.gain.setValueAtTime(0, now);
    clickGain.gain.linearRampToValueAtTime(clickAmplitude, now + attackTime);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime);
    
    // Start noise sources
    thumpNoise.start(now);
    clickNoise.start(now);
    
    // Stop after duration
    thumpNoise.stop(now + noiseDuration);
    clickNoise.stop(now + noiseDuration);
    
    return {
        thumpNoise: thumpNoise,
        clickNoise: clickNoise,
        thumpFilter: thumpFilterNode,
        clickFilter: clickFilterNode,
        thumpGain: thumpGain,
        clickGain: clickGain,
        gain: masterGain, // Main output node
        start: () => {
            // Already started in constructor
        },
        stop: () => {
            const stopTime = audioCtx.currentTime;
            thumpGain.gain.cancelScheduledValues(stopTime);
            clickGain.gain.cancelScheduledValues(stopTime);
            thumpGain.gain.setValueAtTime(0, stopTime);
            clickGain.gain.setValueAtTime(0, stopTime);
        }
    };
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.calculateAttackNoiseAmplitude = calculateAttackNoiseAmplitude;
    window.calculateAttackNoiseDuration = calculateAttackNoiseDuration;
    window.calculateThumpComponent = calculateThumpComponent;
    window.calculateClickComponent = calculateClickComponent;
    window.getThumpFilterSettings = getThumpFilterSettings;
    window.getClickFilterSettings = getClickFilterSettings;
    window.createAttackNoiseNode = createAttackNoiseNode;
}
