/**
 * Physics Settings Module
 * Manages the settings UI and state for physics-based features
 * Based on research4 findings
 */

// Physics settings state (global)
const physicsSettings = {
    velocityTimbre: true,
    twoStageDecay: true,
    pedalCoupling: true,
    sustainDecay: true,
    advancedTimbre: true, // Custom waveform generation (more CPU intensive)
    velocityAttack: true, // Velocity-dependent attack time
    timeVaryingBrightness: true, // Time-varying harmonic content
    dynamicFilter: true, // Dynamic low-pass filter that closes as notes decay
    frequencyCompensation: true, // Equal-loudness contour compensation (CPU: Medium impact)
    frequencyEnvelope: true, // Pitch modulation (initial drift, vibrato, release drift) - CPU: Medium impact
    binauralReverb: true, // Binaural 3D spatial reverb - CPU: High impact
    fakeBinaural: true, // Fake binaural mono-to-stereo processing - CPU: Low-Medium impact
    spectralBalance: true, // Pink-noise-like EQ filter for final output - CPU: Low impact
    // Priority 1: Critical Realism
    inharmonicity: true, // Pitch-dependent partial sharpening - CRITICAL for realism
    // Priority 2: High Impact
    attackNoise: true, // Hammer strike noise component
    oddEvenHarmonicBalance: true, // Explicit 2:1 ratio for odd:even harmonics
    pitchHarmonicRolloff: true, // Pitch-dependent harmonic content (bass has more harmonics)
    // Priority 3: Polish & Detail
    perPartialDecay: true, // Higher partials decay faster
    releaseTransient: true, // Key-off sound (damper lift-off)
    // New Research Features: Delay & Resonance
    velocitySensitiveDelay: true, // Velocity-sensitive delay (soft = longer delays) - CPU: Medium impact
    sympatheticResonanceDelay: true, // Sympathetic string resonance delay - CPU: Medium impact
    spectralResonanceDelay: true, // Dynamic frequency-dependent delay (spectral resonance) - CPU: High impact
    delayPseudoReverb: true, // Delay-based pseudo-reverb (stereo widening) - CPU: Low-Medium impact
    tremolo: true, // Tremolo effect (amplitude modulation for sense of movement) - CPU: Low impact
    // New Research Features: Sustain Physics
    pianoEnvelopeModel: true, // Realistic piano envelope model (state-based decay) - CPU: Low impact
    harmonicProfileEvolution: true, // Harmonic profile evolution over time - CPU: Medium impact
    realisticSustain: true // Realistic piano sustain system - CPU: Medium impact
};

// Default settings (for reset)
const defaultSettings = {
    velocityTimbre: true,
    twoStageDecay: true,
    pedalCoupling: true,
    sustainDecay: true,
    advancedTimbre: true,
    velocityAttack: true,
    timeVaryingBrightness: true,
    dynamicFilter: true,
    frequencyCompensation: true,
    frequencyEnvelope: true,
    binauralReverb: true, // Binaural (3D Spatial) mode enabled
    fakeBinaural: true,
    spectralBalance: true, // ON by default
    inharmonicity: true,
    attackNoise: true,
    oddEvenHarmonicBalance: true,
    pitchHarmonicRolloff: true,
    perPartialDecay: true,
    releaseTransient: true,
    // New Research Features: Delay & Resonance
    velocitySensitiveDelay: true,
    sympatheticResonanceDelay: true,
    spectralResonanceDelay: true,
    delayPseudoReverb: true,
    tremolo: true,
    // New Research Features: Sustain Physics
    pianoEnvelopeModel: true,
    harmonicProfileEvolution: true,
    realisticSustain: true
};

