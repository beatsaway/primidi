/**
 * Piano Envelope Model Settings Module
 * Provides UI for adjusting frequency-dependent decay times
 * Lower notes have longer decay times (exponential decay)
 */

// Settings object
const pianoEnvelopeModelSettings = {
    // Low notes (< 100 Hz) decay times
    lowFastDecay: 0.5,      // Initial fast decay phase (seconds)
    lowSlowDecay: 15.0,     // Slow decay phase (seconds)
    
    // Mid notes (100-400 Hz) decay times
    midFastDecay: 0.3,      // Initial fast decay phase (seconds)
    midSlowDecay: 8.0,      // Slow decay phase (seconds)
    
    // High notes (> 400 Hz) decay times
    highFastDecay: 0.1,     // Initial fast decay phase (seconds)
    highSlowDecay: 3.0,     // Slow decay phase (seconds)
    
    // Frequency scaling multiplier - exaggerates the difference between low and high notes
    // 1.0 = default, >1.0 = more exaggerated (lower notes decay even slower relative to high notes)
    frequencyScaling: 1.0
};

/**
 * Initialize piano envelope model settings UI
 */
function initPianoEnvelopeModelSettings() {
    // Settings are stored in the global object
    // UI will be added via popup
}

/**
 * Open piano envelope model settings popup
 */
