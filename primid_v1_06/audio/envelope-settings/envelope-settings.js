/**
 * Envelope Settings UI Module
 * Provides popup interface for adjusting primary envelope parameters
 * Controls attack, decay, sustain, and release times
 */

// Envelope settings state
let envelopeSettings = {
    attack: 0.01,      // Attack time in seconds (default 10ms)
    decay: 0.1,        // Decay time in seconds (default 100ms)
    sustain: 0.3,      // Sustain level (0-1, default 0.3)
    release: 0.5,      // Release time in seconds (default 500ms)
    sustainPedalSustainBoost: true, // Default: ON - Boost sustain to 1.0 when sustain pedal is pressed
    sustainBoostDuration: 8.0, // Duration to reach 1.0 when pedal pressed (default 8s, min 1s, max 16s)
    sustainRestoreDuration: 0.2 // Duration to restore sustain when pedal released (default 0.2s, min 0.1s, max 5s)
};

// Track effective sustain level (user sustain + sustain pedal boost)
// This allows the displayed sustain value to stay unchanged while the actual sustain boosts
let effectiveSustain = null; // Will be set to user sustain initially
let sustainPedalSustainAutomation = null; // Automation state tracking

// Initialize effective sustain to user sustain
if (typeof window !== 'undefined') {
    effectiveSustain = envelopeSettings.sustain;
}

/**
 * Initialize envelope settings popup
 * Creates and manages the popup UI for envelope adjustments
 */
function initEnvelopeSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('envelope-settings-popup');
    if (!popup) {
        popup = createEnvelopeSettingsPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupEnvelopeSettingsControls();
}

/**
 * Create the envelope settings popup HTML
 */
