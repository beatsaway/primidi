/**
 * Keyboard Visual Settings Module
 * Manages the settings UI for keyboard visual effects
 */

(function() {
    'use strict';
    
    let settingsModal = null;
    let settingsPanel = null;
    
    /**
     * Initialize the keyboard visual settings UI
     */
    window.initKeyboardVisualSettings = function() {
        // Create modal and panel if they don't exist
        if (!document.getElementById('keyboard-visual-modal')) {
            createSettingsUI();
        }
        
        setupEventListeners();
        updateUI();
        
        // Initialize sub-popups
        initKeyMovementSettings();
        initKeyLabelsSettings();
    };
    
    /**
     * Create the settings UI elements
     */
    function createSettingsUI() {
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'keyboard-visual-modal';
        modal.className = 'keyboard-visual-modal';
        modal.style.display = 'none';
        
        // Create panel
        const panel = document.createElement('div');
        panel.id = 'keyboard-visual-panel';
        panel.className = 'keyboard-visual-panel';
        
        panel.innerHTML = `
            <button class="keyboard-visual-close" id="keyboard-visual-close">×</button>
            <h2>🎹 Keyboard Visual Settings</h2>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-key-highlight">
                    <div>
                        <strong>Highlight on Press</strong>
                        <div class="setting-description">
                            Highlight keys when pressed for visual feedback.
                        </div>
                    </div>
                </label>
            </div>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-key-movement" checked>
                    <div>
                        <strong>Key Up/Down Movement</strong>
                        <button class="keyboard-visual-settings-btn" id="key-movement-settings-btn">[...]</button>
                        <div class="setting-description">
                            Move keys down when pressed, up when released.
                        </div>
                    </div>
                </label>
            </div>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-key-labels">
                    <div>
                        <strong>Key Labels</strong>
                        <button class="keyboard-visual-settings-btn" id="key-labels-settings-btn">[...]</button>
                        <div class="setting-description">
                            Show note names on keys (A0, C4, etc.).
                        </div>
                    </div>
                </label>
            </div>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-midi-input" checked>
                    <div>
                        <strong>MIDI Input</strong>
                        <div class="setting-description">
                            Enable/disable MIDI controller input. When disabled, MIDI controllers won't trigger notes.
                        </div>
                    </div>
                </label>
            </div>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-keypress-input" checked>
                    <div>
                        <strong>Keyboard Input</strong>
                        <div class="setting-description">
                            Play piano with computer keyboard: a,w,s,e,d,f,t,g,y,h,u,j,k,o,l (C3-D4). Use &lt; and &gt; to shift octave (A0-C8 range).
                        </div>
                    </div>
                </label>
            </div>
            
            <div class="keyboard-visual-setting-item">
                <label>
                    <input type="checkbox" id="enable-midi-debug">
                    <div>
                        <strong>MIDI Debug Display</strong>
                        <div class="setting-description">
                            Show real-time MIDI note number and velocity values when keys are pressed. Useful for debugging MIDI input.
                        </div>
                    </div>
                </label>
            </div>
        `;
        
        modal.appendChild(panel);
        document.body.appendChild(modal);
        
        settingsModal = modal;
        settingsPanel = panel;
    }
    
    /**
     * Setup event listeners
     */
    function setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('keyboard-visual-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (settingsModal) {
                    settingsModal.style.display = 'none';
                    settingsModal.classList.remove('active');
                }
            });
        }
        
        // Close on modal background click
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.style.display = 'none';
                    settingsModal.classList.remove('active');
                }
            });
        }
        
        // Key highlight toggle
        const highlightCheckbox = document.getElementById('enable-key-highlight');
        if (highlightCheckbox) {
            highlightCheckbox.addEventListener('change', (e) => {
                window.keyHighlightSettings.enabled = e.target.checked;
                updateUI();
            });
        }
        
        // Key movement toggle
        const movementCheckbox = document.getElementById('enable-key-movement');
        if (movementCheckbox) {
            movementCheckbox.addEventListener('change', (e) => {
                window.keyMovementSettings.enabled = e.target.checked;
                updateUI();
            });
        }
        
        // Key movement settings button
        const movementSettingsBtn = document.getElementById('key-movement-settings-btn');
        if (movementSettingsBtn) {
            movementSettingsBtn.addEventListener('click', () => {
                openKeyMovementSettings();
            });
        }
        
        // Key labels toggle
        const labelsCheckbox = document.getElementById('enable-key-labels');
        if (labelsCheckbox) {
            labelsCheckbox.addEventListener('change', (e) => {
                window.keyLabelSettings.enabled = e.target.checked;
                if (window.updateAllKeyLabels) {
                    window.updateAllKeyLabels();
                }
                updateUI();
            });
        }
        
        // Key labels settings button
        const labelsSettingsBtn = document.getElementById('key-labels-settings-btn');
        if (labelsSettingsBtn) {
            labelsSettingsBtn.addEventListener('click', () => {
                openKeyLabelsSettings();
            });
        }
        
        // MIDI input toggle
        const midiInputCheckbox = document.getElementById('enable-midi-input');
        if (midiInputCheckbox) {
            midiInputCheckbox.addEventListener('change', (e) => {
                if (window.enableMidiInput && window.disableMidiInput) {
                    if (e.target.checked) {
                        window.enableMidiInput();
                    } else {
                        window.disableMidiInput();
                    }
                }
                updateUI();
            });
        }
        
        // Keypress input toggle
        const keypressInputCheckbox = document.getElementById('enable-keypress-input');
        if (keypressInputCheckbox) {
            keypressInputCheckbox.addEventListener('change', (e) => {
                if (window.enableKeypressInput && window.disableKeypressInput) {
                    if (e.target.checked) {
                        window.enableKeypressInput();
                    } else {
                        window.disableKeypressInput();
                    }
                }
                updateUI();
            });
        }
        
        // MIDI debug toggle
        const midiDebugCheckbox = document.getElementById('enable-midi-debug');
        if (midiDebugCheckbox) {
            midiDebugCheckbox.addEventListener('change', (e) => {
                window.midiDebugSettings = window.midiDebugSettings || {};
                window.midiDebugSettings.enabled = e.target.checked;
                if (!e.target.checked) {
                    // Clear debug display when disabled
                    clearMidiDebugDisplay();
                }
                updateUI();
            });
        }
    }
    
    /**
     * Initialize key movement settings popup
     */
    function initKeyMovementSettings() {
        let popup = document.getElementById('key-movement-popup');
        if (!popup) {
            popup = createKeyMovementPopup();
            document.body.appendChild(popup);
        }
        setupKeyMovementControls();
    }
    
    /**
     * Create key movement settings popup
     */
    function createKeyMovementPopup() {
        const popup = document.createElement('div');
        popup.id = 'key-movement-popup';
        popup.className = 'key-movement-popup';
        popup.innerHTML = `
            <div class="key-movement-popup-content">
                <div class="key-movement-popup-header">
                    <h2>Key Movement Settings</h2>
                    <button class="key-movement-popup-close">×</button>
                </div>
                <div class="key-movement-popup-body">
                    <div class="key-movement-setting">
                        <label>
                            <span>Animation Style</span>
                            <select id="key-movement-style">
                                <option value="none">No Movement</option>
                                <option value="instant">Instant Position Change</option>
                                <option value="animated" selected>Animated Movement</option>
                            </select>
                        </label>
                        <div class="key-movement-description">Choose how keys move when pressed/released. Instant = immediate movement, Animated = smooth transition.</div>
                    </div>
                    
                    <div class="key-movement-setting">
                        <label>
                            <span>Press Depth (%)</span>
                            <input type="range" id="key-movement-depth" min="0" max="100" value="70" step="1">
                            <span class="key-movement-value" id="key-movement-depth-value">70%</span>
                        </label>
                        <div class="key-movement-description">How far down keys move when pressed (percentage of key height). Default: 70%</div>
                    </div>
                    
                    
                    <div class="key-movement-popup-footer">
                        <button class="key-movement-reset">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        if (!document.getElementById('key-movement-styles')) {
            const style = document.createElement('style');
            style.id = 'key-movement-styles';
            style.textContent = `
                .key-movement-popup {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    z-index: 3001;
                    align-items: center;
                    justify-content: center;
                }
                .key-movement-popup.active {
                    display: flex;
                }
                .key-movement-popup-content {
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
                .key-movement-popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .key-movement-popup-header h2 {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 18px;
                    color: #fff;
                }
                .key-movement-popup-close {
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
                .key-movement-popup-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .key-movement-popup-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .key-movement-setting {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .key-movement-setting label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                }
                .key-movement-setting label span:first-child {
                    min-width: 140px;
                    font-weight: 500;
                }
                .key-movement-setting select {
                    flex: 1;
                    padding: 6px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                    cursor: pointer;
                }
                .key-movement-setting select option {
                    background: rgba(40, 40, 55, 0.98);
                    color: #fff;
                    padding: 8px 12px;
                }
                .key-movement-setting select:focus {
                    outline: none;
                    border-color: #1a5a3a;
                    background: rgba(255, 255, 255, 0.15);
                }
                .key-movement-setting input[type="range"] {
                    flex: 1;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 3px;
                    outline: none;
                    -webkit-appearance: none;
                }
                .key-movement-setting input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #1a5a3a;
                    border-radius: 50%;
                    cursor: pointer;
                }
                .key-movement-setting input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    background: #1a5a3a;
                    border-radius: 50%;
                    cursor: pointer;
                    border: none;
                }
                .key-movement-value {
                    min-width: 60px;
                    text-align: right;
                    color: #1a5a3a;
                    font-family: 'Inter', sans-serif;
                    font-size: 12px;
                    font-weight: 500;
                }
                .key-movement-description {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    font-family: 'Inter', sans-serif;
                    margin-left: 152px;
                    line-height: 1.4;
                }
                .key-movement-popup-footer {
                    margin-top: 10px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .key-movement-reset {
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
                .key-movement-reset:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
            `;
            document.head.appendChild(style);
        }
        
        return popup;
    }
    
    /**
     * Setup key movement controls
     */
    function setupKeyMovementControls() {
        const popup = document.getElementById('key-movement-popup');
        if (!popup) return;
        
        const closeBtn = popup.querySelector('.key-movement-popup-close');
        const resetBtn = popup.querySelector('.key-movement-reset');
        const styleSelect = document.getElementById('key-movement-style');
        const depthSlider = document.getElementById('key-movement-depth');
        const depthValue = document.getElementById('key-movement-depth-value');
        
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
                resetKeyMovementToDefaults();
            });
        }
        
        // Animation style select
        if (styleSelect) {
            styleSelect.addEventListener('change', (e) => {
                window.keyMovementSettings.animationStyle = e.target.value;
            });
        }
        
        // Press depth slider
        if (depthSlider && depthValue) {
            const currentDepth = (window.keyMovementSettings.pressDepth || 0.7) * 100;
            depthSlider.value = Math.round(currentDepth);
            depthValue.textContent = Math.round(currentDepth) + '%';
            
            depthSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                depthValue.textContent = Math.round(value) + '%';
                window.keyMovementSettings.pressDepth = value / 100;
            });
        }
        
    }
    
    /**
     * Open key movement settings
     */
    function openKeyMovementSettings() {
        const popup = document.getElementById('key-movement-popup');
        if (popup) {
            // Sync UI with current settings
            const styleSelect = document.getElementById('key-movement-style');
            const depthSlider = document.getElementById('key-movement-depth');
            const depthValue = document.getElementById('key-movement-depth-value');
            
            if (styleSelect) {
                styleSelect.value = window.keyMovementSettings.animationStyle || 'animated';
            }
            
            if (depthSlider && depthValue) {
                const depth = (window.keyMovementSettings.pressDepth || 0.7) * 100;
                depthSlider.value = Math.round(depth);
                depthValue.textContent = Math.round(depth) + '%';
            }
            
            popup.classList.add('active');
        }
    }
    
    /**
     * Reset key movement to defaults
     */
    function resetKeyMovementToDefaults() {
        window.keyMovementSettings.animationStyle = 'animated';
        window.keyMovementSettings.pressDepth = 0.7;
        window.keyMovementSettings.animationDuration = 0.1;
        
        // Update UI
        const styleSelect = document.getElementById('key-movement-style');
        const depthSlider = document.getElementById('key-movement-depth');
        const depthValue = document.getElementById('key-movement-depth-value');
        
        if (styleSelect) styleSelect.value = 'animated';
        if (depthSlider) depthSlider.value = 70;
        if (depthValue) depthValue.textContent = '70%';
    }
    
    /**
     * Initialize key labels settings popup
     */
    function initKeyLabelsSettings() {
        let popup = document.getElementById('key-labels-popup');
        if (!popup) {
            popup = createKeyLabelsPopup();
            document.body.appendChild(popup);
        }
        setupKeyLabelsControls();
    }
    
    /**
     * Create key labels settings popup
     */
    function createKeyLabelsPopup() {
        const popup = document.createElement('div');
        popup.id = 'key-labels-popup';
        popup.className = 'key-labels-popup';
        popup.innerHTML = `
            <div class="key-labels-popup-content">
                <div class="key-labels-popup-header">
                    <h2>Key Labels Settings</h2>
                    <button class="key-labels-popup-close">×</button>
                </div>
                <div class="key-labels-popup-body">
                    <div class="key-labels-setting">
                        <label>
                            <span>Visibility Mode</span>
                            <select id="key-labels-visibility">
                                <option value="pressed" selected>Show Only When Pressed</option>
                                <option value="always">Always Visible</option>
                            </select>
                        </label>
                        <div class="key-labels-description">Choose when labels are visible. "Show Only When Pressed" = labels appear when keys are pressed (default). "Always Visible" = labels always shown.</div>
                    </div>
                    
                    <div class="key-labels-setting">
                        <label>
                            <span>Black Key Labels</span>
                            <select id="key-labels-black-key-mode">
                                <option value="both" selected>Show Both (Sharp/Flat)</option>
                                <option value="sharp">Show Sharp Only</option>
                                <option value="flat">Show Flat Only</option>
                            </select>
                        </label>
                        <div class="key-labels-description">Choose how black keys are labeled. "Show Both" displays both sharp and flat notation (e.g., C#/D♭). "Show Sharp Only" displays only sharp notation (e.g., C#). "Show Flat Only" displays only flat notation (e.g., D♭).</div>
                    </div>
                    
                    <div class="key-labels-popup-footer">
                        <button class="key-labels-reset">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles (reuse similar styles from key-movement)
        if (!document.getElementById('key-labels-styles')) {
            const style = document.createElement('style');
            style.id = 'key-labels-styles';
            style.textContent = `
                .key-labels-popup {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    z-index: 3001;
                    align-items: center;
                    justify-content: center;
                }
                .key-labels-popup.active {
                    display: flex;
                }
                .key-labels-popup-content {
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
                .key-labels-popup-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .key-labels-popup-header h2 {
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    font-weight: 600;
                    font-size: 18px;
                    color: #fff;
                }
                .key-labels-popup-close {
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
                .key-labels-popup-close:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
                .key-labels-popup-body {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .key-labels-setting {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .key-labels-setting label {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                }
                .key-labels-setting label span:first-child {
                    min-width: 140px;
                    font-weight: 500;
                }
                .key-labels-setting select {
                    flex: 1;
                    padding: 6px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 13px;
                    cursor: pointer;
                }
                .key-labels-setting select option {
                    background: rgba(40, 40, 55, 0.98);
                    color: #fff;
                    padding: 8px 12px;
                }
                .key-labels-setting select:focus {
                    outline: none;
                    border-color: #1a5a3a;
                    background: rgba(255, 255, 255, 0.15);
                }
                .key-labels-description {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.6);
                    font-family: 'Inter', sans-serif;
                    margin-left: 152px;
                    line-height: 1.4;
                }
                .key-labels-popup-footer {
                    margin-top: 10px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                .key-labels-reset {
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
                .key-labels-reset:hover {
                    background: rgba(255, 255, 255, 0.15);
                }
            `;
            document.head.appendChild(style);
        }
        
        return popup;
    }
    
    /**
     * Setup key labels controls
     */
    function setupKeyLabelsControls() {
        const popup = document.getElementById('key-labels-popup');
        if (!popup) return;
        
        const closeBtn = popup.querySelector('.key-labels-popup-close');
        const resetBtn = popup.querySelector('.key-labels-reset');
        const visibilitySelect = document.getElementById('key-labels-visibility');
        const blackKeyModeSelect = document.getElementById('key-labels-black-key-mode');
        
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
                resetKeyLabelsToDefaults();
            });
        }
        
        // Visibility mode select
        if (visibilitySelect) {
            visibilitySelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                window.keyLabelSettings.showOnlyWhenPressed = (mode === 'pressed');
                window.keyLabelSettings.alwaysVisible = (mode === 'always');
                
                if (window.updateAllKeyLabels) {
                    window.updateAllKeyLabels();
                }
            });
        }
        
        // Black key label mode select
        if (blackKeyModeSelect) {
            blackKeyModeSelect.addEventListener('change', (e) => {
                const mode = e.target.value;
                window.keyLabelSettings.blackKeyLabelMode = mode;
                
                // Update all black key labels
                if (window.updateBlackKeyLabels) {
                    window.updateBlackKeyLabels();
                }
            });
        }
    }
    
    /**
     * Open key labels settings
     */
    function openKeyLabelsSettings() {
        const popup = document.getElementById('key-labels-popup');
        if (popup) {
            // Sync UI with current settings
            const visibilitySelect = document.getElementById('key-labels-visibility');
            const blackKeyModeSelect = document.getElementById('key-labels-black-key-mode');
            
            if (visibilitySelect) {
                const mode = window.keyLabelSettings.showOnlyWhenPressed ? 'pressed' : 'always';
                visibilitySelect.value = mode;
            }
            
            if (blackKeyModeSelect) {
                const mode = window.keyLabelSettings.blackKeyLabelMode || 'both';
                blackKeyModeSelect.value = mode;
            }
            
            popup.classList.add('active');
        }
    }
    
    /**
     * Reset key labels to defaults
     */
    function resetKeyLabelsToDefaults() {
        window.keyLabelSettings.showOnlyWhenPressed = true;
        window.keyLabelSettings.alwaysVisible = false;
        window.keyLabelSettings.blackKeyLabelMode = 'both';
        
        // Update UI
        const visibilitySelect = document.getElementById('key-labels-visibility');
        const blackKeyModeSelect = document.getElementById('key-labels-black-key-mode');
        
        if (visibilitySelect) {
            visibilitySelect.value = 'pressed';
        }
        
        if (blackKeyModeSelect) {
            blackKeyModeSelect.value = 'both';
        }
        
        if (window.updateAllKeyLabels) {
            window.updateAllKeyLabels();
        }
        
        if (window.updateBlackKeyLabels) {
            window.updateBlackKeyLabels();
        }
    }
    
    /**
     * Update UI to reflect current settings
     */
    function updateUI() {
        const highlightCheckbox = document.getElementById('enable-key-highlight');
        const movementCheckbox = document.getElementById('enable-key-movement');
        const labelsCheckbox = document.getElementById('enable-key-labels');
        const midiInputCheckbox = document.getElementById('enable-midi-input');
        const keypressInputCheckbox = document.getElementById('enable-keypress-input');
        const midiDebugCheckbox = document.getElementById('enable-midi-debug');
        
        if (highlightCheckbox) {
            highlightCheckbox.checked = window.keyHighlightSettings.enabled;
        }
        if (movementCheckbox) {
            movementCheckbox.checked = window.keyMovementSettings.enabled;
        }
        if (labelsCheckbox) {
            labelsCheckbox.checked = window.keyLabelSettings.enabled;
        }
        if (midiInputCheckbox && window.isMidiInputEnabled) {
            midiInputCheckbox.checked = window.isMidiInputEnabled();
        }
        if (keypressInputCheckbox && window.isKeypressInputEnabled) {
            keypressInputCheckbox.checked = window.isKeypressInputEnabled();
        }
        if (midiDebugCheckbox) {
            midiDebugCheckbox.checked = (window.midiDebugSettings && window.midiDebugSettings.enabled) || false;
        }
    }
    
    /**
     * Clear MIDI debug display
     */
    function clearMidiDebugDisplay() {
        const debugContainer = document.getElementById('midi-debug-container');
        if (debugContainer) {
            debugContainer.innerHTML = '';
        }
    }
    
    /**
     * Show the settings modal
     */
    window.showKeyboardVisualSettings = function() {
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            settingsModal.classList.add('active');
            updateUI();
        } else {
            // Initialize if not already done
            createSettingsUI();
            setupEventListeners();
            if (settingsModal) {
                settingsModal.style.display = 'flex';
                settingsModal.classList.add('active');
                updateUI();
            }
        }
    };
    
    console.log('Keyboard Visual Settings module loaded');
})();
