/**
 * Delay-Based Pseudo-Reverb (Stereo Widening) Module
 * CPU-efficient alternative to algorithmic/convolution reverb
 * Based on bosschat research: Multi-delay network with frequency-dependent processing
 * 
 * Architecture:
 * - Crossover at 300Hz (low = mono, high = stereo delays)
 * - Parallel delay lines: Left (13ms), Right (29ms), Center (3ms)
 * - Feedback network with filtering
 * - Modulation on delay times
 * 
 * CPU Impact: Low-Medium - Much more efficient than reverb
 */

// Default settings
const delayPseudoReverbSettings = {
    enabled: false,
    dryWet: 0.3,              // 30% wet, 70% dry
    crossoverFreq: 300,       // Crossover frequency in Hz
    delayLeft: 0.013,         // 13ms left delay
    delayRight: 0.029,        // 29ms right delay
    delayCenter: 0.003,       // 3ms center delay (Haas effect)
    feedbackLeft: 0.15,        // 15% feedback for left delay
    feedbackRight: 0.15,      // 15% feedback for right delay
    feedbackCenter: 0.1,      // 10% feedback for center delay
    modulationAmount: 0.001,   // ±1ms modulation for left
    modulationAmountRight: 0.002, // ±2ms modulation for right
    feedbackHighpass: 500,    // High-pass filter in feedback path (Hz)
    feedbackLowpass: 8000,    // Low-pass filter in feedback path (Hz)
    crossFeedback: true,      // Enable cross-feedback between delays
    crossFeedbackAmount: 0.2, // 20% cross-feedback
    cosmicMode: false,        // Cosmic vibe mode: longer delays, ping-pong, more spatial
    pingPongDelay: false,     // Ping-pong delay (left feeds right, right feeds left)
    pingPongAmount: 0.3,      // Amount of ping-pong feedback
    longDelayLeft: 0.150,     // Long delay for cosmic mode (150ms)
    longDelayRight: 0.200,    // Long delay for cosmic mode (200ms)
    cosmicFeedback: 0.25      // Higher feedback for cosmic mode
};

// Processing nodes (lazy initialization)
let delayPseudoReverbProcessor = null;
let inputSplitter = null;
let outputMerger = null;

/**
 * Initialize delay pseudo-reverb processing system
 * Creates the audio processing chain with crossover and multi-delay network
 */
function initializeDelayPseudoReverb() {
    if (typeof window === 'undefined') {
        console.warn('Window not available for delay pseudo-reverb');
        return false;
    }

    const audioCtx = (window.synth && window.synth.synth && window.synth.synth.audioCtx) || 
                     (window.Tone && window.Tone.context && window.Tone.context.rawContext);
    
    if (!audioCtx) {
        console.warn('AudioContext not available for delay pseudo-reverb');
        return false;
    }

    try {
        // Create input splitter (mono input)
        inputSplitter = audioCtx.createChannelSplitter(1);
        
        // Create output merger (stereo output)
        outputMerger = audioCtx.createChannelMerger(2);
        
        // Create processing chain
        setupDelayPseudoReverbChain();
        
        delayPseudoReverbProcessor = {
            input: inputSplitter,
            output: outputMerger,
            audioCtx: audioCtx
        };
        
        return true;
    } catch (error) {
        console.error('Failed to initialize delay pseudo-reverb:', error);
        return false;
    }
}

/**
 * Setup the delay pseudo-reverb processing chain
 * Implements crossover architecture with multi-delay network
 */