function createEnvelopeSettingsPopup() {
    const popup = document.createElement('div');
    popup.id = 'envelope-settings-popup';
    popup.className = 'envelope-settings-popup';
    popup.innerHTML = `
        <div class="envelope-settings-popup-content">
            <div class="envelope-settings-popup-header">
                <h2>Amplitude Envelope Settings</h2>
                <button class="envelope-settings-popup-close">×</button>
            </div>
            <div class="envelope-settings-popup-body">
                <div class="envelope-settings-setting">
                    <label>
                        <span>Attack Time</span>
                        <input type="range" id="envelope-attack" min="1" max="100" value="10" step="1">
                        <span class="envelope-settings-value" id="envelope-attack-value">10 ms</span>
                    </label>
                    <div class="envelope-settings-description">Time for note to reach full amplitude. Lower values = sharper attack. Range: 1-100ms. Default: 10ms</div>
                </div>
                
                <div class="envelope-settings-setting">
                    <label>
                        <span>Decay Time</span>
                        <input type="range" id="envelope-decay" min="10" max="1000" value="100" step="10">
                        <span class="envelope-settings-value" id="envelope-decay-value">100 ms</span>
                    </label>
                    <div class="envelope-settings-description">Time to decay from peak to sustain level. Range: 10-1000ms. Default: 100ms</div>
                </div>
                
                <div class="envelope-settings-setting">
                    <label>
                        <span>Sustain Level</span>
                        <input type="range" id="envelope-sustain" min="0" max="100" value="30" step="1">
                        <span class="envelope-settings-value" id="envelope-sustain-value">0.30</span>
                    </label>
                    <div class="envelope-settings-description">Amplitude level during sustain phase (0-1). Range: 0-1.0. Default: 0.3</div>
                </div>
                
                <div class="envelope-settings-setting">
                    <label>
                        <span>Release Time</span>
                        <input type="range" id="envelope-release" min="50" max="2000" value="500" step="50">
                        <span class="envelope-settings-value" id="envelope-release-value">500 ms</span>
                    </label>
                    <div class="envelope-settings-description">Time for note to fade out after release. Range: 50-2000ms. Default: 500ms</div>
                </div>
                
                <div class="envelope-settings-setting">
                    <label style="display: flex; align-items: center; gap: 12px;">
                        <input type="checkbox" id="envelope-sustain-pedal-boost" style="width: 18px; height: 18px; cursor: pointer;">
                        <span>Sustain Pedal Sustain Boost</span>
                    </label>
                    <div class="envelope-settings-description" style="margin-left: 30px;">When enabled, sustain level gradually increases to 1.0 when sustain pedal is pressed, then returns to set value over 2 seconds when released. The displayed sustain value remains unchanged.</div>
                </div>
                
                <div class="envelope-settings-setting" id="envelope-sustain-boost-duration-container" style="margin-left: 30px;">
                    <label>
                        <span>Sustain Boost Duration</span>
                        <input type="range" id="envelope-sustain-boost-duration" min="1" max="16" value="8" step="0.5">
                        <span class="envelope-settings-value" id="envelope-sustain-boost-duration-value">8.0 s</span>
                    </label>
                    <div class="envelope-settings-description">Time for sustain level to reach 1.0 when sustain pedal is pressed. Range: 1-16 seconds. Default: 8 seconds</div>
                </div>
                
                <div class="envelope-settings-setting" id="envelope-sustain-restore-duration-container" style="margin-left: 30px;">
                    <label>
                        <span>Sustain Restore Duration</span>
                        <input type="range" id="envelope-sustain-restore-duration" min="0.1" max="5" value="0.2" step="0.1">
                        <span class="envelope-settings-value" id="envelope-sustain-restore-duration-value">0.2 s</span>
                    </label>
                    <div class="envelope-settings-description">Time for sustain level to restore to set value when sustain pedal is released. Range: 0.1-5 seconds. Default: 0.2 seconds</div>
                </div>
                
                <div class="envelope-settings-popup-footer">
                    <button class="envelope-settings-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('envelope-settings-styles')) {
        const style = document.createElement('style');
        style.id = 'envelope-settings-styles';
        style.textContent = `
            .envelope-settings-popup {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
                z-index: 3000;
                align-items: center;
                justify-content: center;
            }
            .envelope-settings-popup.active {
                display: flex;
            }
            .envelope-settings-popup-content {
                background: rgba(30, 30, 45, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 24px;
                max-width: 600px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                position: relative;
            }
            .envelope-settings-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .envelope-settings-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .envelope-settings-popup-close {
                background: none;
                border: none;
                color: #fff;
                font-size: 28px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background 0.2s;
            }
            .envelope-settings-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .envelope-settings-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .envelope-settings-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .envelope-settings-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .envelope-settings-setting label span:first-child {
                min-width: 140px;
                font-weight: 500;
            }
            .envelope-settings-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .envelope-settings-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .envelope-settings-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .envelope-settings-value {
                min-width: 80px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .envelope-settings-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 152px;
                line-height: 1.4;
            }
            .envelope-settings-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .envelope-settings-reset {
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 6px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            .envelope-settings-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for envelope settings controls
 */
function setupEnvelopeSettingsControls() {
    const popup = document.getElementById('envelope-settings-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.envelope-settings-popup-close');
    const resetBtn = popup.querySelector('.envelope-settings-reset');

    // Close popup
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            popup.classList.remove('active');
        });
    }

    // Close on background click
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            popup.classList.remove('active');
        }
    });

    // Reset to defaults
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetEnvelopeSettingsToDefaults();
        });
    }

    // Attack Time (1-100ms, stored as seconds)
    const attackSlider = document.getElementById('envelope-attack');
    const attackValue = document.getElementById('envelope-attack-value');
    if (attackSlider && attackValue) {
        // Initialize with current settings
        const currentAttack = envelopeSettings.attack * 1000; // Convert to ms
        attackSlider.value = Math.round(currentAttack);
        attackValue.textContent = Math.round(currentAttack) + ' ms';
        
        attackSlider.addEventListener('input', (e) => {
            const valueMs = parseFloat(e.target.value);
            const valueSec = valueMs / 1000; // Convert to seconds
            attackValue.textContent = Math.round(valueMs) + ' ms';
            setEnvelopeSettings({ attack: valueSec });
        });
    }

    // Decay Time (10-1000ms, stored as seconds)
    const decaySlider = document.getElementById('envelope-decay');
    const decayValue = document.getElementById('envelope-decay-value');
    if (decaySlider && decayValue) {
        const currentDecay = envelopeSettings.decay * 1000; // Convert to ms
        decaySlider.value = Math.round(currentDecay);
        decayValue.textContent = Math.round(currentDecay) + ' ms';
        
        decaySlider.addEventListener('input', (e) => {
            const valueMs = parseFloat(e.target.value);
            const valueSec = valueMs / 1000; // Convert to seconds
            decayValue.textContent = Math.round(valueMs) + ' ms';
            setEnvelopeSettings({ decay: valueSec });
        });
    }

    // Sustain Level (0-1)
    const sustainSlider = document.getElementById('envelope-sustain');
    const sustainValue = document.getElementById('envelope-sustain-value');
    if (sustainSlider && sustainValue) {
        const currentSustain = envelopeSettings.sustain;
        sustainSlider.value = Math.round(currentSustain * 100);
        sustainValue.textContent = currentSustain.toFixed(2);
        
        sustainSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100; // Convert to 0-1
            sustainValue.textContent = value.toFixed(2);
            setEnvelopeSettings({ sustain: value });
        });
    }

    // Release Time (50-2000ms, stored as seconds)
    const releaseSlider = document.getElementById('envelope-release');
    const releaseValue = document.getElementById('envelope-release-value');
    if (releaseSlider && releaseValue) {
        const currentRelease = envelopeSettings.release * 1000; // Convert to ms
        releaseSlider.value = Math.round(currentRelease);
        releaseValue.textContent = Math.round(currentRelease) + ' ms';
        
        releaseSlider.addEventListener('input', (e) => {
            const valueMs = parseFloat(e.target.value);
            const valueSec = valueMs / 1000; // Convert to seconds
            releaseValue.textContent = Math.round(valueMs) + ' ms';
            setEnvelopeSettings({ release: valueSec });
        });
    }

    // Sustain Pedal Sustain Boost checkbox
    const sustainPedalBoostCheckbox = document.getElementById('envelope-sustain-pedal-boost');
    if (sustainPedalBoostCheckbox) {
        sustainPedalBoostCheckbox.checked = envelopeSettings.sustainPedalSustainBoost !== false; // Default to true
        
        sustainPedalBoostCheckbox.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            setEnvelopeSettings({ sustainPedalSustainBoost: enabled });
            // If disabled, restore effective sustain to user sustain
            if (!enabled && effectiveSustain !== null) {
                effectiveSustain = envelopeSettings.sustain;
                updateSynthSustainLevel();
            }
        });
    }

    // Sustain Boost Duration slider
    const sustainBoostDurationSlider = document.getElementById('envelope-sustain-boost-duration');
    const sustainBoostDurationValue = document.getElementById('envelope-sustain-boost-duration-value');
    if (sustainBoostDurationSlider && sustainBoostDurationValue) {
        const currentDuration = envelopeSettings.sustainBoostDuration !== undefined ? envelopeSettings.sustainBoostDuration : 8.0;
        sustainBoostDurationSlider.value = currentDuration;
        sustainBoostDurationValue.textContent = currentDuration.toFixed(1) + ' s';
        
        sustainBoostDurationSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sustainBoostDurationValue.textContent = value.toFixed(1) + ' s';
            setEnvelopeSettings({ sustainBoostDuration: value });
        });
    }

    // Sustain Restore Duration slider
    const sustainRestoreDurationSlider = document.getElementById('envelope-sustain-restore-duration');
    const sustainRestoreDurationValue = document.getElementById('envelope-sustain-restore-duration-value');
    if (sustainRestoreDurationSlider && sustainRestoreDurationValue) {
        const currentDuration = envelopeSettings.sustainRestoreDuration !== undefined ? envelopeSettings.sustainRestoreDuration : 0.2;
        sustainRestoreDurationSlider.value = currentDuration;
        sustainRestoreDurationValue.textContent = currentDuration.toFixed(1) + ' s';
        
        sustainRestoreDurationSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sustainRestoreDurationValue.textContent = value.toFixed(1) + ' s';
            setEnvelopeSettings({ sustainRestoreDuration: value });
        });
    }
}

