/**
 * Delay Pseudo-Reverb Settings UI Module
 * Provides popup interface for adjusting delay pseudo-reverb parameters
 */

/**
 * Initialize delay pseudo-reverb settings popup
 * Creates and manages the popup UI for delay pseudo-reverb adjustments
 */
function initDelayPseudoReverbSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('delay-pseudo-reverb-popup');
    if (!popup) {
        popup = createDelayPseudoReverbPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupDelayPseudoReverbControls();
}

/**
 * Create the delay pseudo-reverb settings popup HTML
 */
function createDelayPseudoReverbPopup() {
    const popup = document.createElement('div');
    popup.id = 'delay-pseudo-reverb-popup';
    popup.className = 'delay-pseudo-reverb-popup';
    popup.innerHTML = `
        <div class="delay-pseudo-reverb-popup-content">
            <div class="delay-pseudo-reverb-popup-header">
                <h2>Delay Pseudo-Reverb Settings</h2>
                <button class="delay-pseudo-reverb-popup-close">×</button>
            </div>
            <div class="delay-pseudo-reverb-popup-body">
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Dry/Wet Mix</span>
                        <input type="range" id="delay-pseudo-reverb-dry-wet" min="0" max="100" value="30" step="1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-dry-wet-value">0.30</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Balance between dry signal and delayed signal (0.0 = dry, 1.0 = wet)</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Crossover Frequency</span>
                        <input type="range" id="delay-pseudo-reverb-crossover" min="100" max="1000" value="300" step="10">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-crossover-value">300 Hz</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Frequency below which signal stays mono (avoids muddiness)</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Left Delay</span>
                        <input type="range" id="delay-pseudo-reverb-delay-left" min="1" max="50" value="13" step="1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-delay-left-value">13 ms</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Left channel delay time in milliseconds</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Right Delay</span>
                        <input type="range" id="delay-pseudo-reverb-delay-right" min="1" max="50" value="29" step="1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-delay-right-value">29 ms</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Right channel delay time in milliseconds</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Center Delay</span>
                        <input type="range" id="delay-pseudo-reverb-delay-center" min="1" max="10" value="3" step="1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-delay-center-value">3 ms</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Center delay (Haas effect) in milliseconds</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Feedback Left</span>
                        <input type="range" id="delay-pseudo-reverb-feedback-left" min="0" max="50" value="15" step="1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-feedback-left-value">0.15</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Feedback amount for left delay (0.0 = no feedback, 0.5 = 50% feedback)</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Feedback Right</span>
                        <input type="range" id="delay-pseudo-reverb-feedback-right" min="0" max="50" value="15" step="1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-feedback-right-value">0.15</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Feedback amount for right delay</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Modulation Left</span>
                        <input type="range" id="delay-pseudo-reverb-modulation-left" min="0" max="5" value="1" step="0.1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-modulation-left-value">1.0 ms</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Modulation amount for left delay (±milliseconds)</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Modulation Right</span>
                        <input type="range" id="delay-pseudo-reverb-modulation-right" min="0" max="5" value="2" step="0.1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-modulation-right-value">2.0 ms</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Modulation amount for right delay (±milliseconds)</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Feedback High-Pass</span>
                        <input type="range" id="delay-pseudo-reverb-feedback-hp" min="100" max="2000" value="500" step="50">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-feedback-hp-value">500 Hz</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">High-pass filter frequency in feedback path</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Feedback Low-Pass</span>
                        <input type="range" id="delay-pseudo-reverb-feedback-lp" min="2000" max="20000" value="8000" step="500">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-feedback-lp-value">8000 Hz</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Low-pass filter frequency in feedback path (darkens repeats)</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label class="delay-pseudo-reverb-checkbox">
                        <input type="checkbox" id="delay-pseudo-reverb-cross-feedback" checked>
                        <span>Cross-Feedback</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Enable cross-feedback between delay lines for complex patterns</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Cross-Feedback Amount</span>
                        <input type="range" id="delay-pseudo-reverb-cross-feedback-amount" min="0" max="50" value="20" step="1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-cross-feedback-amount-value">0.20</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Amount of cross-feedback between delays</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label class="delay-pseudo-reverb-checkbox">
                        <input type="checkbox" id="delay-pseudo-reverb-cosmic-mode">
                        <span>Cosmic Mode 🌌</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Enable cosmic vibe: longer delays (150-200ms), ping-pong, higher feedback for atmospheric spatial effects</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label class="delay-pseudo-reverb-checkbox">
                        <input type="checkbox" id="delay-pseudo-reverb-ping-pong-delay">
                        <span>Ping-Pong Delay</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Left delay feeds right, right feeds left - creates spatial bouncing effect (auto-enabled in cosmic mode)</div>
                </div>
                
                <div class="delay-pseudo-reverb-setting">
                    <label>
                        <span>Ping-Pong Amount</span>
                        <input type="range" id="delay-pseudo-reverb-ping-pong-amount" min="0" max="50" value="30" step="1">
                        <span class="delay-pseudo-reverb-value" id="delay-pseudo-reverb-ping-pong-amount-value">0.30</span>
                    </label>
                    <div class="delay-pseudo-reverb-description">Amount of ping-pong feedback between left and right delays</div>
                </div>
                
                <div class="delay-pseudo-reverb-popup-footer">
                    <button class="delay-pseudo-reverb-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('delay-pseudo-reverb-styles')) {
        const style = document.createElement('style');
        style.id = 'delay-pseudo-reverb-styles';
        style.textContent = `
            .delay-pseudo-reverb-popup {
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
            .delay-pseudo-reverb-popup.active {
                display: flex;
            }
            .delay-pseudo-reverb-popup-content {
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
            .delay-pseudo-reverb-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .delay-pseudo-reverb-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .delay-pseudo-reverb-popup-close {
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
            .delay-pseudo-reverb-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .delay-pseudo-reverb-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .delay-pseudo-reverb-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .delay-pseudo-reverb-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .delay-pseudo-reverb-setting label span:first-child {
                min-width: 140px;
                font-weight: 500;
            }
            .delay-pseudo-reverb-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .delay-pseudo-reverb-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .delay-pseudo-reverb-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .delay-pseudo-reverb-value {
                min-width: 60px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .delay-pseudo-reverb-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 152px;
                line-height: 1.4;
            }
            .delay-pseudo-reverb-checkbox {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .delay-pseudo-reverb-checkbox input[type="checkbox"] {
                width: 16px;
                height: 16px;
                cursor: pointer;
            }
            .delay-pseudo-reverb-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .delay-pseudo-reverb-reset {
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
            .delay-pseudo-reverb-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for delay pseudo-reverb controls
 */
function setupDelayPseudoReverbControls() {
    const popup = document.getElementById('delay-pseudo-reverb-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.delay-pseudo-reverb-popup-close');
    const resetBtn = popup.querySelector('.delay-pseudo-reverb-reset');

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
            resetDelayPseudoReverbToDefaults();
        });
    }

    // Dry/Wet Mix
    const dryWetSlider = document.getElementById('delay-pseudo-reverb-dry-wet');
    const dryWetValue = document.getElementById('delay-pseudo-reverb-dry-wet-value');
    if (dryWetSlider && dryWetValue) {
        dryWetSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100;
            dryWetValue.textContent = value.toFixed(2);
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ dryWet: value });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Crossover Frequency
    const crossoverSlider = document.getElementById('delay-pseudo-reverb-crossover');
    const crossoverValue = document.getElementById('delay-pseudo-reverb-crossover-value');
    if (crossoverSlider && crossoverValue) {
        crossoverSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            crossoverValue.textContent = value + ' Hz';
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ crossoverFreq: value });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Left Delay
    const delayLeftSlider = document.getElementById('delay-pseudo-reverb-delay-left');
    const delayLeftValue = document.getElementById('delay-pseudo-reverb-delay-left-value');
    if (delayLeftSlider && delayLeftValue) {
        delayLeftSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            delayLeftValue.textContent = value + ' ms';
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ delayLeft: value / 1000 });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Right Delay
    const delayRightSlider = document.getElementById('delay-pseudo-reverb-delay-right');
    const delayRightValue = document.getElementById('delay-pseudo-reverb-delay-right-value');
    if (delayRightSlider && delayRightValue) {
        delayRightSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            delayRightValue.textContent = value + ' ms';
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ delayRight: value / 1000 });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Center Delay
    const delayCenterSlider = document.getElementById('delay-pseudo-reverb-delay-center');
    const delayCenterValue = document.getElementById('delay-pseudo-reverb-delay-center-value');
    if (delayCenterSlider && delayCenterValue) {
        delayCenterSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            delayCenterValue.textContent = value + ' ms';
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ delayCenter: value / 1000 });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Feedback Left
    const feedbackLeftSlider = document.getElementById('delay-pseudo-reverb-feedback-left');
    const feedbackLeftValue = document.getElementById('delay-pseudo-reverb-feedback-left-value');
    if (feedbackLeftSlider && feedbackLeftValue) {
        feedbackLeftSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100;
            feedbackLeftValue.textContent = value.toFixed(2);
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ feedbackLeft: value });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Feedback Right
    const feedbackRightSlider = document.getElementById('delay-pseudo-reverb-feedback-right');
    const feedbackRightValue = document.getElementById('delay-pseudo-reverb-feedback-right-value');
    if (feedbackRightSlider && feedbackRightValue) {
        feedbackRightSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100;
            feedbackRightValue.textContent = value.toFixed(2);
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ feedbackRight: value });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Modulation Left
    const modulationLeftSlider = document.getElementById('delay-pseudo-reverb-modulation-left');
    const modulationLeftValue = document.getElementById('delay-pseudo-reverb-modulation-left-value');
    if (modulationLeftSlider && modulationLeftValue) {
        modulationLeftSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            modulationLeftValue.textContent = value.toFixed(1) + ' ms';
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ modulationAmount: value / 1000 });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Modulation Right
    const modulationRightSlider = document.getElementById('delay-pseudo-reverb-modulation-right');
    const modulationRightValue = document.getElementById('delay-pseudo-reverb-modulation-right-value');
    if (modulationRightSlider && modulationRightValue) {
        modulationRightSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            modulationRightValue.textContent = value.toFixed(1) + ' ms';
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ modulationAmountRight: value / 1000 });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Feedback High-Pass
    const feedbackHPSlider = document.getElementById('delay-pseudo-reverb-feedback-hp');
    const feedbackHPValue = document.getElementById('delay-pseudo-reverb-feedback-hp-value');
    if (feedbackHPSlider && feedbackHPValue) {
        feedbackHPSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            feedbackHPValue.textContent = value + ' Hz';
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ feedbackHighpass: value });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Feedback Low-Pass
    const feedbackLPSlider = document.getElementById('delay-pseudo-reverb-feedback-lp');
    const feedbackLPValue = document.getElementById('delay-pseudo-reverb-feedback-lp-value');
    if (feedbackLPSlider && feedbackLPValue) {
        feedbackLPSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            feedbackLPValue.textContent = value + ' Hz';
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ feedbackLowpass: value });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Cross-Feedback
    const crossFeedbackCheckbox = document.getElementById('delay-pseudo-reverb-cross-feedback');
    if (crossFeedbackCheckbox) {
        crossFeedbackCheckbox.addEventListener('change', (e) => {
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ crossFeedback: e.target.checked });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Cross-Feedback Amount
    const crossFeedbackAmountSlider = document.getElementById('delay-pseudo-reverb-cross-feedback-amount');
    const crossFeedbackAmountValue = document.getElementById('delay-pseudo-reverb-cross-feedback-amount-value');
    if (crossFeedbackAmountSlider && crossFeedbackAmountValue) {
        crossFeedbackAmountSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100;
            crossFeedbackAmountValue.textContent = value.toFixed(2);
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ crossFeedbackAmount: value });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }

    // Cosmic Mode
    const cosmicModeCheckbox = document.getElementById('delay-pseudo-reverb-cosmic-mode');
    if (cosmicModeCheckbox) {
        cosmicModeCheckbox.addEventListener('change', (e) => {
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ cosmicMode: e.target.checked });
                // Auto-enable ping-pong in cosmic mode
                if (e.target.checked) {
                    const pingPongCheckbox = document.getElementById('delay-pseudo-reverb-ping-pong-delay');
                    if (pingPongCheckbox) {
                        pingPongCheckbox.checked = true;
                        if (window.setDelayPseudoReverbSettings) {
                            window.setDelayPseudoReverbSettings({ pingPongDelay: true });
                        }
                    }
                }
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
                // Reconnect audio chain to apply changes
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }

    // Ping-Pong Delay
    const pingPongDelayCheckbox = document.getElementById('delay-pseudo-reverb-ping-pong-delay');
    if (pingPongDelayCheckbox) {
        pingPongDelayCheckbox.addEventListener('change', (e) => {
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ pingPongDelay: e.target.checked });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
                // Reconnect audio chain to apply changes
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }

    // Ping-Pong Amount
    const pingPongAmountSlider = document.getElementById('delay-pseudo-reverb-ping-pong-amount');
    const pingPongAmountValue = document.getElementById('delay-pseudo-reverb-ping-pong-amount-value');
    if (pingPongAmountSlider && pingPongAmountValue) {
        pingPongAmountSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100;
            pingPongAmountValue.textContent = value.toFixed(2);
            if (window.setDelayPseudoReverbSettings) {
                window.setDelayPseudoReverbSettings({ pingPongAmount: value });
                if (window.updateDelayPseudoReverbSettings) {
                    window.updateDelayPseudoReverbSettings();
                }
            }
        });
    }
}