// Preset configurations
const settingsPresets = {
    defaults: defaultSettings,
    all: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: true,
        sustainDecay: true,
        advancedTimbre: true,
        velocityAttack: true,
        timeVaryingBrightness: true,
        dynamicFilter: true,
        frequencyCompensation: true,
        frequencyEnvelope: true,
        binauralReverb: true,
        fakeBinaural: true,
        spectralBalance: true,
        inharmonicity: true,
        attackNoise: true,
        oddEvenHarmonicBalance: true,
        pitchHarmonicRolloff: true,
        perPartialDecay: true,
        releaseTransient: true
    },
    none: {
        velocityTimbre: false,
        twoStageDecay: false,
        pedalCoupling: false,
        sustainDecay: false,
        advancedTimbre: false,
        velocityAttack: false,
        timeVaryingBrightness: false,
        dynamicFilter: false,
        frequencyCompensation: false,
        frequencyEnvelope: false,
        binauralReverb: false,
        fakeBinaural: false,
        spectralBalance: false,
        inharmonicity: false,
        attackNoise: false,
        oddEvenHarmonicBalance: false,
        pitchHarmonicRolloff: false,
        perPartialDecay: false,
        releaseTransient: false
    },
    // CPU-based presets (5 options)
    maximum: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: true,
        sustainDecay: true,
        advancedTimbre: true,
        velocityAttack: true,
        timeVaryingBrightness: true,
        dynamicFilter: true,
        frequencyCompensation: true,
        frequencyEnvelope: true,
        binauralReverb: true,
        fakeBinaural: true,
        delayPseudoReverb: true, // Can be used alongside reverb
        spectralBalance: true,
        inharmonicity: true,
        attackNoise: true,
        oddEvenHarmonicBalance: true,
        pitchHarmonicRolloff: true,
        perPartialDecay: true,
        releaseTransient: true
    },
    high: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: true,
        sustainDecay: true,
        advancedTimbre: false,
        velocityAttack: true,
        timeVaryingBrightness: true,
        dynamicFilter: true,
        frequencyCompensation: true,
        frequencyEnvelope: true,
        binauralReverb: false,
        fakeBinaural: true,
        delayPseudoReverb: true, // CPU-efficient alternative to reverb
        spectralBalance: true,
        inharmonicity: true,
        attackNoise: true,
        oddEvenHarmonicBalance: true,
        pitchHarmonicRolloff: true,
        perPartialDecay: true,
        releaseTransient: true
    },
    default: defaultSettings, // Uses the default settings defined above
    low: {
        velocityTimbre: true,
        twoStageDecay: true,
        pedalCoupling: false,
        sustainDecay: true,
        advancedTimbre: false,
        velocityAttack: true,
        timeVaryingBrightness: false,
        dynamicFilter: true,
        frequencyCompensation: false,
        frequencyEnvelope: false,
        binauralReverb: false,
        fakeBinaural: false,
        spectralBalance: false,
        inharmonicity: true,
        attackNoise: false,
        oddEvenHarmonicBalance: false,
        pitchHarmonicRolloff: false,
        perPartialDecay: false,
        releaseTransient: false
    },
    minimal: {
        velocityTimbre: true,
        twoStageDecay: false,
        pedalCoupling: false,
        sustainDecay: false,
        advancedTimbre: false,
        velocityAttack: false,
        timeVaryingBrightness: false,
        dynamicFilter: false,
        frequencyCompensation: false,
        frequencyEnvelope: false,
        binauralReverb: false,
        fakeBinaural: false,
        spectralBalance: false,
        inharmonicity: false,
        attackNoise: false,
        oddEvenHarmonicBalance: false,
        pitchHarmonicRolloff: false,
        perPartialDecay: false,
        releaseTransient: false
    }
};

/**
 * Helper function to refresh settings differences display
 */
function refreshSettingsDiff() {
    if (window.logSettingsDifferences) {
        setTimeout(() => window.logSettingsDifferences(), 50);
    }
}

/**
 * Initialize the settings modal UI
 * Sets up event listeners and syncs UI with settings state
 */
