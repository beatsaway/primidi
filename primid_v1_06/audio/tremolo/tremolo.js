/**
 * Chorus/Ping-Pong Effect Module
 * Creates a sense of movement and spatial depth with modulated delays
 * Simulates subtle recording movement (fake binaural) - CPU-efficient
 * 
 * Features:
 * - Chorus effect with LFO-modulated delays
 * - Ping-pong stereo movement (left-right panning)
 * - Fake binaural-like spatial movement
 * - CPU-efficient (no true binaural processing)
 */

let chorusSettings = {
    enabled: true,
    strength: 1.0,      // Overall effect strength (0-2, multiplies other parameters)
    rate: 0.8,          // LFO rate in Hz (slow movement, like subtle recording movement)
    depth: 0.003,       // Delay modulation depth in seconds (3ms max variation)
    delayTime: 0.015,   // Base delay time in seconds (15ms - chorus range)
    feedback: 0.2,      // Feedback amount (0-1)
    wetLevel: 0.4,      // Wet signal level (0-1)
    dryLevel: 0.6,      // Dry signal level (0-1)
    pingPongRate: 0.5,  // Ping-pong panning rate (Hz) - slower than chorus
    pingPongDepth: 0.7  // Ping-pong panning depth (0-1, how much left-right movement)
};

let chorusProcessor = null;
let chorusInputSplitter = null;
let chorusOutputMerger = null;

/**
 * Initialize chorus effect
 * @returns {boolean} - Success status
 */
function initializeChorus() {
    if (chorusProcessor) {
        return true; // Already initialized
    }
    
    const audioCtx = window.synth && window.synth.synth && window.synth.synth.audioCtx;
    if (!audioCtx) {
        console.warn('Chorus: Audio context not available');
        return false;
    }
    
    try {
        // Create input splitter (stereo)
        chorusInputSplitter = audioCtx.createChannelSplitter(2);
        
        // Create output merger (stereo)
        chorusOutputMerger = audioCtx.createChannelMerger(2);
        
        chorusProcessor = {
            audioCtx: audioCtx,
            inputSplitter: chorusInputSplitter,
            outputMerger: chorusOutputMerger
        };
        
        // Setup the chorus chain
        setupChorusChain();
        
        return true;
    } catch (error) {
        console.error('Chorus initialization failed:', error);
        return false;
    }
}

/**
 * Setup the chorus processing chain
 * Creates modulated delays with ping-pong stereo movement
 */
