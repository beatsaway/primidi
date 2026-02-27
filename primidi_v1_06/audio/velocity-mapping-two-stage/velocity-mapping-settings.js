/**
 * Velocity Mapping Settings UI Module
 * Provides popup interface for adjusting velocity mapping parameters
 */

// Velocity mapping settings state
let velocityMappingSettings = {
    velocityExponent: 2.0, // k value (1.5-2.5, default 2.0) - controls velocity curve "feel"
    targetSPL: 85 // Target listening level in dB SPL (default 85) - controls frequency compensation
};

/**
 * Initialize velocity mapping settings popup
 * Creates and manages the popup UI for velocity mapping adjustments
 */
function initVelocityMappingSettings() {
    // Create popup modal if it doesn't exist
    let popup = document.getElementById('velocity-mapping-popup');
    if (!popup) {
        popup = createVelocityMappingPopup();
        document.body.appendChild(popup);
    }

    // Setup event listeners
    setupVelocityMappingControls();
}

/**
 * Create the velocity mapping settings popup HTML
 */
function createVelocityMappingPopup() {
    const popup = document.createElement('div');
    popup.id = 'velocity-mapping-popup';
    popup.className = 'velocity-mapping-popup';
    popup.innerHTML = `
        <div class="velocity-mapping-popup-content">
            <div class="velocity-mapping-popup-header">
                <h2>Velocity Mapping Settings</h2>
                <button class="velocity-mapping-popup-close">×</button>
            </div>
            <div class="velocity-mapping-popup-body">
                <div class="velocity-mapping-setting">
                    <label>
                        <span>Velocity Exponent (k)</span>
                        <input type="range" id="velocity-mapping-exponent" min="150" max="250" value="200" step="1">
                        <span class="velocity-mapping-value" id="velocity-mapping-exponent-value">2.00</span>
                    </label>
                    <div class="velocity-mapping-description">Controls the "feel" of velocity response. Lower values (1.5-1.8) = more sensitive, higher values (2.2-2.5) = less sensitive. Default: 2.0</div>
                </div>
                
                <div class="velocity-mapping-setting">
                    <label>
                        <span>Target SPL (dB)</span>
                        <input type="range" id="velocity-mapping-spl" min="40" max="100" value="85" step="1">
                        <span class="velocity-mapping-value" id="velocity-mapping-spl-value">85 dB</span>
                    </label>
                    <div class="velocity-mapping-description">Target listening level for frequency compensation (equal-loudness contours). Lower values = more bass/treble boost needed. Default: 85 dB</div>
                </div>
                
                <div class="velocity-mapping-popup-footer">
                    <button class="velocity-mapping-reset">Reset to Defaults</button>
                </div>
            </div>
        </div>
    `;
    
    // Add styles
    if (!document.getElementById('velocity-mapping-styles')) {
        const style = document.createElement('style');
        style.id = 'velocity-mapping-styles';
        style.textContent = `
            .velocity-mapping-popup {
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
            .velocity-mapping-popup.active {
                display: flex;
            }
            .velocity-mapping-popup-content {
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
            .velocity-mapping-popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .velocity-mapping-popup-header h2 {
                margin: 0;
                font-family: 'Inter', sans-serif;
                font-weight: 600;
                font-size: 18px;
                color: #fff;
            }
            .velocity-mapping-popup-close {
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
            .velocity-mapping-popup-close:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            .velocity-mapping-popup-body {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .velocity-mapping-setting {
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .velocity-mapping-setting label {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #fff;
                font-family: 'Inter', sans-serif;
                font-size: 13px;
            }
            .velocity-mapping-setting label span:first-child {
                min-width: 140px;
                font-weight: 500;
            }
            .velocity-mapping-setting input[type="range"] {
                flex: 1;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                outline: none;
                -webkit-appearance: none;
            }
            .velocity-mapping-setting input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
            }
            .velocity-mapping-setting input[type="range"]::-moz-range-thumb {
                width: 16px;
                height: 16px;
                background: #4a9eff;
                border-radius: 50%;
                cursor: pointer;
                border: none;
            }
            .velocity-mapping-value {
                min-width: 60px;
                text-align: right;
                color: #4a9eff;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 500;
            }
            .velocity-mapping-description {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
                font-family: 'Inter', sans-serif;
                margin-left: 152px;
                line-height: 1.4;
            }
            .velocity-mapping-popup-footer {
                margin-top: 10px;
                padding-top: 20px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            .velocity-mapping-reset {
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
            .velocity-mapping-reset:hover {
                background: rgba(255, 255, 255, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
    
    return popup;
}

/**
 * Setup event listeners for velocity mapping controls
 */
function setupVelocityMappingControls() {
    const popup = document.getElementById('velocity-mapping-popup');
    if (!popup) return;

    const closeBtn = popup.querySelector('.velocity-mapping-popup-close');
    const resetBtn = popup.querySelector('.velocity-mapping-reset');

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
            resetVelocityMappingToDefaults();
        });
    }

    // Velocity Exponent (k)
    const exponentSlider = document.getElementById('velocity-mapping-exponent');
    const exponentValue = document.getElementById('velocity-mapping-exponent-value');
    if (exponentSlider && exponentValue) {
        // Initialize with current settings
        const currentK = velocityMappingSettings.velocityExponent;
        exponentSlider.value = Math.round(currentK * 100); // Convert to 150-250 range
        exponentValue.textContent = currentK.toFixed(2);
        
        exponentSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 100; // Convert back to 1.5-2.5 range
            exponentValue.textContent = value.toFixed(2);
            setVelocityMappingSettings({ velocityExponent: value });
        });
    }

    // Target SPL
    const splSlider = document.getElementById('velocity-mapping-spl');
    const splValue = document.getElementById('velocity-mapping-spl-value');
    if (splSlider && splValue) {
        // Initialize with current settings
        const currentSPL = velocityMappingSettings.targetSPL;
        splSlider.value = Math.round(currentSPL);
        splValue.textContent = Math.round(currentSPL) + ' dB';
        
        splSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            splValue.textContent = Math.round(value) + ' dB';
            setVelocityMappingSettings({ targetSPL: value });
        });
    }
}

/**
 * Set velocity mapping settings
 * @param {Object} newSettings - Partial settings object to update
 */
function setVelocityMappingSettings(newSettings) {
    Object.assign(velocityMappingSettings, newSettings);
    
    // Update global settings object
    if (typeof window !== 'undefined') {
        window.velocityMappingSettings = velocityMappingSettings;
    }
}

/**
 * Get velocity mapping settings
 * @returns {Object} Current velocity mapping settings
 */
function getVelocityMappingSettings() {
    return { ...velocityMappingSettings };
}

/**
 * Reset velocity mapping settings to defaults
 */
function resetVelocityMappingToDefaults() {
    const defaults = {
        velocityExponent: 2.0,
        targetSPL: 85
    };

    setVelocityMappingSettings(defaults);

    // Update UI sliders
    const exponentSlider = document.getElementById('velocity-mapping-exponent');
    const exponentValue = document.getElementById('velocity-mapping-exponent-value');
    const splSlider = document.getElementById('velocity-mapping-spl');
    const splValue = document.getElementById('velocity-mapping-spl-value');

    if (exponentSlider) exponentSlider.value = 200; // 2.0 * 100
    if (exponentValue) exponentValue.textContent = '2.00';
    if (splSlider) splSlider.value = 85;
    if (splValue) splValue.textContent = '85 dB';
}

/**
 * Open the velocity mapping settings popup
 */
function openVelocityMappingSettings() {
    const popup = document.getElementById('velocity-mapping-popup');
    if (popup) {
        // Sync sliders with current settings
        const exponentSlider = document.getElementById('velocity-mapping-exponent');
        const exponentValue = document.getElementById('velocity-mapping-exponent-value');
        const splSlider = document.getElementById('velocity-mapping-spl');
        const splValue = document.getElementById('velocity-mapping-spl-value');
        
        if (exponentSlider && exponentValue) {
            const currentK = velocityMappingSettings.velocityExponent;
            exponentSlider.value = Math.round(currentK * 100);
            exponentValue.textContent = currentK.toFixed(2);
        }
        
        if (splSlider && splValue) {
            const currentSPL = velocityMappingSettings.targetSPL;
            splSlider.value = Math.round(currentSPL);
            splValue.textContent = Math.round(currentSPL) + ' dB';
        }
        
        popup.classList.add('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.velocityMappingSettings = velocityMappingSettings;
    window.initVelocityMappingSettings = initVelocityMappingSettings;
    window.openVelocityMappingSettings = openVelocityMappingSettings;
    window.setVelocityMappingSettings = setVelocityMappingSettings;
    window.getVelocityMappingSettings = getVelocityMappingSettings;
    window.resetVelocityMappingToDefaults = resetVelocityMappingToDefaults;
}