function setupDelayPseudoReverbChain() {
    if (!inputSplitter || !outputMerger) return;
    
    const audioCtx = delayPseudoReverbProcessor?.audioCtx || 
                     (window.synth && window.synth.synth && window.synth.synth.audioCtx);
    if (!audioCtx) return;
    
    // Disconnect any existing connections
    if (inputSplitter) {
        try {
            inputSplitter.disconnect();
        } catch (e) {
            // Ignore disconnect errors
        }
    }
    
    // If disabled, just pass through (mono to stereo)
    if (!delayPseudoReverbSettings.enabled) {
        const dryGain = audioCtx.createGain();
        inputSplitter.connect(dryGain, 0);
        dryGain.connect(outputMerger, 0, 0); // Left
        dryGain.connect(outputMerger, 0, 1); // Right
        return;
    }
    
    // Create crossover filters (split at 300Hz)
    const lowpassFilter = audioCtx.createBiquadFilter();
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.value = delayPseudoReverbSettings.crossoverFreq;
    lowpassFilter.Q.value = 0.707;
    
    const highpassFilter = audioCtx.createBiquadFilter();
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = delayPseudoReverbSettings.crossoverFreq;
    highpassFilter.Q.value = 0.707;
    
    // Connect input to both filters
    inputSplitter.connect(lowpassFilter, 0);
    inputSplitter.connect(highpassFilter, 0);
    
    // LOW PATH: Bypass delays, keep mono
    const lowGain = audioCtx.createGain();
    lowpassFilter.connect(lowGain);
    lowGain.connect(outputMerger, 0, 0); // Left
    lowGain.connect(outputMerger, 0, 1); // Right (same signal for mono)
    
    // HIGH PATH: Process with multi-delay network
    const highDryGain = audioCtx.createGain();
    const highWetGain = audioCtx.createGain();
    
    // Dry signal
    highpassFilter.connect(highDryGain);
    highDryGain.gain.value = 1 - delayPseudoReverbSettings.dryWet;
    
    // Wet signal (delay network)
    highpassFilter.connect(highWetGain);
    highWetGain.gain.value = delayPseudoReverbSettings.dryWet;
    
    // Create delay network
    const delayNetwork = createDelayNetwork(audioCtx);
    highWetGain.connect(delayNetwork.input);
    
    // Mix dry and wet high frequencies
    // Dry signal goes to both left and right
    const highLeftMixer = audioCtx.createGain();
    const highRightMixer = audioCtx.createGain();
    
    highDryGain.connect(highLeftMixer);
    highDryGain.connect(highRightMixer);
    
    // Wet signal (delay network) - left and right outputs
    delayNetwork.leftOutput.connect(highLeftMixer);
    delayNetwork.rightOutput.connect(highRightMixer);
    
    // Connect mixers to output
    highLeftMixer.connect(outputMerger, 0, 0); // Left
    highRightMixer.connect(outputMerger, 0, 1); // Right
}

/**
 * Create multi-delay network with feedback and modulation
 * @param {AudioContext} audioCtx - Web Audio API context
 * @returns {Object} - Delay network with input and output nodes
 */