/**
 * Reset delay pseudo-reverb settings to defaults
 */
function resetDelayPseudoReverbToDefaults() {
    const defaults = {
        enabled: delayPseudoReverbSettings.enabled, // Preserve enabled state
        dryWet: 0.3,
        crossoverFreq: 300,
        delayLeft: 0.013,
        delayRight: 0.029,
        delayCenter: 0.003,
        feedbackLeft: 0.15,
        feedbackRight: 0.15,
        feedbackCenter: 0.1,
        modulationAmount: 0.001,
        modulationAmountRight: 0.002,
        feedbackHighpass: 500,
        feedbackLowpass: 8000,
        crossFeedback: true,
        crossFeedbackAmount: 0.2,
        cosmicMode: false,
        pingPongDelay: false,
        pingPongAmount: 0.3,
        longDelayLeft: 0.150,
        longDelayRight: 0.200,
        cosmicFeedback: 0.25
    };

    if (window.setDelayPseudoReverbSettings) {
        window.setDelayPseudoReverbSettings(defaults);
    }

    // Update UI sliders
    const dryWetSlider = document.getElementById('delay-pseudo-reverb-dry-wet');
    const crossoverSlider = document.getElementById('delay-pseudo-reverb-crossover');
    const delayLeftSlider = document.getElementById('delay-pseudo-reverb-delay-left');
    const delayRightSlider = document.getElementById('delay-pseudo-reverb-delay-right');
    const delayCenterSlider = document.getElementById('delay-pseudo-reverb-delay-center');
    const feedbackLeftSlider = document.getElementById('delay-pseudo-reverb-feedback-left');
    const feedbackRightSlider = document.getElementById('delay-pseudo-reverb-feedback-right');
    const modulationLeftSlider = document.getElementById('delay-pseudo-reverb-modulation-left');
    const modulationRightSlider = document.getElementById('delay-pseudo-reverb-modulation-right');
    const feedbackHPSlider = document.getElementById('delay-pseudo-reverb-feedback-hp');
    const feedbackLPSlider = document.getElementById('delay-pseudo-reverb-feedback-lp');
    const crossFeedbackCheckbox = document.getElementById('delay-pseudo-reverb-cross-feedback');
    const crossFeedbackAmountSlider = document.getElementById('delay-pseudo-reverb-cross-feedback-amount');
    const cosmicModeCheckbox = document.getElementById('delay-pseudo-reverb-cosmic-mode');
    const pingPongDelayCheckbox = document.getElementById('delay-pseudo-reverb-ping-pong-delay');
    const pingPongAmountSlider = document.getElementById('delay-pseudo-reverb-ping-pong-amount');

    if (dryWetSlider) dryWetSlider.value = 30;
    if (crossoverSlider) crossoverSlider.value = 300;
    if (delayLeftSlider) delayLeftSlider.value = 13;
    if (delayRightSlider) delayRightSlider.value = 29;
    if (delayCenterSlider) delayCenterSlider.value = 3;
    if (feedbackLeftSlider) feedbackLeftSlider.value = 15;
    if (feedbackRightSlider) feedbackRightSlider.value = 15;
    if (modulationLeftSlider) modulationLeftSlider.value = 1.0;
    if (modulationRightSlider) modulationRightSlider.value = 2.0;
    if (feedbackHPSlider) feedbackHPSlider.value = 500;
    if (feedbackLPSlider) feedbackLPSlider.value = 8000;
    if (crossFeedbackCheckbox) crossFeedbackCheckbox.checked = true;
    if (crossFeedbackAmountSlider) crossFeedbackAmountSlider.value = 20;
    if (cosmicModeCheckbox) cosmicModeCheckbox.checked = false;
    if (pingPongDelayCheckbox) pingPongDelayCheckbox.checked = false;
    if (pingPongAmountSlider) pingPongAmountSlider.value = 30;

    // Trigger input events to update value displays
    if (dryWetSlider) dryWetSlider.dispatchEvent(new Event('input'));
    if (crossoverSlider) crossoverSlider.dispatchEvent(new Event('input'));
    if (delayLeftSlider) delayLeftSlider.dispatchEvent(new Event('input'));
    if (delayRightSlider) delayRightSlider.dispatchEvent(new Event('input'));
    if (delayCenterSlider) delayCenterSlider.dispatchEvent(new Event('input'));
    if (feedbackLeftSlider) feedbackLeftSlider.dispatchEvent(new Event('input'));
    if (feedbackRightSlider) feedbackRightSlider.dispatchEvent(new Event('input'));
    if (modulationLeftSlider) modulationLeftSlider.dispatchEvent(new Event('input'));
    if (modulationRightSlider) modulationRightSlider.dispatchEvent(new Event('input'));
    if (feedbackHPSlider) feedbackHPSlider.dispatchEvent(new Event('input'));
    if (feedbackLPSlider) feedbackLPSlider.dispatchEvent(new Event('input'));
    if (crossFeedbackAmountSlider) crossFeedbackAmountSlider.dispatchEvent(new Event('input'));
}

/**
 * Open the delay pseudo-reverb settings popup
 */
function openDelayPseudoReverbSettings() {
    const popup = document.getElementById('delay-pseudo-reverb-popup');
    if (popup) {
        popup.classList.add('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.initDelayPseudoReverbSettings = initDelayPseudoReverbSettings;
    window.openDelayPseudoReverbSettings = openDelayPseudoReverbSettings;
    window.resetDelayPseudoReverbToDefaults = resetDelayPseudoReverbToDefaults;
}
