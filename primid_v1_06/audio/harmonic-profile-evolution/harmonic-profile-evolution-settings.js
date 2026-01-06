/**
 * Harmonic Profile Evolution Settings Module
 * Provides UI for adjusting harmonic evolution strength
 */

// Settings object
const harmonicProfileEvolutionSettings = {
    strength: 1.0  // Strength multiplier (0.0 = no evolution, 1.0 = full strength, >1.0 = stronger)
};

/**
 * Initialize harmonic profile evolution settings UI
 */
function initHarmonicProfileEvolutionSettings() {
    // Settings are stored in the global object
    // UI will be added to physics settings panel
}

/**
 * Open harmonic profile evolution settings popup
 */
function openHarmonicProfileEvolutionSettings() {
    // Create popup if it doesn't exist
    let popup = document.getElementById('harmonic-profile-evolution-settings-popup');
    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'harmonic-profile-evolution-settings-popup';
        popup.className = 'harmonic-profile-evolution-popup';
        popup.innerHTML = `
            <div class="harmonic-profile-evolution-popup-content">
                <div class="harmonic-profile-evolution-popup-header">
                    <h2>Harmonic Profile Evolution Settings</h2>
                    <button class="harmonic-profile-evolution-popup-close">×</button>
                </div>
                <div class="harmonic-profile-evolution-popup-body">
                    <div class="harmonic-profile-evolution-setting">
                        <label>
                            <span>Evolution Strength</span>
                            <input type="range" id="harmonic-evolution-strength" 
                                   min="0" max="2" step="0.1" value="${harmonicProfileEvolutionSettings.strength}">
                            <span class="harmonic-profile-evolution-value" id="harmonic-evolution-strength-value">${harmonicProfileEvolutionSettings.strength.toFixed(1)}</span>
                        </label>
                        <div class="harmonic-profile-evolution-description">
                            Controls how strongly higher harmonics decay faster than lower harmonics.
                            <br>0.0 = No evolution (all harmonics decay equally)
                            <br>1.0 = Normal evolution (default)
                            <br>2.0 = Strong evolution (high harmonics decay much faster)
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        
        // Add styles if not already added
        if (!document.getElementById('harmonic-profile-evolution-styles')) {
            const style = document.createElement('style');
            style.id = 'harmonic-profile-evolution-styles';
            style.textContent = `
                .harmonic-profile-evolution-popup {
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
                .harmonic-profile-evolution-popup.active {
                    display: flex;
                }
                .harmonic-profile-evolution-popup-content {
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
                .harmonic-profile-evolution-popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .harmonic-profile-evolution-popup-header h2 {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 18px;
                    color: #fff;
                }
                .harmonic-profile-evolution-popup-close {
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
                .harmonic-profile-evolution-popup-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .harmonic-profile-evolution-popup-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .harmonic-profile-evolution-setting {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .harmonic-profile-evolution-setting label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                }
                .harmonic-profile-evolution-setting label span:first-child {
                    min-width: 140px;
                    font-weight: 500;
                }
                .harmonic-profile-evolution-setting input[type="range"] {
                    flex: 1;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                    -webkit-appearance: none;
                }
                .harmonic-profile-evolution-setting input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .harmonic-profile-evolution-setting input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #4a9eff;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
                .harmonic-profile-evolution-value {
                    min-width: 60px;
                    text-align: right;
                    color: #4a9eff;
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                }
                .harmonic-profile-evolution-description {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    font-family: 'Inter', sans-serif;
                    margin-left: 152px;
                    line-height: 1.4;
                }
            `;
            document.head.appendChild(style);
        }
        
        // Setup slider
        const strengthSlider = document.getElementById('harmonic-evolution-strength');
        const strengthValue = document.getElementById('harmonic-evolution-strength-value');
        
        if (strengthSlider && strengthValue) {
            strengthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                harmonicProfileEvolutionSettings.strength = value;
                strengthValue.textContent = value.toFixed(1);
            });
        }
        
        // Setup close button
        const closeBtn = popup.querySelector('.harmonic-profile-evolution-popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeHarmonicProfileEvolutionSettings();
            });
        }
        
        // Close when clicking outside
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closeHarmonicProfileEvolutionSettings();
            }
        });
    }
    
    // Show popup
    popup.classList.add('active');
}

/**
 * Close harmonic profile evolution settings popup
 */
function closeHarmonicProfileEvolutionSettings() {
    const popup = document.getElementById('harmonic-profile-evolution-settings-popup');
    if (popup) {
        popup.classList.remove('active');
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.harmonicProfileEvolutionSettings = harmonicProfileEvolutionSettings;
    window.initHarmonicProfileEvolutionSettings = initHarmonicProfileEvolutionSettings;
    window.openHarmonicProfileEvolutionSettings = openHarmonicProfileEvolutionSettings;
    window.closeHarmonicProfileEvolutionSettings = closeHarmonicProfileEvolutionSettings;
}