function createDelayNetwork(audioCtx) {
    // Create delay lines (longer max delay for cosmic mode)
    const maxDelay = delayPseudoReverbSettings.cosmicMode ? 2.0 : 1.0;
    const delayLeft = audioCtx.createDelay(maxDelay);
    const delayRight = audioCtx.createDelay(maxDelay);
    const delayCenter = audioCtx.createDelay(maxDelay);
    
    // Set base delay times (use longer delays in cosmic mode)
    const delayLeftTime = delayPseudoReverbSettings.cosmicMode ? 
        delayPseudoReverbSettings.longDelayLeft : delayPseudoReverbSettings.delayLeft;
    const delayRightTime = delayPseudoReverbSettings.cosmicMode ? 
        delayPseudoReverbSettings.longDelayRight : delayPseudoReverbSettings.delayRight;
    
    delayLeft.delayTime.value = delayLeftTime;
    delayRight.delayTime.value = delayRightTime;
    delayCenter.delayTime.value = delayPseudoReverbSettings.delayCenter;
    
    // Create modulation (LFO) for delay times
    const lfoLeft = audioCtx.createOscillator();
    const lfoRight = audioCtx.createOscillator();
    const lfoGainLeft = audioCtx.createGain();
    const lfoGainRight = audioCtx.createGain();
    
    lfoLeft.frequency.value = 0.5; // Slow modulation (0.5 Hz)
    lfoRight.frequency.value = 0.3; // Slightly different rate
    
    lfoGainLeft.gain.value = delayPseudoReverbSettings.modulationAmount;
    lfoGainRight.gain.value = delayPseudoReverbSettings.modulationAmountRight;
    
    lfoLeft.connect(lfoGainLeft);
    lfoRight.connect(lfoGainRight);
    lfoGainLeft.connect(delayLeft.delayTime);
    lfoGainRight.connect(delayRight.delayTime);
    
    lfoLeft.start();
    lfoRight.start();
    
    // Create feedback paths with filtering
    const feedbackLeft = audioCtx.createGain();
    const feedbackRight = audioCtx.createGain();
    const feedbackCenter = audioCtx.createGain();
    
    // Use higher feedback in cosmic mode
    const feedbackLeftValue = delayPseudoReverbSettings.cosmicMode ? 
        delayPseudoReverbSettings.cosmicFeedback : delayPseudoReverbSettings.feedbackLeft;
    const feedbackRightValue = delayPseudoReverbSettings.cosmicMode ? 
        delayPseudoReverbSettings.cosmicFeedback : delayPseudoReverbSettings.feedbackRight;
    
    feedbackLeft.gain.value = feedbackLeftValue;
    feedbackRight.gain.value = feedbackRightValue;
    feedbackCenter.gain.value = delayPseudoReverbSettings.feedbackCenter;
    
    // High-pass filters in feedback paths
    const feedbackHPLeft = audioCtx.createBiquadFilter();
    const feedbackHPRight = audioCtx.createBiquadFilter();
    const feedbackHPCenter = audioCtx.createBiquadFilter();
    
    feedbackHPLeft.type = 'highpass';
    feedbackHPLeft.frequency.value = delayPseudoReverbSettings.feedbackHighpass;
    feedbackHPLeft.Q.value = 0.707;
    
    feedbackHPRight.type = 'highpass';
    feedbackHPRight.frequency.value = delayPseudoReverbSettings.feedbackHighpass;
    feedbackHPRight.Q.value = 0.707;
    
    feedbackHPCenter.type = 'highpass';
    feedbackHPCenter.frequency.value = delayPseudoReverbSettings.feedbackHighpass;
    feedbackHPCenter.Q.value = 0.707;
    
    // Low-pass filters to darken repeats
    const feedbackLPLeft = audioCtx.createBiquadFilter();
    const feedbackLPRight = audioCtx.createBiquadFilter();
    
    feedbackLPLeft.type = 'lowpass';
    feedbackLPLeft.frequency.value = delayPseudoReverbSettings.feedbackLowpass;
    feedbackLPLeft.Q.value = 0.707;
    
    feedbackLPRight.type = 'lowpass';
    feedbackLPRight.frequency.value = delayPseudoReverbSettings.feedbackLowpass;
    feedbackLPRight.Q.value = 0.707;
    
    // Connect feedback paths
    delayLeft.connect(feedbackHPLeft);
    feedbackHPLeft.connect(feedbackLPLeft);
    feedbackLPLeft.connect(feedbackLeft);
    feedbackLeft.connect(delayLeft);
    
    delayRight.connect(feedbackHPRight);
    feedbackHPRight.connect(feedbackLPRight);
    feedbackLPRight.connect(feedbackRight);
    feedbackRight.connect(delayRight);
    
    delayCenter.connect(feedbackHPCenter);
    feedbackHPCenter.connect(feedbackCenter);
    feedbackCenter.connect(delayCenter);
    
    // Ping-pong delay (left feeds right, right feeds left) - cosmic spatial effect
    if (delayPseudoReverbSettings.pingPongDelay || delayPseudoReverbSettings.cosmicMode) {
        const pingPongLeftToRight = audioCtx.createGain();
        const pingPongRightToLeft = audioCtx.createGain();
        
        pingPongLeftToRight.gain.value = delayPseudoReverbSettings.pingPongAmount;
        pingPongRightToLeft.gain.value = delayPseudoReverbSettings.pingPongAmount;
        
        // Left delay feeds right delay
        delayLeft.connect(pingPongLeftToRight);
        pingPongLeftToRight.connect(delayRight);
        
        // Right delay feeds left delay
        delayRight.connect(pingPongRightToLeft);
        pingPongRightToLeft.connect(delayLeft);
    }
    
    // Cross-feedback network (optional)
    if (delayPseudoReverbSettings.crossFeedback) {
        const crossFeedbackGain1 = audioCtx.createGain();
        const crossFeedbackGain2 = audioCtx.createGain();
        const crossFeedbackGain3 = audioCtx.createGain();
        
        crossFeedbackGain1.gain.value = delayPseudoReverbSettings.crossFeedbackAmount * 0.25;
        crossFeedbackGain2.gain.value = delayPseudoReverbSettings.crossFeedbackAmount * 0.20;
        crossFeedbackGain3.gain.value = delayPseudoReverbSettings.crossFeedbackAmount * 0.15;
        
        // Delay1 → 25% → Delay2
        delayLeft.connect(crossFeedbackGain1);
        crossFeedbackGain1.connect(delayRight);
        
        // Delay2 → 20% → Delay3
        delayRight.connect(crossFeedbackGain2);
        crossFeedbackGain2.connect(delayCenter);
        
        // Delay3 → 15% → Delay1
        delayCenter.connect(crossFeedbackGain3);
        crossFeedbackGain3.connect(delayLeft);
    }
    
    // Create input splitter for delay network
    const delayInputSplitter = audioCtx.createChannelSplitter(1);
    
    // Connect input to all delays
    delayInputSplitter.connect(delayLeft, 0);
    delayInputSplitter.connect(delayRight, 0);
    delayInputSplitter.connect(delayCenter, 0);
    
    // Create output merger for delay network
    const delayOutputMerger = audioCtx.createChannelMerger(2);
    
    // Pan delays to stereo field
    // Left delay → left channel
    const leftGain = audioCtx.createGain();
    leftGain.gain.value = 0.7; // Slightly reduce to avoid clipping
    delayLeft.connect(leftGain);
    
    // Right delay → right channel
    const rightGain = audioCtx.createGain();
    rightGain.gain.value = 0.7;
    delayRight.connect(rightGain);
    
    // Center delay → both channels (Haas effect)
    const centerGainLeft = audioCtx.createGain();
    const centerGainRight = audioCtx.createGain();
    centerGainLeft.gain.value = 0.5;
    centerGainRight.gain.value = 0.5;
    delayCenter.connect(centerGainLeft);
    delayCenter.connect(centerGainRight);
    
    // Mix left and center for left output
    const leftMixer = audioCtx.createGain();
    leftGain.connect(leftMixer);
    centerGainLeft.connect(leftMixer);
    
    // Mix right and center for right output
    const rightMixer = audioCtx.createGain();
    rightGain.connect(rightMixer);
    centerGainRight.connect(rightMixer);
    
    return {
        input: delayInputSplitter,
        leftOutput: leftMixer,
        rightOutput: rightMixer,
        nodes: {
            delayLeft,
            delayRight,
            delayCenter,
            lfoLeft,
            lfoRight
        }
    };
}