function openPianoEnvelopeModelSettings() {
    // Create popup if it doesn't exist
    let popup = document.getElementById('piano-envelope-model-settings-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'piano-envelope-model-settings-popup';
        popup.className = 'piano-envelope-model-popup';
        popup.innerHTML = `
            <div class="piano-envelope-model-popup-content">
                <div class="piano-envelope-model-popup-header">
                    <h2>Piano Envelope Model Settings</h2>
                    <button class="piano-envelope-model-popup-close">×</button>
                </div>
                <div class="piano-envelope-model-popup-body">
                    <div class="piano-envelope-model-info">
                        <p style="margin: 0 0 20px 0; color: rgba(255, 255, 255, 0.7); font-size: 12px; line-height: 1.5;">
                            Lower notes have longer decay times than higher notes. Decay is <strong>exponential</strong> (e^(-t/τ)).
                            <br><br>
                            <strong>Fast Decay:</strong> Initial rapid volume drop (50% reduction)
                            <br><strong>Slow Decay:</strong> Gradual fade-out to silence
                        </p>
                    </div>
                    
                    <div class="piano-envelope-model-section">
                        <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 14px; font-weight: 600;">Low Notes (< 100 Hz)</h3>
                        <div class="piano-envelope-model-setting">
                            <label>
                                <span>Fast Decay</span>
                                <input type="range" id="piano-envelope-low-fast-decay" 
                                       min="0.1" max="2.0" step="0.1" value="${pianoEnvelopeModelSettings.lowFastDecay}">
                                <span class="piano-envelope-model-value" id="piano-envelope-low-fast-decay-value">${pianoEnvelopeModelSettings.lowFastDecay.toFixed(1)} s</span>
                            </label>
                        </div>
                        <div class="piano-envelope-model-setting">
                            <label>
                                <span>Slow Decay</span>
                                <input type="range" id="piano-envelope-low-slow-decay" 
                                       min="5" max="30" step="0.5" value="${pianoEnvelopeModelSettings.lowSlowDecay}">
                                <span class="piano-envelope-model-value" id="piano-envelope-low-slow-decay-value">${pianoEnvelopeModelSettings.lowSlowDecay.toFixed(1)} s</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="piano-envelope-model-section">
                        <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 14px; font-weight: 600;">Mid Notes (100-400 Hz)</h3>
                        <div class="piano-envelope-model-setting">
                            <label>
                                <span>Fast Decay</span>
                                <input type="range" id="piano-envelope-mid-fast-decay" 
                                       min="0.05" max="1.0" step="0.05" value="${pianoEnvelopeModelSettings.midFastDecay}">
                                <span class="piano-envelope-model-value" id="piano-envelope-mid-fast-decay-value">${pianoEnvelopeModelSettings.midFastDecay.toFixed(2)} s</span>
                            </label>
                        </div>
                        <div class="piano-envelope-model-setting">
                            <label>
                                <span>Slow Decay</span>
                                <input type="range" id="piano-envelope-mid-slow-decay" 
                                       min="3" max="15" step="0.5" value="${pianoEnvelopeModelSettings.midSlowDecay}">
                                <span class="piano-envelope-model-value" id="piano-envelope-mid-slow-decay-value">${pianoEnvelopeModelSettings.midSlowDecay.toFixed(1)} s</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="piano-envelope-model-section">
                        <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 14px; font-weight: 600;">High Notes (> 400 Hz)</h3>
                        <div class="piano-envelope-model-setting">
                            <label>
                                <span>Fast Decay</span>
                                <input type="range" id="piano-envelope-high-fast-decay" 
                                       min="0.05" max="0.5" step="0.05" value="${pianoEnvelopeModelSettings.highFastDecay}">
                                <span class="piano-envelope-model-value" id="piano-envelope-high-fast-decay-value">${pianoEnvelopeModelSettings.highFastDecay.toFixed(2)} s</span>
                            </label>
                        </div>
                        <div class="piano-envelope-model-setting">
                            <label>
                                <span>Slow Decay</span>
                                <input type="range" id="piano-envelope-high-slow-decay" 
                                       min="1" max="8" step="0.5" value="${pianoEnvelopeModelSettings.highSlowDecay}">
                                <span class="piano-envelope-model-value" id="piano-envelope-high-slow-decay-value">${pianoEnvelopeModelSettings.highSlowDecay.toFixed(1)} s</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="piano-envelope-model-section">
                        <h3 style="margin: 0 0 15px 0; color: #fff; font-size: 14px; font-weight: 600;">Frequency Scaling</h3>
                        <div class="piano-envelope-model-setting">
                            <label>
                                <span>Scaling Multiplier</span>
                                <input type="range" id="piano-envelope-frequency-scaling" 
                                       min="0.5" max="3.0" step="0.1" value="${pianoEnvelopeModelSettings.frequencyScaling}">
                                <span class="piano-envelope-model-value" id="piano-envelope-frequency-scaling-value">${pianoEnvelopeModelSettings.frequencyScaling.toFixed(1)}x</span>
                            </label>
                            <div class="piano-envelope-model-description">
                                Exaggerates the difference between low and high note decay times.
                                <br>1.0 = Default (low notes 5x longer than high notes)
                                <br>&gt;1.0 = More exaggerated (lower notes decay even slower)
                                <br>&lt;1.0 = Less difference (more uniform decay)
                            </div>
                        </div>
                    </div>
                    
                    <div class="piano-envelope-model-popup-footer">
                        <button class="piano-envelope-model-reset">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        
        // Add styles if not already added
        if (!document.getElementById('piano-envelope-model-styles')) {
            const style = document.createElement('style');
            style.id = 'piano-envelope-model-styles';
            style.textContent = `
                .piano-envelope-model-popup {
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
                .piano-envelope-model-popup.active {
                    display: flex;
                }
                .piano-envelope-model-popup-content {
                    background: rgba(30, 30, 45, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 650px;
                    width: 90%;
                    max-height: 85vh;
                    overflow-y: auto;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
                    position: relative;
                }
                .piano-envelope-model-popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .piano-envelope-model-popup-header h2 {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 18px;
                    color: #fff;
                }
                .piano-envelope-model-popup-close {
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
                .piano-envelope-model-popup-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .piano-envelope-model-popup-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .piano-envelope-model-info {
                    padding: 12px;
                    background: rgba(74, 158, 255, 0.1);
                    border: 1px solid rgba(74, 158, 255, 0.3);
                    border-radius: 6px;
                }
                .piano-envelope-model-section {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 8px;
                }
                .piano-envelope-model-setting {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .piano-envelope-model-setting label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                }
                .piano-envelope-model-setting label span:first-child {
                    min-width: 140px;
                    font-weight: 500;
                }
                .piano-envelope-model-setting input[type="range"] {
                    flex: 1;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                    -webkit-appearance: none;
                }
                .piano-envelope-model-setting input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .piano-envelope-model-setting input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
                .piano-envelope-model-value {
                    min-width: 70px;
                    text-align: right;
                    color: #4a9eff;
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                }
                .piano-envelope-model-description {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    font-family: 'Inter', sans-serif;
                    margin-left: 152px;
                    line-height: 1.4;
                }
                .piano-envelope-model-popup-footer {
                    margin-top: 10px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .piano-envelope-model-reset {
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
                .piano-envelope-model-reset:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Setup sliders
        setupPianoEnvelopeModelSliders();
        
        // Setup close button
        const closeBtn = popup.querySelector('.piano-envelope-model-popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closePianoEnvelopeModelSettings();
            });
        }
        
        // Close when clicking outside
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closePianoEnvelopeModelSettings();
            }
        });
        
        // Setup reset button
        const resetBtn = popup.querySelector('.piano-envelope-model-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                resetPianoEnvelopeModelSettings();
            });
        }
    }
    
    // Show popup
    popup.classList.add('active');
}

/**
 * Setup slider event listeners
 */