/**
 * Update synth sustain level (called when effective sustain changes)
 */
function updateSynthSustainLevel() {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return;
    }
    
    // Get synth from midi-mapping or main.js
    // We need to access the synth instance - it's stored in midi-mapping module
    // For now, we'll use a callback approach or access via window if available
    if (window.updateSynthEnvelopeSustain) {
        window.updateSynthEnvelopeSustain(effectiveSustain !== null ? effectiveSustain : envelopeSettings.sustain);
    }
}

/**
 * Set envelope settings
 * @param {Object} newSettings - Partial settings object to update
 */
function setEnvelopeSettings(newSettings) {
    Object.assign(envelopeSettings, newSettings);
    
    // Update global settings object
    if (typeof window !== 'undefined') {
        window.envelopeSettings = envelopeSettings;
    }
    
    // If sustain changed and pedal boost is not active, update effective sustain
    if (newSettings.sustain !== undefined) {
        if (!sustainPedalSustainAutomation || !sustainPedalSustainAutomation.isActive) {
            effectiveSustain = envelopeSettings.sustain;
            updateSynthSustainLevel();
        }
    }
}

/**
 * Get envelope settings
 * @returns {Object} Current envelope settings
 */
function getEnvelopeSettings() {
    return { ...envelopeSettings };
}

