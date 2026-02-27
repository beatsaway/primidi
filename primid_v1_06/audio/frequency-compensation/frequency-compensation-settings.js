/**
 * Frequency Compensation Settings UI Module
 * Provides popup interface for adjusting frequency compensation parameters
 */

// Frequency compensation settings state
let frequencyCompensationSettings = {
    targetSPL: 85 // Target listening level in dB SPL (default 85) - controls equal-loudness contour compensation
};

/**
 * Initialize frequency compensation settings popup
 * Creates and manages the popup UI for frequency compensation adjustments
 */
function initFrequencyCompensationSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('frequency-compensation-popup');
    if (!popup) {
        popup = createFrequencyCompensationPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupFrequencyCompensationControls();
}

/**
 * Create the frequency compensation settings popup HTML
 */
function createFrequencyCompensationPopup() {
    const popup = document.createElement('div');
    popup.id = 'frequency-compensation-popup';
    popup.className = 'frequency-compensation-popup';
    popup.innerHTML = `
        <div class="frequency-compensation-popup-content">
            <div class="frequency-compensation-popup-header">
                <h2>Frequency Compensation Settings</h2>
                <button class="frequency-compensation-popup-close">×</button>
            </div>
            <div class="frequency-compensation-popup-body">
                <div class="frequency-compensation-setting">
                    <label>
                        <span>Target SPL (dB)</span>
                        <input type="range" id="frequency-compensation-spl" min="40" max="100" value="85" step="1">
                        <span class="frequency-compensation-value" id="frequency-compensation-spl-value">85 dB</span>
                    </label>
                    <div class="frequency-compensation-description">Target listening level for equal-loudness contour compensation (ISO 226). Lower values (40-60 dB) = more bass/treble boost needed for quiet listening. Higher values (85-100 dB) = minimal compensation for loud listening. Default: 85 dB</div>
                </div>
                
                <div class="frequency-compensation-info">
                    <h3>How It Works</h3>
                    <p>Human hearing sensitivity varies dramatically with frequency. At quiet listening levels, bass and treble frequencies need significant boost to sound equally loud as mid frequencies. At loud listening levels, the response is more flat.</p>
                    <p>This module applies ISO 226:2003-based compensation to make all piano notes (A0-C8) sound equally loud across the frequency range.</p>
                </div>
                
                <div class="frequency-compensation-popup-footer">
                    <button class="frequency-compensation-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('frequency-compensation-styles')) {
        const style = document.createElement('style');
        style.id = 'frequency-compensation-styles';
        style.textContent = `
            .frequency-compensation-popup {
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
            .frequency-compensation-popup.active {
                display: flex;
            }
            .frequency-compensation-popup-content {
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
            .frequency-compensation-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .frequency-compensation-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .frequency-compensation-popup-close {
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
            .frequency-compensation-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .frequency-compensation-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .frequency-compensation-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .frequency-compensation-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .frequency-compensation-setting label span:first-child {
                min-width: 140px;
                font-weight: 500;
            }
            .frequency-compensation-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .frequency-compensation-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .frequency-compensation-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .frequency-compensation-value {
                min-width: 60px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .frequency-compensation-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 152px;
                line-height: 1.4;
            }
            .frequency-compensation-info {
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                padding: 16px;
                margin-top: 10px;
            }
            .frequency-compensation-info h3 {
                margin: 0 0 12px 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 14px;
                color: #fff;
            }
            .frequency-compensation-info p {
                margin: 0 0 12px 0;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.7);
                line-height: 1.5;
            }
            .frequency-compensation-info p:last-child {
                margin-bottom: 0;
            }
            .frequency-compensation-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .frequency-compensation-reset {
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
            .frequency-compensation-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for frequency compensation controls
 */
function setupFrequencyCompensationControls() {
    const popup = document.getElementById('frequency-compensation-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.frequency-compensation-popup-close');
    const resetBtn = popup.querySelector('.frequency-compensation-reset');

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
            resetFrequencyCompensationToDefaults();
        });
    }

    // Target SPL
    const splSlider = document.getElementById('frequency-compensation-spl');
    const splValue = document.getElementById('frequency-compensation-spl-value');
    if (splSlider && splValue) {
        // Initialize with current settings
        const currentSPL = frequencyCompensationSettings.targetSPL;
        splSlider.value = Math.round(currentSPL);
        splValue.textContent = Math.round(currentSPL) + ' dB';
        
        splSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            splValue.textContent = Math.round(value) + ' dB';
            setFrequencyCompensationSettings({ targetSPL: value });
        });
    }
}

/**
 * Set frequency compensation settings
 * @param {Object} newSettings - Partial settings object to update
 */
function setFrequencyCompensationSettings(newSettings) {
    Object.assign(frequencyCompensationSettings, newSettings);
    
    // Update global settings object
    if (typeof window !== 'undefined') {
        window.frequencyCompensationSettings = frequencyCompensationSettings;
    }
}

/**
 * Get frequency compensation settings
 * @returns {Object} Current frequency compensation settings
 */
function getFrequencyCompensationSettings() {
    return { ...frequencyCompensationSettings };
}

/**
 * Reset frequency compensation settings to defaults
 */
function resetFrequencyCompensationToDefaults() {
    const defaults = {
        targetSPL: 85
    };

    setFrequencyCompensationSettings(defaults);

    // Update UI sliders
    const splSlider = document.getElementById('frequency-compensation-spl');
    const splValue = document.getElementById('frequency-compensation-spl-value');

    if (splSlider) splSlider.value = 85;
    if (splValue) splValue.textContent = '85 dB';
}

/**
 * Open the frequency compensation settings popup
 */
function openFrequencyCompensationSettings() {
    const popup = document.getElementById('frequency-compensation-popup');
    if (popup) {
        // Sync sliders with current settings
        const splSlider = document.getElementById('frequency-compensation-spl');
        const splValue = document.getElementById('frequency-compensation-spl-value');
        
        if (splSlider && splValue) {
            const currentSPL = frequencyCompensationSettings.targetSPL;
            splSlider.value = Math.round(currentSPL);
            splValue.textContent = Math.round(currentSPL) + ' dB';
        }
        
        popup.classList.add('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.frequencyCompensationSettings = frequencyCompensationSettings;
    window.initFrequencyCompensationSettings = initFrequencyCompensationSettings;
    window.openFrequencyCompensationSettings = openFrequencyCompensationSettings;
    window.setFrequencyCompensationSettings = setFrequencyCompensationSettings;
    window.getFrequencyCompensationSettings = getFrequencyCompensationSettings;
    window.resetFrequencyCompensationToDefaults = resetFrequencyCompensationToDefaults;
}