function setupPianoEnvelopeModelSliders() {
    // Low notes - fast decay
    const lowFastDecaySlider = document.getElementById('piano-envelope-low-fast-decay');
    const lowFastDecayValue = document.getElementById('piano-envelope-low-fast-decay-value');
    if (lowFastDecaySlider && lowFastDecayValue) {
        lowFastDecaySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pianoEnvelopeModelSettings.lowFastDecay = value;
            lowFastDecayValue.textContent = value.toFixed(1) + ' s';
        });
    }
    
    // Low notes - slow decay
    const lowSlowDecaySlider = document.getElementById('piano-envelope-low-slow-decay');
    const lowSlowDecayValue = document.getElementById('piano-envelope-low-slow-decay-value');
    if (lowSlowDecaySlider && lowSlowDecayValue) {
        lowSlowDecaySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pianoEnvelopeModelSettings.lowSlowDecay = value;
            lowSlowDecayValue.textContent = value.toFixed(1) + ' s';
        });
    }
    
    // Mid notes - fast decay
    const midFastDecaySlider = document.getElementById('piano-envelope-mid-fast-decay');
    const midFastDecayValue = document.getElementById('piano-envelope-mid-fast-decay-value');
    if (midFastDecaySlider && midFastDecayValue) {
        midFastDecaySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pianoEnvelopeModelSettings.midFastDecay = value;
            midFastDecayValue.textContent = value.toFixed(2) + ' s';
        });
    }
    
    // Mid notes - slow decay
    const midSlowDecaySlider = document.getElementById('piano-envelope-mid-slow-decay');
    const midSlowDecayValue = document.getElementById('piano-envelope-mid-slow-decay-value');
    if (midSlowDecaySlider && midSlowDecayValue) {
        midSlowDecaySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pianoEnvelopeModelSettings.midSlowDecay = value;
            midSlowDecayValue.textContent = value.toFixed(1) + ' s';
        });
    }
    
    // High notes - fast decay
    const highFastDecaySlider = document.getElementById('piano-envelope-high-fast-decay');
    const highFastDecayValue = document.getElementById('piano-envelope-high-fast-decay-value');
    if (highFastDecaySlider && highFastDecayValue) {
        highFastDecaySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pianoEnvelopeModelSettings.highFastDecay = value;
            highFastDecayValue.textContent = value.toFixed(2) + ' s';
        });
    }
    
    // High notes - slow decay
    const highSlowDecaySlider = document.getElementById('piano-envelope-high-slow-decay');
    const highSlowDecayValue = document.getElementById('piano-envelope-high-slow-decay-value');
    if (highSlowDecaySlider && highSlowDecayValue) {
        highSlowDecaySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pianoEnvelopeModelSettings.highSlowDecay = value;
            highSlowDecayValue.textContent = value.toFixed(1) + ' s';
        });
    }
    
    // Frequency scaling
    const frequencyScalingSlider = document.getElementById('piano-envelope-frequency-scaling');
    const frequencyScalingValue = document.getElementById('piano-envelope-frequency-scaling-value');
    if (frequencyScalingSlider && frequencyScalingValue) {
        frequencyScalingSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            pianoEnvelopeModelSettings.frequencyScaling = value;
            frequencyScalingValue.textContent = value.toFixed(1) + 'x';
        });
    }
}

/**
 * Reset settings to defaults
 */
function resetPianoEnvelopeModelSettings() {
    pianoEnvelopeModelSettings.lowFastDecay = 0.5;
    pianoEnvelopeModelSettings.lowSlowDecay = 15.0;
    pianoEnvelopeModelSettings.midFastDecay = 0.3;
    pianoEnvelopeModelSettings.midSlowDecay = 8.0;
    pianoEnvelopeModelSettings.highFastDecay = 0.1;
    pianoEnvelopeModelSettings.highSlowDecay = 3.0;
    pianoEnvelopeModelSettings.frequencyScaling = 1.0;
    
    // Update UI
    const popup = document.getElementById('piano-envelope-model-settings-popup');
    if (popup) {
        // Recreate popup to refresh values
        popup.remove();
        openPianoEnvelopeModelSettings();
    }
}

/**
 * Close piano envelope model settings popup
 */
function closePianoEnvelopeModelSettings() {
    const popup = document.getElementById('piano-envelope-model-settings-popup');
    if (popup) {
        popup.classList.remove('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.pianoEnvelopeModelSettings = pianoEnvelopeModelSettings;
    window.initPianoEnvelopeModelSettings = initPianoEnvelopeModelSettings;
    window.openPianoEnvelopeModelSettings = openPianoEnvelopeModelSettings;
    window.closePianoEnvelopeModelSettings = closePianoEnvelopeModelSettings;
}