/**
 * Reset envelope settings to defaults
 */
function resetEnvelopeSettingsToDefaults() {
    const defaults = {
        attack: 0.01,   // 10ms
        decay: 0.1,      // 100ms
        sustain: 0.3,   // 0.3
        release: 0.5,   // 500ms
        sustainPedalSustainBoost: true,
        sustainBoostDuration: 8.0, // 8 seconds
        sustainRestoreDuration: 0.2 // 0.2 seconds
    };

    setEnvelopeSettings(defaults);

    // Update UI sliders
    const attackSlider = document.getElementById('envelope-attack');
    const attackValue = document.getElementById('envelope-attack-value');
    const decaySlider = document.getElementById('envelope-decay');
    const decayValue = document.getElementById('envelope-decay-value');
    const sustainSlider = document.getElementById('envelope-sustain');
    const sustainValue = document.getElementById('envelope-sustain-value');
    const releaseSlider = document.getElementById('envelope-release');
    const releaseValue = document.getElementById('envelope-release-value');

    if (attackSlider) attackSlider.value = 10;
    if (attackValue) attackValue.textContent = '10 ms';
    if (decaySlider) decaySlider.value = 100;
    if (decayValue) decayValue.textContent = '100 ms';
    if (sustainSlider) sustainSlider.value = 30;
    if (sustainValue) sustainValue.textContent = '0.30';
    if (releaseSlider) releaseSlider.value = 500;
    if (releaseValue) releaseValue.textContent = '500 ms';
}

/**
 * Open the envelope settings popup
 */
function openEnvelopeSettings() {
    const popup = document.getElementById('envelope-settings-popup');
    if (popup) {
        // Sync sliders with current settings
        const attackSlider = document.getElementById('envelope-attack');
        const attackValue = document.getElementById('envelope-attack-value');
        const decaySlider = document.getElementById('envelope-decay');
        const decayValue = document.getElementById('envelope-decay-value');
        const sustainSlider = document.getElementById('envelope-sustain');
        const sustainValue = document.getElementById('envelope-sustain-value');
        const releaseSlider = document.getElementById('envelope-release');
        const releaseValue = document.getElementById('envelope-release-value');
        
        if (attackSlider && attackValue) {
            const currentAttack = envelopeSettings.attack * 1000;
            attackSlider.value = Math.round(currentAttack);
            attackValue.textContent = Math.round(currentAttack) + ' ms';
        }
        
        if (decaySlider && decayValue) {
            const currentDecay = envelopeSettings.decay * 1000;
            decaySlider.value = Math.round(currentDecay);
            decayValue.textContent = Math.round(currentDecay) + ' ms';
        }
        
        if (sustainSlider && sustainValue) {
            const currentSustain = envelopeSettings.sustain;
            sustainSlider.value = Math.round(currentSustain * 100);
            sustainValue.textContent = currentSustain.toFixed(2);
        }
        
        if (releaseSlider && releaseValue) {
            const currentRelease = envelopeSettings.release * 1000;
            releaseSlider.value = Math.round(currentRelease);
            releaseValue.textContent = Math.round(currentRelease) + ' ms';
        }
        
        const sustainPedalBoostCheckbox = document.getElementById('envelope-sustain-pedal-boost');
        if (sustainPedalBoostCheckbox) {
            sustainPedalBoostCheckbox.checked = envelopeSettings.sustainPedalSustainBoost !== false;
        }
        
        const sustainBoostDurationSlider = document.getElementById('envelope-sustain-boost-duration');
        const sustainBoostDurationValue = document.getElementById('envelope-sustain-boost-duration-value');
        if (sustainBoostDurationSlider && sustainBoostDurationValue) {
            const currentDuration = envelopeSettings.sustainBoostDuration !== undefined ? envelopeSettings.sustainBoostDuration : 8.0;
            sustainBoostDurationSlider.value = currentDuration;
            sustainBoostDurationValue.textContent = currentDuration.toFixed(1) + ' s';
        }
        
        const sustainRestoreDurationSlider = document.getElementById('envelope-sustain-restore-duration');
        const sustainRestoreDurationValue = document.getElementById('envelope-sustain-restore-duration-value');
        if (sustainRestoreDurationSlider && sustainRestoreDurationValue) {
            const currentDuration = envelopeSettings.sustainRestoreDuration !== undefined ? envelopeSettings.sustainRestoreDuration : 0.2;
            sustainRestoreDurationSlider.value = currentDuration;
            sustainRestoreDurationValue.textContent = currentDuration.toFixed(1) + ' s';
        }
        
        popup.classList.add('active');
    }
}