function setupChorusChain() {
    if (!chorusInputSplitter || !chorusOutputMerger) return;
    
    const audioCtx = chorusProcessor?.audioCtx || 
                     (window.synth && window.synth.synth && window.synth.synth.audioCtx);
    if (!audioCtx) return;
    
    // Disconnect any existing connections
    if (chorusInputSplitter) {
        try {
            chorusInputSplitter.disconnect();
        } catch (e) {
            // Ignore disconnect errors
        }
    }
    
    // If disabled, just pass through
    if (!chorusSettings.enabled) {
        chorusInputSplitter.connect(chorusOutputMerger, 0, 0); // Left
        chorusInputSplitter.connect(chorusOutputMerger, 1, 1); // Right
        return;
    }
    
    // Apply strength multiplier (calculate once at the start)
    const strength = chorusSettings.strength || 1.0;
    const effectiveDepth = chorusSettings.depth * strength;
    const effectiveWetLevel = chorusSettings.wetLevel * strength;
    const effectivePingPongDepth = chorusSettings.pingPongDepth * strength;
    
    // === LEFT CHANNEL CHORUS ===
    const delayLeft = audioCtx.createDelay(0.1); // Max 100ms delay
    delayLeft.delayTime.value = chorusSettings.delayTime;
    
    // LFO for delay modulation (chorus effect)
    const lfoDelayLeft = audioCtx.createOscillator();
    lfoDelayLeft.type = 'sine';
    lfoDelayLeft.frequency.value = chorusSettings.rate;
    
    const lfoGainDelayLeft = audioCtx.createGain();
    lfoGainDelayLeft.gain.value = effectiveDepth;
    
    // Connect LFO to delay time modulation
    lfoDelayLeft.connect(lfoGainDelayLeft);
    lfoGainDelayLeft.connect(delayLeft.delayTime);
    lfoDelayLeft.start();
    
    // Feedback for chorus
    const feedbackLeft = audioCtx.createGain();
    feedbackLeft.gain.value = chorusSettings.feedback;
    delayLeft.connect(feedbackLeft);
    feedbackLeft.connect(delayLeft); // Feedback loop
    
    // === RIGHT CHANNEL CHORUS ===
    const delayRight = audioCtx.createDelay(0.1);
    delayRight.delayTime.value = chorusSettings.delayTime;
    
    // LFO for delay modulation (slightly different phase for stereo)
    const lfoDelayRight = audioCtx.createOscillator();
    lfoDelayRight.type = 'sine';
    lfoDelayRight.frequency.value = chorusSettings.rate * 1.1; // Slightly different rate
    
    const lfoGainDelayRight = audioCtx.createGain();
    lfoGainDelayRight.gain.value = effectiveDepth;
    
    lfoDelayRight.connect(lfoGainDelayRight);
    lfoGainDelayRight.connect(delayRight.delayTime);
    lfoDelayRight.start();
    
    // Feedback for chorus
    const feedbackRight = audioCtx.createGain();
    feedbackRight.gain.value = chorusSettings.feedback;
    delayRight.connect(feedbackRight);
    feedbackRight.connect(delayRight); // Feedback loop
    
    // === PING-PONG PANNING ===
    // Create LFO for ping-pong panning (slower than chorus)
    const lfoPan = audioCtx.createOscillator();
    lfoPan.type = 'sine';
    lfoPan.frequency.value = chorusSettings.pingPongRate;
    
    // Create panning gain nodes
    // Left wet signal: goes to left output (when LFO high) and right output (when LFO low)
    const panLeftToLeft = audioCtx.createGain();  // Left wet -> Left output
    const panLeftToRight = audioCtx.createGain();  // Left wet -> Right output
    const panRightToLeft = audioCtx.createGain();  // Right wet -> Left output
    const panRightToRight = audioCtx.createGain(); // Right wet -> Right output
    
    // Convert LFO (-1 to 1) to panning
    // When LFO is high (1): left wet goes left, right wet goes right
    // When LFO is low (-1): left wet goes right, right wet goes left
    const panCenter = audioCtx.createConstantSource();
    panCenter.offset.value = 0.5; // Center at 0.5
    
    const panRange = audioCtx.createGain();
    panRange.gain.value = (effectivePingPongDepth || chorusSettings.pingPongDepth * strength) * 0.5; // Half range, apply strength
    
    // Invert for opposite channel
    const panInvert = audioCtx.createGain();
    panInvert.gain.value = -1;
    
    // Connect panning LFO
    lfoPan.connect(panRange);
    panRange.connect(panLeftToLeft.gain);  // Direct connection
    panRange.connect(panRightToRight.gain); // Direct connection
    panRange.connect(panInvert);
    panInvert.connect(panLeftToRight.gain); // Inverted
    panInvert.connect(panRightToLeft.gain); // Inverted
    
    // Add center offset
    panCenter.connect(panLeftToLeft.gain);
    panCenter.connect(panLeftToRight.gain);
    panCenter.connect(panRightToLeft.gain);
    panCenter.connect(panRightToRight.gain);
    
    lfoPan.start();
    panCenter.start();
    
    // === DRY/WET MIX ===
    const dryGainLeft = audioCtx.createGain();
    const dryGainRight = audioCtx.createGain();
    
    // Separate wet gains for each pan path
    const wetGainLeftToLeft = audioCtx.createGain();
    const wetGainLeftToRight = audioCtx.createGain();
    const wetGainRightToLeft = audioCtx.createGain();
    const wetGainRightToRight = audioCtx.createGain();
    
    // Apply strength to wet level, adjust dry level to compensate
    const totalLevel = effectiveWetLevel + chorusSettings.dryLevel;
    const normalizedDryLevel = totalLevel > 1.0 ? chorusSettings.dryLevel / totalLevel : chorusSettings.dryLevel;
    const normalizedWetLevel = totalLevel > 1.0 ? effectiveWetLevel / totalLevel : effectiveWetLevel;
    
    // Use effective values if calculated, otherwise use settings directly
    const finalDryLevel = normalizedDryLevel || chorusSettings.dryLevel;
    const finalWetLevel = normalizedWetLevel || (effectiveWetLevel || chorusSettings.wetLevel * strength);
    
    dryGainLeft.gain.value = finalDryLevel;
    dryGainRight.gain.value = finalDryLevel;
    wetGainLeftToLeft.gain.value = finalWetLevel;
    wetGainLeftToRight.gain.value = finalWetLevel;
    wetGainRightToLeft.gain.value = finalWetLevel;
    wetGainRightToRight.gain.value = finalWetLevel;
    
    // === CONNECTIONS ===
    // Left channel
    chorusInputSplitter.connect(delayLeft, 0);
    chorusInputSplitter.connect(dryGainLeft, 0);
    
    // Ping-pong: left wet signal goes to both outputs (modulated)
    delayLeft.connect(panLeftToLeft);
    delayLeft.connect(panLeftToRight);
    panLeftToLeft.connect(wetGainLeftToLeft);
    panLeftToRight.connect(wetGainLeftToRight);
    
    // Right channel
    chorusInputSplitter.connect(delayRight, 1);
    chorusInputSplitter.connect(dryGainRight, 1);
    
    // Ping-pong: right wet signal goes to both outputs (modulated, opposite phase)
    delayRight.connect(panRightToLeft);
    delayRight.connect(panRightToRight);
    panRightToLeft.connect(wetGainRightToLeft);
    panRightToRight.connect(wetGainRightToRight);
    
    // Connect dry and wet to output
    // Left output: dry left + wet left->left + wet right->left
    dryGainLeft.connect(chorusOutputMerger, 0, 0);
    wetGainLeftToLeft.connect(chorusOutputMerger, 0, 0);
    wetGainRightToLeft.connect(chorusOutputMerger, 0, 0);
    
    // Right output: dry right + wet left->right + wet right->right
    dryGainRight.connect(chorusOutputMerger, 0, 1);
    wetGainLeftToRight.connect(chorusOutputMerger, 0, 1);
    wetGainRightToRight.connect(chorusOutputMerger, 0, 1);
    
    // Store nodes for cleanup
    chorusProcessor.lfoDelayLeft = lfoDelayLeft;
    chorusProcessor.lfoDelayRight = lfoDelayRight;
    chorusProcessor.lfoPan = lfoPan;
    chorusProcessor.delayLeft = delayLeft;
    chorusProcessor.delayRight = delayRight;
    chorusProcessor.panCenter = panCenter;
}

