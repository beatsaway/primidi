/**
 * Chorus/Ping-Pong Settings Module
 * Provides UI for adjusting chorus effect strength and parameters
 */

// Settings are already in tremolo.js as chorusSettings
// This module just provides the UI

/**
 * Initialize chorus settings UI
 */
function initChorusSettings() {
    // Settings are stored in the global chorusSettings object
    // UI will be added to physics settings panel
}

/**
 * Open chorus settings popup
 */
function openChorusSettings() {
    // Get settings from tremolo module
    const settings = window.chorusSettings || window.tremoloSettings;
    if (!settings) {
        console.warn('Chorus settings not available');
        return;
    }
    
    // Create popup if it doesn't exist
    let popup = document.getElementById('chorus-settings-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'chorus-settings-popup';
        popup.className = 'chorus-settings-popup';
        popup.innerHTML = `
            <div class="chorus-settings-popup-content">
                <div class="chorus-settings-popup-header">
                    <h2>Chorus/Ping-Pong Settings</h2>
                    <button class="chorus-settings-popup-close">×</button>
                </div>
                <div class="chorus-settings-popup-body">
                    <div class="chorus-settings-setting">
                        <label>
                            <span>Effect Strength</span>
                            <input type="range" id="chorus-strength" 
                                   min="0" max="2" step="0.1" value="1.0">
                            <span class="chorus-settings-value" id="chorus-strength-value">1.0</span>
                        </label>
                        <div class="chorus-settings-description">
                            Overall strength of the chorus/ping-pong effect.
                            <br>0.0 = No effect (disabled)
                            <br>1.0 = Normal strength (default)
                            <br>2.0 = Strong effect (more pronounced movement)
                        </div>
                    </div>
                    
                    <div class="chorus-settings-setting">
                        <label>
                            <span>Chorus Rate (Hz)</span>
                            <input type="range" id="chorus-rate" 
                                   min="0.1" max="2.0" step="0.1" value="${settings.rate}">
                            <span class="chorus-settings-value" id="chorus-rate-value">${settings.rate.toFixed(1)} Hz</span>
                        </label>
                        <div class="chorus-settings-description">
                            Speed of the chorus modulation (LFO rate). Lower values = slower, more subtle movement. Higher values = faster, more noticeable modulation.
                        </div>
                    </div>
                    
                    <div class="chorus-settings-setting">
                        <label>
                            <span>Ping-Pong Rate (Hz)</span>
                            <input type="range" id="chorus-ping-pong-rate" 
                                   min="0.1" max="2.0" step="0.1" value="${settings.pingPongRate}">
                            <span class="chorus-settings-value" id="chorus-ping-pong-rate-value">${settings.pingPongRate.toFixed(1)} Hz</span>
                        </label>
                        <div class="chorus-settings-description">
                            Speed of the ping-pong stereo panning. Lower values = slower left-right movement. Higher values = faster panning.
                        </div>
                    </div>
                    
                    <div class="chorus-settings-setting">
                        <label>
                            <span>Ping-Pong Depth</span>
                            <input type="range" id="chorus-ping-pong-depth" 
                                   min="0" max="1" step="0.1" value="${settings.pingPongDepth}">
                            <span class="chorus-settings-value" id="chorus-ping-pong-depth-value">${(settings.pingPongDepth * 100).toFixed(0)}%</span>
                        </label>
                        <div class="chorus-settings-description">
                            How much left-right movement in the ping-pong effect. 0% = no panning, 100% = full stereo movement.
                        </div>
                    </div>
                    
                    <div class="chorus-settings-setting">
                        <label>
                            <span>Wet Level</span>
                            <input type="range" id="chorus-wet-level" 
                                   min="0" max="100" step="1" value="${(settings.wetLevel * 100).toFixed(0)}">
                            <span class="chorus-settings-value" id="chorus-wet-level-value">${(settings.wetLevel * 100).toFixed(0)}%</span>
                        </label>
                        <div class="chorus-settings-description">
                            Amount of processed (chorus) signal in the mix. Higher values = more effect, lower values = more dry signal.
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        
        // Add styles if not already added
        if (!document.getElementById('chorus-settings-styles')) {
            const style = document.createElement('style');
            style.id = 'chorus-settings-styles';
            style.textContent = `
                .chorus-settings-popup {
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
                .chorus-settings-popup.active {
                    display: flex;
                }
                .chorus-settings-popup-content {
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
                .chorus-settings-popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .chorus-settings-popup-header h2 {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 18px;
                    color: #fff;
                }
                .chorus-settings-popup-close {
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
                .chorus-settings-popup-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .chorus-settings-popup-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .chorus-settings-setting {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .chorus-settings-setting label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                }
                .chorus-settings-setting label span:first-child {
                    min-width: 140px;
                    font-weight: 500;
                }
                .chorus-settings-setting input[type="range"] {
                    flex: 1;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                    -webkit-appearance: none;
                }
                .chorus-settings-setting input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .chorus-settings-setting input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
                .chorus-settings-value {
                    min-width: 60px;
                    text-align: right;
                    color: #4a9eff;
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                }
                .chorus-settings-description {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    font-family: 'Inter', sans-serif;
                    margin-left: 152px;
                    line-height: 1.4;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Setup sliders
        const strengthSlider = document.getElementById('chorus-strength');
        const strengthValue = document.getElementById('chorus-strength-value');
        const rateSlider = document.getElementById('chorus-rate');
        const rateValue = document.getElementById('chorus-rate-value');
        const pingPongRateSlider = document.getElementById('chorus-ping-pong-rate');
        const pingPongRateValue = document.getElementById('chorus-ping-pong-rate-value');
        const pingPongDepthSlider = document.getElementById('chorus-ping-pong-depth');
        const pingPongDepthValue = document.getElementById('chorus-ping-pong-depth-value');
        const wetLevelSlider = document.getElementById('chorus-wet-level');
        const wetLevelValue = document.getElementById('chorus-wet-level-value');
        
        // Strength slider (main control)
        if (strengthSlider && strengthValue) {
            // Initialize strength if not set
            if (!settings.strength) {
                settings.strength = 1.0;
            }
            strengthSlider.value = settings.strength;
            strengthValue.textContent = settings.strength.toFixed(1);
            
            strengthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (settings) {
                    settings.strength = value;
                }
                strengthValue.textContent = value.toFixed(1);
                
                // Rebuild chorus chain to apply strength
                if (window.setupChorusChain) {
                    window.setupChorusChain();
                }
                // Also reconnect audio chain to apply changes
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            });
        }
        
        // Rate slider
        if (rateSlider && rateValue) {
            rateSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (settings) settings.rate = value;
                rateValue.textContent = value.toFixed(1) + ' Hz';
                if (window.setupChorusChain) {
                    window.setupChorusChain();
                }
            });
        }
        
        // Ping-pong rate slider
        if (pingPongRateSlider && pingPongRateValue) {
            pingPongRateSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (settings) settings.pingPongRate = value;
                pingPongRateValue.textContent = value.toFixed(1) + ' Hz';
                if (window.setupChorusChain) {
                    window.setupChorusChain();
                }
            });
        }
        
        // Ping-pong depth slider
        if (pingPongDepthSlider && pingPongDepthValue) {
            pingPongDepthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (settings) settings.pingPongDepth = value;
                pingPongDepthValue.textContent = (value * 100).toFixed(0) + '%';
                if (window.setupChorusChain) {
                    window.setupChorusChain();
                }
            });
        }
        
        // Wet level slider
        if (wetLevelSlider && wetLevelValue) {
            wetLevelSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value) / 100;
                if (settings) settings.wetLevel = value;
                wetLevelValue.textContent = (value * 100).toFixed(0) + '%';
                if (window.setupChorusChain) {
                    window.setupChorusChain();
                }
            });
        }
        
        // Setup close button
        const closeBtn = popup.querySelector('.chorus-settings-popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeChorusSettings();
            });
        }
        
        // Close when clicking outside
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closeChorusSettings();
            }
        });
    }
    
    // Show popup
    popup.classList.add('active');
}

/**
 * Close chorus settings popup
 */
function closeChorusSettings() {
    const popup = document.getElementById('chorus-settings-popup');
    if (popup) {
        popup.classList.remove('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.initChorusSettings = initChorusSettings;
    window.openChorusSettings = openChorusSettings;
    window.closeChorusSettings = closeChorusSettings;
}