/**
 * Handle sustain pedal state change for envelope sustain boost
 * Gradually increases sustain to 1.0 when pedal is pressed (5s), restores when released (2s)
 * @param {boolean} pedalActive - Whether sustain pedal is active
 */
function handleSustainPedalChangeEnvelope(pedalActive) {
    // Check if feature is enabled
    if (!envelopeSettings.sustainPedalSustainBoost) {
        // Feature disabled - ensure effective sustain matches user sustain
        if (effectiveSustain !== null && effectiveSustain !== envelopeSettings.sustain) {
            effectiveSustain = envelopeSettings.sustain;
            updateSynthSustainLevel();
        }
        return; // Feature disabled
    }
    
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return;
    }
    
    // Cancel any existing automation
    if (sustainPedalSustainAutomation && sustainPedalSustainAutomation.isActive) {
        if (sustainPedalSustainAutomation.cancel) {
            sustainPedalSustainAutomation.cancel();
        }
        sustainPedalSustainAutomation = null;
    }
    
    // Get current user-set sustain (from settings)
    const userSustain = envelopeSettings.sustain !== undefined ? envelopeSettings.sustain : 0.3;
    
    // Initialize effective sustain if needed
    if (effectiveSustain === null) {
        effectiveSustain = userSustain;
    }
    
    const currentSustain = effectiveSustain;
    const targetSustain = pedalActive ? 1.0 : userSustain; // 1.0 when pedal active, user sustain when released
    // Get duration from settings (default 8s for boost, 0.2s for restore)
    const boostDuration = envelopeSettings.sustainBoostDuration !== undefined ? envelopeSettings.sustainBoostDuration : 8.0;
    const restoreDuration = envelopeSettings.sustainRestoreDuration !== undefined ? envelopeSettings.sustainRestoreDuration : 0.2;
    const transitionDuration = pedalActive ? boostDuration : restoreDuration; // Configurable durations for both directions
    
    // We need to smoothly transition the sustain level
    // Since Tone.js synth.set() affects all voices immediately, we'll use a gradual update approach
    const startTime = Tone.now();
    const endTime = startTime + transitionDuration;
    const steps = Math.ceil(transitionDuration * 60); // 60 updates per second for smooth transition
    const stepDuration = transitionDuration / steps;
    
    let currentStep = 0;
    const updateInterval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const newSustain = currentSustain + (targetSustain - currentSustain) * progress;
        effectiveSustain = newSustain;
        updateSynthSustainLevel();
        
        if (currentStep >= steps) {
            clearInterval(updateInterval);
            effectiveSustain = targetSustain;
            updateSynthSustainLevel();
            if (sustainPedalSustainAutomation) {
                sustainPedalSustainAutomation.isActive = false;
            }
        }
    }, stepDuration * 1000);
    
    // Track automation state
    sustainPedalSustainAutomation = {
        isActive: true,
        targetSustain: targetSustain,
        pedalActive: pedalActive,
        cancel: () => {
            if (updateInterval) {
                clearInterval(updateInterval);
            }
            sustainPedalSustainAutomation.isActive = false;
        }
    };
}

/**
 * Get effective sustain level (user sustain + sustain pedal boost)
 * @returns {number} - Effective sustain level (0-1)
 */
function getEffectiveSustain() {
    return effectiveSustain !== null ? effectiveSustain : envelopeSettings.sustain;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.envelopeSettings = envelopeSettings;
    window.initEnvelopeSettings = initEnvelopeSettings;
    window.openEnvelopeSettings = openEnvelopeSettings;
    window.setEnvelopeSettings = setEnvelopeSettings;
    window.getEnvelopeSettings = getEnvelopeSettings;
    window.resetEnvelopeSettingsToDefaults = resetEnvelopeSettingsToDefaults;
    window.getEffectiveSustain = getEffectiveSustain;
    window.handleSustainPedalChangeEnvelope = handleSustainPedalChangeEnvelope;
}