/**
 * Connect delay pseudo-reverb to the main audio chain
 * Should be called after synth initialization, can replace or complement binaural reverb
 * 
 * @param {AudioNode} inputNode - Input node (usually synth or filter)
 * @returns {AudioNode} - Output node with delay pseudo-reverb processing applied
 */
function connectDelayPseudoReverb(inputNode) {
    if (!delayPseudoReverbSettings.enabled) {
        // If disabled, just create a stereo pass-through
        const audioCtx = inputNode.context || 
                        (window.synth && window.synth.synth && window.synth.synth.audioCtx);
        if (!audioCtx) return inputNode;
        
        const merger = audioCtx.createChannelMerger(2);
        inputNode.connect(merger, 0, 0);
        inputNode.connect(merger, 0, 1);
        return merger;
    }
    
    if (!delayPseudoReverbProcessor || !inputSplitter || !outputMerger) {
        if (!initializeDelayPseudoReverb()) {
            // Fallback: stereo pass-through
            const audioCtx = inputNode.context || 
                            (window.synth && window.synth.synth && window.synth.synth.audioCtx);
            if (!audioCtx) return inputNode;
            
            const merger = audioCtx.createChannelMerger(2);
            inputNode.connect(merger, 0, 0);
            inputNode.connect(merger, 0, 1);
            return merger;
        }
    }
    
    // Connect input to processing chain
    inputNode.connect(inputSplitter, 0, 0);
    
    return outputMerger;
}

/**
 * Update delay pseudo-reverb parameters
 * Call this when settings change
 */
function updateDelayPseudoReverbSettings() {
    if (!delayPseudoReverbSettings.enabled) {
        setupDelayPseudoReverbChain();
        return;
    }
    
    // Rebuild the processing chain with new settings
    setupDelayPseudoReverbChain();
}

/**
 * Get current delay pseudo-reverb settings
 * @returns {Object} - Copy of current settings
 */
function getDelayPseudoReverbSettings() {
    return { ...delayPseudoReverbSettings };
}

/**
 * Set delay pseudo-reverb settings
 * @param {Object} newSettings - Settings to update
 */
function setDelayPseudoReverbSettings(newSettings) {
    const wasEnabled = delayPseudoReverbSettings.enabled;
    Object.assign(delayPseudoReverbSettings, newSettings);
    
    // If enabling/disabling, rebuild the chain
    if (wasEnabled !== delayPseudoReverbSettings.enabled) {
        setupDelayPseudoReverbChain();
    } else {
        updateDelayPseudoReverbSettings();
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.delayPseudoReverbSettings = delayPseudoReverbSettings;
    window.initializeDelayPseudoReverb = initializeDelayPseudoReverb;
    window.connectDelayPseudoReverb = connectDelayPseudoReverb;
    window.getDelayPseudoReverbSettings = getDelayPseudoReverbSettings;
    window.setDelayPseudoReverbSettings = setDelayPseudoReverbSettings;
    window.updateDelayPseudoReverbSettings = updateDelayPseudoReverbSettings;
}