/**
 * Connect chorus to audio chain
 * @param {AudioNode} inputNode - Input audio node
 * @returns {AudioNode} - Output node (chorus or input if disabled)
 */
function connectChorus(inputNode) {
    if (!chorusSettings.enabled) {
        return inputNode; // Pass through if disabled
    }
    
    if (!initializeChorus()) {
        console.warn('Chorus: Failed to initialize, passing through');
        return inputNode;
    }
    
    if (!chorusInputSplitter || !chorusOutputMerger) {
        return inputNode;
    }
    
    // Connect input to chorus
    inputNode.connect(chorusInputSplitter);
    
    return chorusOutputMerger;
}

/**
 * Update chorus settings
 * @param {Object} newSettings - New settings to apply
 */
function updateChorusSettings(newSettings) {
    Object.assign(chorusSettings, newSettings);
    
    // Rebuild chain if already initialized
    if (chorusProcessor) {
        setupChorusChain();
    }
}

// Export for use in other modules (keeping tremolo name for compatibility)
if (typeof window !== 'undefined') {
    window.tremoloSettings = chorusSettings; // Keep for compatibility
    window.chorusSettings = chorusSettings;
    window.initializeTremolo = initializeChorus; // Keep for compatibility
    window.initializeChorus = initializeChorus;
    window.connectTremolo = connectChorus; // Keep for compatibility
    window.connectChorus = connectChorus;
    window.updateTremoloSettings = updateChorusSettings; // Keep for compatibility
    window.updateChorusSettings = updateChorusSettings;
    window.setupTremoloChain = setupChorusChain; // Keep for compatibility
    window.setupChorusChain = setupChorusChain;
}