function initPhysicsSettings() {
    const settingsModal = document.getElementById('settings-modal');
    const settingsIcon = document.getElementById('settings-icon');
    const settingsClose = document.getElementById('settings-close');
    
    // Setup navbar/tab switching
    const navTabs = document.querySelectorAll('.nav-tab');
    const categories = document.querySelectorAll('.settings-category');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const categoryId = tab.getAttribute('data-category');
            
            // Remove active class from all tabs and categories
            navTabs.forEach(t => t.classList.remove('active'));
            categories.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding category
            tab.classList.add('active');
            const category = document.getElementById(`category-${categoryId}`);
            if (category) {
                category.classList.add('active');
            }
        });
    });
    
    // Setup preset dropdown
    // NOTE: This handler was for PHYSICS SETTINGS presets, but the header dropdown
    // with id 'preset-select' is for SOUND PRESETS (primal, cosmos, livid, bluish)
    // which are handled in index.html. We should NOT interfere with it.
    // If there's a separate physics settings preset dropdown in the future, it should
    // have a different ID (e.g., 'physics-preset-select') to avoid conflicts.
    
    // REMOVED: The handler that was clearing the sound preset dropdown value
    // The sound preset dropdown is handled in index.html and should maintain its value
    
    const enableVelocityTimbre = document.getElementById('enable-velocity-timbre');
    const enableTwoStageDecay = document.getElementById('enable-two-stage-decay');
    const enablePedalCoupling = document.getElementById('enable-pedal-coupling');
    const enableSustainDecay = document.getElementById('enable-sustain-decay');
    const enableAdvancedTimbre = document.getElementById('enable-advanced-timbre');
    const enableVelocityAttack = document.getElementById('enable-velocity-attack');
    const enableTimeVaryingBrightness = document.getElementById('enable-time-varying-brightness');
    const enableDynamicFilter = document.getElementById('enable-dynamic-filter');
    const enableFrequencyCompensation = document.getElementById('enable-frequency-compensation');
    const enableFrequencyEnvelope = document.getElementById('enable-frequency-envelope');
    const enableBinauralReverb = document.getElementById('enable-binaural-reverb');
    const enableFakeBinaural = document.getElementById('enable-fake-binaural');
    const enableSpectralBalance = document.getElementById('enable-spectral-balance');
    // Priority 1: Critical Realism
    const enableInharmonicity = document.getElementById('enable-inharmonicity');
    // Priority 2: High Impact
    const enableAttackNoise = document.getElementById('enable-attack-noise');
    const enableOddEvenHarmonicBalance = document.getElementById('enable-odd-even-harmonic-balance');
    const enablePitchHarmonicRolloff = document.getElementById('enable-pitch-harmonic-rolloff');
    // Priority 3: Polish & Detail
    const enablePerPartialDecay = document.getElementById('enable-per-partial-decay');
    const enableReleaseTransient = document.getElementById('enable-release-transient');
    // New Research Features: Delay & Resonance
    const enableVelocitySensitiveDelay = document.getElementById('enable-velocity-sensitive-delay');
    const enableSympatheticResonanceDelay = document.getElementById('enable-sympathetic-resonance-delay');
    const enableSpectralResonanceDelay = document.getElementById('enable-spectral-resonance-delay');
    const enableDelayPseudoReverb = document.getElementById('enable-delay-pseudo-reverb');
    const enableTremolo = document.getElementById('enable-tremolo');
    // New Research Features: Sustain Physics
    const enablePianoEnvelopeModel = document.getElementById('enable-piano-envelope-model');
    const enableHarmonicProfileEvolution = document.getElementById('enable-harmonic-profile-evolution');
    const enableRealisticSustain = document.getElementById('enable-realistic-sustain');
    
    /**
     * Sync checkboxes with current settings state
     */
    function syncCheckboxes() {
        if (enableVelocityTimbre) enableVelocityTimbre.checked = physicsSettings.velocityTimbre;
        if (enableTwoStageDecay) enableTwoStageDecay.checked = physicsSettings.twoStageDecay;
        if (enablePedalCoupling) enablePedalCoupling.checked = physicsSettings.pedalCoupling;
        if (enableSustainDecay) enableSustainDecay.checked = physicsSettings.sustainDecay;
        if (enableAdvancedTimbre) enableAdvancedTimbre.checked = physicsSettings.advancedTimbre;
        if (enableVelocityAttack) enableVelocityAttack.checked = physicsSettings.velocityAttack;
        if (enableTimeVaryingBrightness) enableTimeVaryingBrightness.checked = physicsSettings.timeVaryingBrightness;
        if (enableDynamicFilter) enableDynamicFilter.checked = physicsSettings.dynamicFilter;
        if (enableFrequencyCompensation) enableFrequencyCompensation.checked = physicsSettings.frequencyCompensation;
        if (enableFrequencyEnvelope) enableFrequencyEnvelope.checked = physicsSettings.frequencyEnvelope;
        if (enableBinauralReverb) enableBinauralReverb.checked = physicsSettings.binauralReverb;
        if (enableFakeBinaural) enableFakeBinaural.checked = physicsSettings.fakeBinaural;
        if (enableSpectralBalance) enableSpectralBalance.checked = physicsSettings.spectralBalance;
        if (enableInharmonicity) enableInharmonicity.checked = physicsSettings.inharmonicity;
        if (enableAttackNoise) enableAttackNoise.checked = physicsSettings.attackNoise;
        if (enableOddEvenHarmonicBalance) enableOddEvenHarmonicBalance.checked = physicsSettings.oddEvenHarmonicBalance;
        if (enablePitchHarmonicRolloff) enablePitchHarmonicRolloff.checked = physicsSettings.pitchHarmonicRolloff;
        if (enablePerPartialDecay) enablePerPartialDecay.checked = physicsSettings.perPartialDecay;
        if (enableReleaseTransient) enableReleaseTransient.checked = physicsSettings.releaseTransient;
        // New Research Features: Delay & Resonance
        if (enableVelocitySensitiveDelay) enableVelocitySensitiveDelay.checked = physicsSettings.velocitySensitiveDelay;
        if (enableSympatheticResonanceDelay) enableSympatheticResonanceDelay.checked = physicsSettings.sympatheticResonanceDelay;
        if (enableSpectralResonanceDelay) enableSpectralResonanceDelay.checked = physicsSettings.spectralResonanceDelay;
        if (enableDelayPseudoReverb) enableDelayPseudoReverb.checked = physicsSettings.delayPseudoReverb;
        if (enableTremolo) enableTremolo.checked = physicsSettings.tremolo;
        // New Research Features: Sustain Physics
        if (enablePianoEnvelopeModel) enablePianoEnvelopeModel.checked = physicsSettings.pianoEnvelopeModel;
        if (enableHarmonicProfileEvolution) enableHarmonicProfileEvolution.checked = physicsSettings.harmonicProfileEvolution;
        if (enableRealisticSustain) enableRealisticSustain.checked = physicsSettings.realisticSustain;
    }
    
    /**
     * Sync settings state FROM checkboxes (read HTML checkbox states on page load)
     */
    function syncSettingsFromCheckboxes() {
        if (enableVelocityTimbre) physicsSettings.velocityTimbre = enableVelocityTimbre.checked;
        if (enableTwoStageDecay) physicsSettings.twoStageDecay = enableTwoStageDecay.checked;
        if (enablePedalCoupling) physicsSettings.pedalCoupling = enablePedalCoupling.checked;
        if (enableSustainDecay) physicsSettings.sustainDecay = enableSustainDecay.checked;
        if (enableAdvancedTimbre) physicsSettings.advancedTimbre = enableAdvancedTimbre.checked;
        if (enableVelocityAttack) physicsSettings.velocityAttack = enableVelocityAttack.checked;
        if (enableTimeVaryingBrightness) physicsSettings.timeVaryingBrightness = enableTimeVaryingBrightness.checked;
        if (enableDynamicFilter) physicsSettings.dynamicFilter = enableDynamicFilter.checked;
        if (enableFrequencyCompensation) physicsSettings.frequencyCompensation = enableFrequencyCompensation.checked;
        if (enableFrequencyEnvelope) physicsSettings.frequencyEnvelope = enableFrequencyEnvelope.checked;
        if (enableBinauralReverb) physicsSettings.binauralReverb = enableBinauralReverb.checked;
        if (enableFakeBinaural) physicsSettings.fakeBinaural = enableFakeBinaural.checked;
        if (enableSpectralBalance) physicsSettings.spectralBalance = enableSpectralBalance.checked;
        if (enableInharmonicity) physicsSettings.inharmonicity = enableInharmonicity.checked;
        if (enableAttackNoise) physicsSettings.attackNoise = enableAttackNoise.checked;
        if (enableOddEvenHarmonicBalance) physicsSettings.oddEvenHarmonicBalance = enableOddEvenHarmonicBalance.checked;
        if (enablePitchHarmonicRolloff) physicsSettings.pitchHarmonicRolloff = enablePitchHarmonicRolloff.checked;
        if (enablePerPartialDecay) physicsSettings.perPartialDecay = enablePerPartialDecay.checked;
        if (enableReleaseTransient) physicsSettings.releaseTransient = enableReleaseTransient.checked;
        // New Research Features: Delay & Resonance
        if (enableVelocitySensitiveDelay) physicsSettings.velocitySensitiveDelay = enableVelocitySensitiveDelay.checked;
        if (enableSympatheticResonanceDelay) physicsSettings.sympatheticResonanceDelay = enableSympatheticResonanceDelay.checked;
        if (enableSpectralResonanceDelay) physicsSettings.spectralResonanceDelay = enableSpectralResonanceDelay.checked;
        if (enableDelayPseudoReverb) physicsSettings.delayPseudoReverb = enableDelayPseudoReverb.checked;
        if (enableTremolo) physicsSettings.tremolo = enableTremolo.checked;
        // New Research Features: Sustain Physics
        if (enablePianoEnvelopeModel) physicsSettings.pianoEnvelopeModel = enablePianoEnvelopeModel.checked;
        if (enableHarmonicProfileEvolution) physicsSettings.harmonicProfileEvolution = enableHarmonicProfileEvolution.checked;
        if (enableRealisticSustain) physicsSettings.realisticSustain = enableRealisticSustain.checked;
        
        // Initialize features that need activation
        initializeEnabledFeatures();
    }
    
    /**
     * Initialize features that are enabled
     */
    function initializeEnabledFeatures() {
        // Initialize realistic sustain if enabled
        if (physicsSettings.realisticSustain && window.initRealisticSustain) {
            window.initRealisticSustain();
        }
        
        // Initialize binaural reverb if enabled
        if (physicsSettings.binauralReverb && window.binauralReverbSettings) {
            window.binauralReverbSettings.enabled = true;
            if (window.initializeBinauralReverb) {
                window.initializeBinauralReverb();
            }
        }
        
        // Initialize fake binaural if enabled
        if (physicsSettings.fakeBinaural && window.fakeBinauralSettings) {
            window.fakeBinauralSettings.enabled = true;
            if (window.initializeFakeBinaural) {
                window.initializeFakeBinaural();
            }
        }
        
        // Initialize delay pseudo-reverb if enabled
        if (physicsSettings.delayPseudoReverb && window.delayPseudoReverbSettings) {
            window.delayPseudoReverbSettings.enabled = true;
            if (window.initializeDelayPseudoReverb) {
                window.initializeDelayPseudoReverb();
            }
        }
        
        // Update spectral balance enabled state
        if (window.spectralBalanceSettings) {
            window.spectralBalanceSettings.enabled = physicsSettings.spectralBalance;
        }
        
        // Reconnect audio chain to apply all changes
        if (window.reconnectAudioChain) {
            window.reconnectAudioChain();
        }
    }
    
    /**
     * Apply a preset configuration
     */
    function applyPreset(presetName) {
        const preset = settingsPresets[presetName];
        if (!preset) return;
        
        // Store old values to detect changes
        const oldBinauralReverb = physicsSettings.binauralReverb;
        const oldFakeBinaural = physicsSettings.fakeBinaural;
        
        // Apply preset to settings
        Object.keys(preset).forEach(key => {
            physicsSettings[key] = preset[key];
        });
        
        // Update UI checkboxes
        syncCheckboxes();
        
        // Trigger activation for binaural reverb if it was enabled
        if (physicsSettings.binauralReverb && !oldBinauralReverb) {
            // Update binaural reverb enabled state
            if (window.binauralReverbSettings) {
                window.binauralReverbSettings.enabled = true;
                // Initialize reverb if enabling
                if (window.initializeBinauralReverb) {
                    window.initializeBinauralReverb();
                }
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        } else if (!physicsSettings.binauralReverb && oldBinauralReverb) {
            // Disconnect reverb if disabling
            if (window.reconnectAudioChain) {
                window.reconnectAudioChain();
            }
        }
        
        // Trigger activation for fake binaural if it was enabled
        if (physicsSettings.fakeBinaural && !oldFakeBinaural) {
            // Update fake binaural enabled state
            if (window.fakeBinauralSettings) {
                window.fakeBinauralSettings.enabled = true;
                // Initialize fake binaural if enabling
                if (window.initializeFakeBinaural) {
                    window.initializeFakeBinaural();
                }
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        } else if (!physicsSettings.fakeBinaural && oldFakeBinaural) {
            // Reconnect audio chain if disabling
            if (window.reconnectAudioChain) {
                window.reconnectAudioChain();
            }
        }
    }

    if (settingsIcon) {
        settingsIcon.addEventListener('click', () => {
            settingsModal.classList.add('active');
            // Sync checkboxes with current settings
            syncCheckboxes();
        });
    }

    if (settingsClose) {
        settingsClose.addEventListener('click', () => {
            settingsModal.classList.remove('active');
        });
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('active');
            }
        });
    }

    if (enableVelocityTimbre) {
        enableVelocityTimbre.addEventListener('change', (e) => {
            physicsSettings.velocityTimbre = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableTwoStageDecay) {
        enableTwoStageDecay.addEventListener('change', (e) => {
            physicsSettings.twoStageDecay = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enablePedalCoupling) {
        enablePedalCoupling.addEventListener('change', (e) => {
            physicsSettings.pedalCoupling = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableSustainDecay) {
        enableSustainDecay.addEventListener('change', (e) => {
            physicsSettings.sustainDecay = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableAdvancedTimbre) {
        enableAdvancedTimbre.addEventListener('change', (e) => {
            physicsSettings.advancedTimbre = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableVelocityAttack) {
        enableVelocityAttack.addEventListener('change', (e) => {
            physicsSettings.velocityAttack = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableTimeVaryingBrightness) {
        enableTimeVaryingBrightness.addEventListener('change', (e) => {
            physicsSettings.timeVaryingBrightness = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableDynamicFilter) {
        enableDynamicFilter.addEventListener('change', (e) => {
            physicsSettings.dynamicFilter = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableFrequencyCompensation) {
        enableFrequencyCompensation.addEventListener('change', (e) => {
            physicsSettings.frequencyCompensation = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableFrequencyEnvelope) {
        enableFrequencyEnvelope.addEventListener('change', (e) => {
            physicsSettings.frequencyEnvelope = e.target.checked;
            // Note: Full per-voice frequency modulation requires synth reinitialization
            // For now, modulation is tracked but requires custom architecture for full implementation
            refreshSettingsDiff();
        });
    }

    if (enableBinauralReverb) {
        enableBinauralReverb.addEventListener('change', (e) => {
            physicsSettings.binauralReverb = e.target.checked;
            // Update binaural reverb enabled state
            if (window.binauralReverbSettings) {
                window.binauralReverbSettings.enabled = e.target.checked;
                if (e.target.checked) {
                    // Initialize reverb if enabling
                    if (window.initializeBinauralReverb) {
                        window.initializeBinauralReverb();
                    }
                    // Reconnect audio chain
                    if (window.reconnectAudioChain) {
                        window.reconnectAudioChain();
                    }
                } else {
                    // Disconnect reverb if disabling
                    if (window.reconnectAudioChain) {
                        window.reconnectAudioChain();
                    }
                }
            }
        });
    }

    if (enableFakeBinaural) {
        enableFakeBinaural.addEventListener('change', (e) => {
            physicsSettings.fakeBinaural = e.target.checked;
            // Update fake binaural enabled state
            if (window.fakeBinauralSettings) {
                window.fakeBinauralSettings.enabled = e.target.checked;
                if (e.target.checked) {
                    // Initialize fake binaural if enabling
                    if (window.initializeFakeBinaural) {
                        window.initializeFakeBinaural();
                    }
                }
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }

    if (enableSpectralBalance) {
        enableSpectralBalance.addEventListener('change', (e) => {
            physicsSettings.spectralBalance = e.target.checked;
            // Update spectral balance enabled state
            if (window.spectralBalanceSettings) {
                window.spectralBalanceSettings.enabled = e.target.checked;
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }


    // Priority 1: Critical Realism
    if (enableInharmonicity) {
        enableInharmonicity.addEventListener('change', (e) => {
            physicsSettings.inharmonicity = e.target.checked;
            refreshSettingsDiff();
        });
    }

    // Priority 2: High Impact
    if (enableAttackNoise) {
        enableAttackNoise.addEventListener('change', (e) => {
            physicsSettings.attackNoise = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableOddEvenHarmonicBalance) {
        enableOddEvenHarmonicBalance.addEventListener('change', (e) => {
            physicsSettings.oddEvenHarmonicBalance = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enablePitchHarmonicRolloff) {
        enablePitchHarmonicRolloff.addEventListener('change', (e) => {
            physicsSettings.pitchHarmonicRolloff = e.target.checked;
            refreshSettingsDiff();
        });
    }

    // Priority 3: Polish & Detail
    if (enablePerPartialDecay) {
        enablePerPartialDecay.addEventListener('change', (e) => {
            physicsSettings.perPartialDecay = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableReleaseTransient) {
        enableReleaseTransient.addEventListener('change', (e) => {
            physicsSettings.releaseTransient = e.target.checked;
            refreshSettingsDiff();
        });
    }

    // New Research Features: Delay & Resonance
    if (enableVelocitySensitiveDelay) {
        enableVelocitySensitiveDelay.addEventListener('change', (e) => {
            physicsSettings.velocitySensitiveDelay = e.target.checked;
            // Reconnect audio chain if needed
            if (window.reconnectAudioChain) {
                window.reconnectAudioChain();
            }
        });
    }

    if (enableSympatheticResonanceDelay) {
        enableSympatheticResonanceDelay.addEventListener('change', (e) => {
            physicsSettings.sympatheticResonanceDelay = e.target.checked;
            // Reconnect audio chain if needed
            if (window.reconnectAudioChain) {
                window.reconnectAudioChain();
            }
        });
    }

    if (enableSpectralResonanceDelay) {
        enableSpectralResonanceDelay.addEventListener('change', (e) => {
            physicsSettings.spectralResonanceDelay = e.target.checked;
            // Reconnect audio chain if needed
            if (window.reconnectAudioChain) {
                window.reconnectAudioChain();
            }
        });
    }

    if (enableDelayPseudoReverb) {
        enableDelayPseudoReverb.addEventListener('change', (e) => {
            physicsSettings.delayPseudoReverb = e.target.checked;
            // Update delay pseudo-reverb enabled state
            if (window.delayPseudoReverbSettings) {
                window.delayPseudoReverbSettings.enabled = e.target.checked;
                if (e.target.checked) {
                    // Initialize delay pseudo-reverb if enabling
                    if (window.initializeDelayPseudoReverb) {
                        window.initializeDelayPseudoReverb();
                    }
                }
                // Reconnect audio chain
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }
    
    if (enableTremolo) {
        enableTremolo.addEventListener('change', (e) => {
            physicsSettings.tremolo = e.target.checked;
            // Update tremolo enabled state
            if (window.tremoloSettings) {
                window.tremoloSettings.enabled = e.target.checked;
                // Reconnect audio chain to apply changes
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        });
    }

    // New Research Features: Sustain Physics
    if (enablePianoEnvelopeModel) {
        enablePianoEnvelopeModel.addEventListener('change', (e) => {
            physicsSettings.pianoEnvelopeModel = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableHarmonicProfileEvolution) {
        enableHarmonicProfileEvolution.addEventListener('change', (e) => {
            physicsSettings.harmonicProfileEvolution = e.target.checked;
            refreshSettingsDiff();
        });
    }

    if (enableRealisticSustain) {
        enableRealisticSustain.addEventListener('change', (e) => {
            physicsSettings.realisticSustain = e.target.checked;
            // Initialize or cleanup realistic sustain system
            if (e.target.checked && window.initRealisticSustain) {
                window.initRealisticSustain();
            }
            refreshSettingsDiff();
        });
    }

    // Setup binaural reverb settings button
    const binauralReverbSettingsBtn = document.getElementById('binaural-reverb-settings-btn');
    if (binauralReverbSettingsBtn) {
        binauralReverbSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openBinauralReverbSettings) {
                window.openBinauralReverbSettings();
            }
        });
    }

    // Initialize binaural reverb settings popup
    if (window.initBinauralReverbSettings) {
        window.initBinauralReverbSettings();
    }

    // Setup fake binaural settings button
    const fakeBinauralSettingsBtn = document.getElementById('fake-binaural-settings-btn');
    if (fakeBinauralSettingsBtn) {
        fakeBinauralSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openFakeBinauralSettings) {
                window.openFakeBinauralSettings();
            }
        });
    }

    // Initialize fake binaural settings popup
    if (window.initFakeBinauralSettings) {
        window.initFakeBinauralSettings();
    }

    // Setup velocity mapping settings button
    const velocityMappingSettingsBtn = document.getElementById('velocity-mapping-settings-btn');
    if (velocityMappingSettingsBtn) {
        velocityMappingSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openVelocityMappingSettings) {
                window.openVelocityMappingSettings();
            }
        });
    }

    // Initialize velocity mapping settings popup
    if (window.initVelocityMappingSettings) {
        window.initVelocityMappingSettings();
    }

    // Setup inharmonicity settings button
    const inharmonicitySettingsBtn = document.getElementById('inharmonicity-settings-btn');
    if (inharmonicitySettingsBtn) {
        inharmonicitySettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openInharmonicitySettings) {
                window.openInharmonicitySettings();
            }
        });
    }

    // Initialize inharmonicity settings popup
    if (window.initInharmonicitySettings) {
        window.initInharmonicitySettings();
    }

    // Setup frequency compensation settings button
    const frequencyCompensationSettingsBtn = document.getElementById('frequency-compensation-settings-btn');
    if (frequencyCompensationSettingsBtn) {
        frequencyCompensationSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openFrequencyCompensationSettings) {
                window.openFrequencyCompensationSettings();
            }
        });
    }

    // Initialize frequency compensation settings popup
    if (window.initFrequencyCompensationSettings) {
        window.initFrequencyCompensationSettings();
    }

    // Setup spectral balance settings button
    const spectralBalanceSettingsBtn = document.getElementById('spectral-balance-settings-btn');
    if (spectralBalanceSettingsBtn) {
        spectralBalanceSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openSpectralBalanceSettings) {
                window.openSpectralBalanceSettings();
            }
        });
    }

    // Initialize spectral balance settings popup
    if (window.initSpectralBalanceSettings) {
        window.initSpectralBalanceSettings();
    }

    // Setup delay pseudo-reverb settings button
    const delayPseudoReverbSettingsBtn = document.getElementById('delay-pseudo-reverb-settings-btn');
    if (delayPseudoReverbSettingsBtn) {
        delayPseudoReverbSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openDelayPseudoReverbSettings) {
                window.openDelayPseudoReverbSettings();
            }
        });
    }

    // Initialize delay pseudo-reverb settings popup
    if (window.initDelayPseudoReverbSettings) {
        window.initDelayPseudoReverbSettings();
    }


    // Setup sustain decay settings button
    const sustainDecaySettingsBtn = document.getElementById('sustain-decay-settings-btn');
    if (sustainDecaySettingsBtn) {
        sustainDecaySettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openSustainDecaySettings) {
                window.openSustainDecaySettings();
            }
        });
    }

    // Initialize sustain decay settings popup
    if (window.initSustainDecaySettings) {
        window.initSustainDecaySettings();
    }

    // Setup piano envelope model settings button
    const pianoEnvelopeModelSettingsBtn = document.getElementById('piano-envelope-model-settings-btn');
    if (pianoEnvelopeModelSettingsBtn) {
        pianoEnvelopeModelSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openPianoEnvelopeModelSettings) {
                window.openPianoEnvelopeModelSettings();
            }
        });
    }

    // Initialize piano envelope model settings popup
    if (window.initPianoEnvelopeModelSettings) {
        window.initPianoEnvelopeModelSettings();
    }

    // Setup pitch harmonic rolloff settings button
    const pitchHarmonicRolloffSettingsBtn = document.getElementById('pitch-harmonic-rolloff-settings-btn');
    if (pitchHarmonicRolloffSettingsBtn) {
        pitchHarmonicRolloffSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openPitchHarmonicRolloffSettings) {
                window.openPitchHarmonicRolloffSettings();
            }
        });
    }

    // Initialize pitch harmonic rolloff settings popup
    if (window.initPitchHarmonicRolloffSettings) {
        window.initPitchHarmonicRolloffSettings();
    }

    // Setup envelope settings button
    const envelopeSettingsBtn = document.getElementById('envelope-settings-btn');
    if (envelopeSettingsBtn) {
        envelopeSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openEnvelopeSettings) {
                window.openEnvelopeSettings();
            }
        });
    }

    // Initialize envelope settings popup
    if (window.initEnvelopeSettings) {
        window.initEnvelopeSettings();
    }
    
    // Setup harmonic profile evolution settings button
    const harmonicProfileEvolutionSettingsBtn = document.getElementById('harmonic-profile-evolution-settings-btn');
    if (harmonicProfileEvolutionSettingsBtn) {
        harmonicProfileEvolutionSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openHarmonicProfileEvolutionSettings) {
                window.openHarmonicProfileEvolutionSettings();
            }
        });
    }
    
    // Initialize harmonic profile evolution settings popup
    if (window.initHarmonicProfileEvolutionSettings) {
        window.initHarmonicProfileEvolutionSettings();
    }
    
    // Setup chorus settings button
    const chorusSettingsBtn = document.getElementById('chorus-settings-btn');
    if (chorusSettingsBtn) {
        chorusSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.openChorusSettings) {
                window.openChorusSettings();
            }
        });
    }
    
    // Initialize chorus settings popup
    if (window.initChorusSettings) {
        window.initChorusSettings();
    }
    
    // On page load: Read checkbox states and sync settings, then initialize features
    // This ensures that features are activated when checkboxes are checked in HTML
    // Use a small delay to ensure all modules are loaded
    setTimeout(() => {
        syncSettingsFromCheckboxes();
    }, 100);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.physicsSettings = physicsSettings;
    window.initPhysicsSettings = initPhysicsSettings;
    window.defaultPhysicsSettings = defaultSettings; // Export defaults for comparison
}

