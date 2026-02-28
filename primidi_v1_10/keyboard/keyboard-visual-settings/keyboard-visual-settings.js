/**
 * Keyboard Visual Settings Module
 * Manages the settings UI for keyboard visual effects
 */

(function() {
    'use strict';
    
    let settingsModal = null;
    let settingsPanel = null;
    
    /**
     * Initialize the keyboard visual settings UI (uses app-popup if present, else creates own modal)
     */
    window.initKeyboardVisualSettings = function() {
        const appPopup = document.getElementById('app-popup');
        if (appPopup) {
            settingsModal = appPopup;
            settingsPanel = document.getElementById('app-popup-body');
        } else if (!document.getElementById('keyboard-visual-modal')) {
            createSettingsUI();
        }
        setupEventListeners();
        updateUI();
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
            <div class="settings-tabs" role="tablist">
                <button type="button" class="settings-tab active" role="tab" id="settings-tab-keyboard" aria-selected="true" data-panel="settings-panel-keyboard">Keyboard</button>
                <button type="button" class="settings-tab" role="tab" id="settings-tab-sound" aria-selected="false" data-panel="settings-panel-sound">Sound</button>
                <button type="button" class="settings-tab" role="tab" id="settings-tab-camera" aria-selected="false" data-panel="settings-panel-camera">Camera</button>
                <button type="button" class="settings-tab" role="tab" id="settings-tab-about" aria-selected="false" data-panel="settings-panel-about">About</button>
            </div>
            <div id="settings-panel-keyboard" class="settings-panel active" role="tabpanel">
                <div class="keyboard-visual-setting-item">
                    <label>
                        <input type="checkbox" id="enable-key-highlight">
                        <div><strong>Key highlight</strong></div>
                    </label>
                </div>
                <div class="keyboard-visual-setting-item">
                    <label>
                        <input type="checkbox" id="enable-key-movement" checked>
                        <div>
                            <strong>Key movement</strong>
                            <button type="button" class="keyboard-visual-settings-menu" id="key-movement-settings-btn" aria-label="More options">››</button>
                        </div>
                    </label>
                </div>
                <div class="keyboard-visual-setting-item">
                    <label>
                        <input type="checkbox" id="enable-key-labels" checked>
                        <div>
                            <strong>Key labels</strong>
                            <button type="button" class="keyboard-visual-settings-menu" id="key-labels-settings-btn" aria-label="More options">››</button>
                        </div>
                    </label>
                </div>
                <div class="keyboard-visual-setting-item">
                    <label>
                        <input type="checkbox" id="enable-midi-input" checked>
                        <div><strong>MIDI input</strong></div>
                    </label>
                </div>
                <div class="keyboard-visual-setting-item">
                    <label>
                        <input type="checkbox" id="enable-keypress-input" checked>
                        <div><strong>Computer keyboard</strong></div>
                    </label>
                </div>
                <div class="keyboard-visual-setting-item">
                    <label>
                        <input type="checkbox" id="enable-midi-debug">
                        <div><strong>MIDI monitor</strong></div>
                    </label>
                </div>
            </div>
            <div id="settings-panel-sound" class="settings-panel" role="tabpanel">
                <div class="keyboard-visual-setting-item">
                    <label>
                        <span class="setting-label-inline">Reverb</span>
                        <select id="settings-reverb-select">
                            <option value="0">Off</option>
                            <option value="25">Subtle</option>
                            <option value="50" selected>Light</option>
                            <option value="75">Medium</option>
                            <option value="100">Full</option>
                        </select>
                    </label>
                </div>
                <div class="keyboard-visual-setting-item">
                    <label>
                        <span class="setting-label-inline">Stereo width</span>
                        <select id="settings-stereo-select">
                            <option value="-100">Wide</option>
                            <option value="-75" selected>Moderate</option>
                            <option value="-50">Narrow</option>
                            <option value="-25">Subtle</option>
                            <option value="0">Mono</option>
                        </select>
                    </label>
                </div>
                <div class="keyboard-visual-setting-item">
                    <label>
                        <span class="setting-label-inline">Master level</span>
                        <input type="range" id="settings-master-volume" min="0" max="2000" value="1000" step="10">
                        <span class="settings-master-volume-value" id="settings-master-volume-value">1000%</span>
                    </label>
                </div>
            </div>
            <div id="settings-panel-camera" class="settings-panel" role="tabpanel">
                <div class="settings-about-content">
                    <p><strong>Spacebar</strong> — Cycle to the next camera view.</p>
                    <p><strong>R</strong> — Toggle camera orbit on or off.</p>
                </div>
            </div>
            <div id="settings-panel-about" class="settings-panel" role="tabpanel">
                <div class="settings-about-content">
                    <p>Created by <a href="https://buymeacoffee.com/beatsaway" target="_blank" rel="noopener noreferrer">Beats Away</a>, 2026. If you enjoy using it, you can <a href="https://buymeacoffee.com/beatsaway" target="_blank" rel="noopener noreferrer">support its development</a>.</p>
                </div>
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
        // Tabs: Keyboard / Sound / Camera / About
        const tabKeyboard = document.getElementById('settings-tab-keyboard');
        const tabSound = document.getElementById('settings-tab-sound');
        const tabCamera = document.getElementById('settings-tab-camera');
        const tabAbout = document.getElementById('settings-tab-about');
        const panelKeyboard = document.getElementById('settings-panel-keyboard');
        const panelSound = document.getElementById('settings-panel-sound');
        const panelCamera = document.getElementById('settings-panel-camera');
        const panelAbout = document.getElementById('settings-panel-about');
        function showPanel(panelId) {
            [tabKeyboard, tabSound, tabCamera, tabAbout].forEach(function (t) {
                if (t) {
                    t.classList.toggle('active', t.getAttribute('data-panel') === panelId);
                    t.setAttribute('aria-selected', t.getAttribute('data-panel') === panelId ? 'true' : 'false');
                }
            });
            [panelKeyboard, panelSound, panelCamera, panelAbout].forEach(function (p) {
                if (p) {
                    p.classList.toggle('active', p.id === panelId);
                }
            });
        }
        if (tabKeyboard) tabKeyboard.addEventListener('click', function () { showPanel('settings-panel-keyboard'); });
        if (tabSound) tabSound.addEventListener('click', function () { showPanel('settings-panel-sound'); });
        if (tabCamera) tabCamera.addEventListener('click', function () { showPanel('settings-panel-camera'); });
        if (tabAbout) tabAbout.addEventListener('click', function () { showPanel('settings-panel-about'); });

        // Sound tab: Reverb & Stereo → gsl-synth
        const reverbSelect = document.getElementById('settings-reverb-select');
        const stereoSelect = document.getElementById('settings-stereo-select');
        if (reverbSelect && window.synth && window.synth.setReverb) {
            reverbSelect.addEventListener('change', function () {
                window.synth.setReverb(parseInt(this.value, 10) / 100);
            });
        }
        if (stereoSelect && window.synth && window.synth.setStereoWidth) {
            stereoSelect.addEventListener('change', function () {
                window.synth.setStereoWidth(parseInt(this.value, 10));
            });
        }
        var masterVolumeSlider = document.getElementById('settings-master-volume');
        var masterVolumeValue = document.getElementById('settings-master-volume-value');
        if (masterVolumeSlider && masterVolumeValue && window.synth && window.synth.setMasterVolume) {
            masterVolumeSlider.addEventListener('input', function () {
                var p = parseInt(this.value, 10);
                masterVolumeValue.textContent = p + '%';
                window.synth.setMasterVolume(p);
            });
        }

        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target !== settingsModal) return;
                if (settingsModal.id === 'app-popup') {
                    settingsModal.classList.remove('visible');
                } else {
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
                if (!e.target.checked && window.clearMidiDebugDisplay) {
                    window.clearMidiDebugDisplay();
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
                    </div>
                    
                    <div class="key-movement-setting">
                        <label>
                            <span>Press Depth (%)</span>
                            <input type="range" id="key-movement-depth" min="0" max="100" value="70" step="1">
                            <span class="key-movement-value" id="key-movement-depth-value">70%</span>
                        </label>
                    </div>
                    
                    
                    <div class="key-movement-popup-footer">
                        <button class="key-movement-reset">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;
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
                                <option value="none">Show None</option>
                                <option value="pressed" selected>Show Only When Pressed</option>
                                <option value="always">Always Visible</option>
                            </select>
                        </label>
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
                    </div>
                    <div class="key-labels-setting">
                        <label>
                            <span>Format</span>
                            <select id="key-labels-format">
                                <option value="withOctave">Note + octave (e.g. A3, C1)</option>
                                <option value="noteOnly" selected>Note only (e.g. A, B, C)</option>
                            </select>
                        </label>
                    </div>
                    <div class="key-labels-setting">
                        <label>
                            <span>Display</span>
                            <select id="key-labels-display-mode">
                                <option value="stickers" selected>Show key stickers</option>
                                <option value="tags">Show key tags</option>
                                <option value="both">Show both</option>
                            </select>
                        </label>
                    </div>
                    <div class="key-labels-popup-footer">
                        <button class="key-labels-reset">Reset to Defaults</button>
                    </div>
                </div>
            </div>
        `;
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
        const formatSelect = document.getElementById('key-labels-format');
        const displayModeSelect = document.getElementById('key-labels-display-mode');
        
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
                window.keyLabelSettings.showNone = (mode === 'none');
                window.keyLabelSettings.showOnlyWhenPressed = (mode === 'pressed');
                window.keyLabelSettings.alwaysVisible = (mode === 'always');
                if (window.updateDivLabelsVisibility) window.updateDivLabelsVisibility();
                if (window.updateAllKeyLabels) window.updateAllKeyLabels();
            });
        }
        
        // Black key label mode select
        if (blackKeyModeSelect) {
            blackKeyModeSelect.addEventListener('change', (e) => {
                window.keyLabelSettings.blackKeyLabelMode = e.target.value;
                if (window.updateBlackKeyLabels) window.updateBlackKeyLabels();
                if (window.updateAllLabelFormats) window.updateAllLabelFormats();
            });
        }
        // Format: Note + octave vs Note only
        if (formatSelect) {
            formatSelect.addEventListener('change', (e) => {
                window.keyLabelSettings.labelFormat = e.target.value;
                if (window.updateAllLabelFormats) window.updateAllLabelFormats();
            });
        }
        // Display mode: stickers / tags / both (does not override Key Labels checkbox in Keyboard settings)
        if (displayModeSelect) {
            displayModeSelect.addEventListener('change', (e) => {
                window.keyLabelSettings.labelDisplayMode = e.target.value;
                if (window.updateDivLabelsVisibility) window.updateDivLabelsVisibility();
                if (window.updateAllKeyLabels) window.updateAllKeyLabels();
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
                const mode = window.keyLabelSettings.showNone ? 'none' : (window.keyLabelSettings.showOnlyWhenPressed ? 'pressed' : 'always');
                visibilitySelect.value = mode;
            }
            
            if (blackKeyModeSelect) {
                blackKeyModeSelect.value = window.keyLabelSettings.blackKeyLabelMode || 'both';
            }
            const formatSelect = document.getElementById('key-labels-format');
            if (formatSelect) {
                formatSelect.value = window.keyLabelSettings.labelFormat || 'noteOnly';
            }
            const displayModeSelect = document.getElementById('key-labels-display-mode');
            if (displayModeSelect) {
                displayModeSelect.value = window.keyLabelSettings.labelDisplayMode || 'stickers';
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
        window.keyLabelSettings.showNone = false;
        window.keyLabelSettings.blackKeyLabelMode = 'both';
        window.keyLabelSettings.labelFormat = 'noteOnly';
        window.keyLabelSettings.labelDisplayMode = 'stickers';
        
        // Update UI
        const visibilitySelect = document.getElementById('key-labels-visibility');
        const blackKeyModeSelect = document.getElementById('key-labels-black-key-mode');
        const formatSelect = document.getElementById('key-labels-format');
        const displayModeSelect = document.getElementById('key-labels-display-mode');
        
        if (visibilitySelect) visibilitySelect.value = 'pressed';
        if (blackKeyModeSelect) blackKeyModeSelect.value = 'both';
        if (formatSelect) formatSelect.value = 'noteOnly';
        if (displayModeSelect) displayModeSelect.value = 'stickers';
        if (window.updateDivLabelsVisibility) window.updateDivLabelsVisibility();
        if (window.updateAllKeyLabels) window.updateAllKeyLabels();
        if (window.updateBlackKeyLabels) window.updateBlackKeyLabels();
        if (window.updateAllLabelFormats) window.updateAllLabelFormats();
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
        var masterVolSlider = document.getElementById('settings-master-volume');
        var masterVolValue = document.getElementById('settings-master-volume-value');
        if (masterVolSlider && masterVolValue && window.synth && window.synth.getMasterVolume) {
            var p = window.synth.getMasterVolume();
            masterVolSlider.value = p;
            masterVolValue.textContent = p + '%';
        }
    }
    
    window.showKeyboardVisualSettings = function() {
        if (!settingsModal) {
            createSettingsUI();
            setupEventListeners();
        }
        if (settingsModal) {
            if (settingsModal.id === 'app-popup') {
                settingsModal.classList.add('visible');
                const tab = document.getElementById('app-tab-display');
                if (tab) tab.click();
            } else {
                settingsModal.style.display = 'flex';
                settingsModal.classList.add('active');
            }
            updateUI();
        }
    };
    
    console.log('Keyboard Visual Settings module loaded');
})();
