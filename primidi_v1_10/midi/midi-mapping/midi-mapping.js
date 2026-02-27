/**
 * MIDI Mapping Module
 * Handles mapping of MIDI events to audio synthesis with ADSR envelopes,
 * velocity mapping, physics effects, and visual feedback
 */

(function() {
    'use strict';
    
    // Dependencies (set via initMidiMapping)
    let synth = null;
    let keyMap = null;
    let dynamicFilter = null;
    let sustainPedalActiveRef = null; // Reference to sustainPedalActive variable
    let pressKeyFn = null;
    let releaseKeyFn = null;
    let midiNoteToNoteNameFn = null;
    
    // State tracking (passed from main.js)
    let activeNotes = null;
    let physicallyHeldNotes = null;
    let sustainedNotes = null;
    let noteAttackTimes = null;
    let frequencyModulations = null;
    let attackNoiseNodes = null;
    let releaseTransientNodes = null;
    let unisonVoices = null;
    let sustainDecayAutomations = null;
    let noteVolumeNodes = null;
    
    /**
     * Convert MIDI note number to frequency in Hz
     * Formula: f = 440 * 2^((n - 69) / 12) where n is MIDI note number
     * @param {number} midiNote - MIDI note number (0-127)
     * @returns {number} - Frequency in Hz
     */
    function midiNoteToFrequency(midiNote) {
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }
    
    // Export globally for use by other modules
    if (typeof window !== 'undefined') {
        window.midiNoteToFrequency = midiNoteToFrequency;
    }
    
    /**
     * Stage 1: Velocity to Amplitude Mapping
     * Uses constant k value (recommended: 1.8-2.2, default 2.0)
     * This controls the "feel" of the velocity response
     * 
     * @param {number} velocity - MIDI velocity (0-127)
     * @param {number} k - Exponent (default 2.0, range 1.5-2.5)
     * @returns {number} - Amplitude (0-1)
     */
    function velocityToAmplitude(velocity, k = 2.0) {
        // Clamp velocity to valid range
        const clampedVel = Math.max(0, Math.min(127, velocity));
        
        // Apply minimum velocity threshold - velocities below 5 produce no sound
        // This prevents very quiet notes from being too loud
        if (clampedVel < 5) {
            return 0;
        }
        
        // Normalize to 0-1 range, but adjust for minimum threshold
        // Map 5-127 to 0-1 range for more sensitive low-velocity response
        const normalized = (clampedVel - 5) / (127 - 5);
        
        // Apply power curve with steeper exponent for better low-velocity sensitivity
        // Use slightly higher exponent (2.2) to make low velocities quieter
        return Math.pow(normalized, k * 1.1);
    }
    
    /**
     * Complete Two-Stage Mapping: Velocity → Final Amplitude
     * Uses frequency-compensation.js module for Stage 2 if enabled
     * 
     * @param {number} velocity - MIDI velocity (0-127)
     * @param {number} midiNote - MIDI note number (for frequency calculation)
     * @param {number} k - Velocity exponent (default 2.0)
     * @param {number} targetSPL - Target listening level (default 85)
     * @returns {number} - Final amplitude (0-1) with optional frequency compensation applied
     */
    function velocityToAmplitudeWithCompensation(velocity, midiNote, k = 2.0, targetSPL = 85) {
        // Stage 1: Velocity → Base Amplitude
        const baseAmplitude = velocityToAmplitude(velocity, k);
        
        // Stage 2: Apply frequency compensation (if enabled and module available)
        if (window.applyFrequencyCompensation) {
            const frequency = midiNoteToFrequency(midiNote);
            // Use frequency compensation settings if available, otherwise use provided targetSPL
            const compensationSPL = (window.frequencyCompensationSettings && window.frequencyCompensationSettings.targetSPL) 
                ? window.frequencyCompensationSettings.targetSPL 
                : targetSPL;
            return window.applyFrequencyCompensation(baseAmplitude, frequency, compensationSPL);
        }
        
        // Fallback: no compensation
        return baseAmplitude;
    }
    
    /**
     * Initialize MIDI mapping module
     * @param {Object} dependencies - All required dependencies
     */
    window.initMidiMapping = function(dependencies) {
        synth = dependencies.synth;
        keyMap = dependencies.keyMap;
        dynamicFilter = dependencies.dynamicFilter;
        sustainPedalActiveRef = dependencies.sustainPedalActiveRef;
        pressKeyFn = dependencies.pressKey;
        releaseKeyFn = dependencies.releaseKey;
        midiNoteToNoteNameFn = dependencies.midiNoteToNoteName;
        
        // State tracking
        activeNotes = dependencies.activeNotes;
        physicallyHeldNotes = dependencies.physicallyHeldNotes;
        sustainedNotes = dependencies.sustainedNotes;
        noteAttackTimes = dependencies.noteAttackTimes;
        frequencyModulations = dependencies.frequencyModulations;
        attackNoiseNodes = dependencies.attackNoiseNodes;
        releaseTransientNodes = dependencies.releaseTransientNodes;
        unisonVoices = dependencies.unisonVoices;
        sustainDecayAutomations = dependencies.sustainDecayAutomations;
        noteVolumeNodes = dependencies.noteVolumeNodes;
    };
    
    /**
     * Handle MIDI note on event
     * @param {number} midiNote - MIDI note number (0-127)
     * @param {number} velocity - MIDI velocity (0-127)
     */
    window.handleMidiNoteOn = function(midiNote, velocity) {
        // Show MIDI debug info if enabled
        if (window.showMidiDebugNoteOn) {
            window.showMidiDebugNoteOn(midiNote, velocity);
        }
        
        const noteName = midiNoteToNoteNameFn(midiNote);
        if (!noteName) return;
        
        // If this note is already active, release it first to prevent multiple voices
        // This is especially important when pressing the same note multiple times while sustain is active
        if (activeNotes.has(midiNote)) {
            // CRITICAL: Release visual key first to prevent cumulative movement
            // This ensures visual state matches audio state
            releaseKeyFn(midiNote);
            
            // Release all voices for this note (including unison voices if any)
            // Use immediate cleanup when retriggering to free partials immediately
            if (synth) {
                const voicesToRelease = unisonVoices.get(midiNote);
                if (voicesToRelease && voicesToRelease.length > 0) {
                    // Release all tracked voices with immediate cleanup
                    // Use releaseAllVoices for each note name to ensure all voices are released
                    const uniqueNoteNames = [...new Set(voicesToRelease)];
                    uniqueNoteNames.forEach(voiceNoteName => {
                        try {
                            if (synth.releaseAllVoices) {
                                synth.releaseAllVoices(voiceNoteName);
                            } else {
                                // Fallback: release one voice at a time
                                while (true) {
                                    try {
                                        synth.triggerRelease(voiceNoteName);
                                    } catch (e) {
                                        break; // No more voices
                                    }
                                }
                            }
                        } catch (e) {
                            // Ignore errors
                        }
                    });
                    unisonVoices.delete(midiNote);
                } else {
                    // Release all voices for the main note with immediate cleanup
                    try {
                        if (synth.releaseAllVoices) {
                            synth.releaseAllVoices(noteName);
                        } else {
                            // Fallback: release one voice at a time
                            while (true) {
                                try {
                                    synth.triggerRelease(noteName);
                                } catch (e) {
                                    break; // No more voices
                                }
                            }
                        }
                    } catch (e) {
                        // Ignore errors if note doesn't exist
                    }
                }
            }
        }
        
        // Track that this note is physically held
        physicallyHeldNotes.add(midiNote);
        // Remove from sustained notes if it was there (now physically held again)
        sustainedNotes.delete(midiNote);
        // Track as active note
        activeNotes.set(midiNote, noteName);
        
        // Get base envelope settings from envelope-settings.js module
        const baseEnvelope = (window.envelopeSettings) ? window.envelopeSettings : {
            attack: 0.01,   // Default 10ms
            decay: 0.1,     // Default 100ms
            sustain: 0.3,   // Default 0.3
            release: 0.5    // Default 500ms
        };
        
        // Set frequency-dependent envelope parameters for this note (based on research3)
        // Lower notes have longer release times, higher notes have shorter release times
        // Use envelope settings as base (from envelope-settings.js module)
        const releaseTime = baseEnvelope.release;
        
        // Calculate two-stage decay parameters (research4) - from two-stage-decay.js module
        // If two-stage decay is enabled, use it; otherwise use envelope settings
        const twoStageDecay = window.calculateTwoStageDecay ? window.calculateTwoStageDecay(velocity) : { decay1: 0.1, decay2: 2.0, amplitudeRatio: 0.7 };
        const decayTime = (window.physicsSettings && window.physicsSettings.twoStageDecay) ? 
            twoStageDecay.decay1 : baseEnvelope.decay;
        
        // Get frequency for this note (needed for balanced attack time and filter keytracking)
        const frequency = midiNoteToFrequency(midiNote);
        
        // Get velocity-dependent attack time (from velocity-attack.js module)
        // If velocity-dependent attack is enabled, use it; otherwise use envelope settings
        // Pass primary envelope attack as base for velocity-dependent scaling
        // Use balanced attack time if available (Phase 3: frequency-dependent)
        let attackTime;
        if (window.physicsSettings && window.physicsSettings.velocityAttack) {
            if (window.getBalancedAttackTime) {
                // Use balanced attack time (frequency-dependent)
                attackTime = window.getBalancedAttackTime(frequency, velocity, baseEnvelope.attack);
            } else if (window.getAttackTimeForVelocity) {
                // Fallback to velocity-only attack time
                attackTime = window.getAttackTimeForVelocity(velocity, baseEnvelope.attack);
            } else {
                attackTime = baseEnvelope.attack;
            }
        } else {
            attackTime = baseEnvelope.attack;
        }
        
        // Store note attack info for dynamic filter control
        // Store timestamp when note was attacked (for filter decay calculation)
        const attackTimestamp = Tone.now();
        noteAttackTimes.set(midiNote, {
            attackTimestamp: attackTimestamp,
            velocity: velocity,
            frequency: frequency
        });
        
        // Create frequency modulation controller (if enabled)
        if (window.physicsSettings && window.physicsSettings.frequencyEnvelope && window.createFrequencyModulation) {
            const modulation = window.createFrequencyModulation(frequency, attackTime);
            frequencyModulations.set(midiNote, {
                modulation: modulation,
                releaseTime: null,
                baseFrequency: frequency
            });
        }
        
        // Apply inharmonicity to fundamental frequency (if enabled)
        // NOW INCLUDES VELOCITY DEPENDENCY: harder strike = more inharmonicity
        let adjustedFrequency = frequency;
        if (window.physicsSettings && window.physicsSettings.inharmonicity && window.getInharmonicFundamentalFrequency) {
            adjustedFrequency = window.getInharmonicFundamentalFrequency(frequency, midiNote, velocity);
        }
        
        // Apply per-partial decay rates to envelope (if enabled)
        let adjustedDecayTime = decayTime;
        if (window.physicsSettings && window.physicsSettings.perPartialDecay && window.getPerPartialDecayEnvelope) {
            const perPartialEnvelope = window.getPerPartialDecayEnvelope(decayTime, 10);
            adjustedDecayTime = perPartialEnvelope.decay;
        }
        
        // Get effective sustain level (may be boosted by sustain pedal)
        let effectiveSustain = baseEnvelope.sustain;
        if (window.getEffectiveSustain) {
            effectiveSustain = window.getEffectiveSustain();
        }
        // Apply two-stage decay adjustment if enabled
        if (window.physicsSettings && window.physicsSettings.twoStageDecay) {
            effectiveSustain = effectiveSustain * twoStageDecay.amplitudeRatio;
        }
        
        // Update envelope parameters on the synth before triggering
        // Note: synth.set() affects all voices, but since we call it right before triggerAttack,
        // the new voice will use these settings. For true per-voice control, we'd need
        // individual synths per note (more CPU-intensive).
        if (!synth) {
            console.warn('Synth not initialized yet, cannot set envelope parameters');
            return; // Cannot proceed without synth
        }
        
        // Use setNoteEnvelope for per-note control (Web Audio API supports this)
        if (synth.setNoteEnvelope) {
            synth.setNoteEnvelope(noteName, {
                attack: attackTime,
                decay: adjustedDecayTime,
                sustain: effectiveSustain,
                release: releaseTime
            });
        } else if (synth.set) {
            // Fallback to global set() for Tone.js compatibility
            synth.set({
                oscillator: {
                    type: 'triangle' // Use triangle (has harmonics) - filter controls brightness
                },
                envelope: {
                    attack: attackTime,
                    decay: adjustedDecayTime,
                    sustain: effectiveSustain,
                    release: releaseTime
                }
            });
        }
        
        // Update dynamic filter based on this note (if enabled)
        if (window.physicsSettings && window.physicsSettings.dynamicFilter && window.getDynamicFilterSettings && dynamicFilter) {
            const filterSettings = window.getDynamicFilterSettings(velocity, frequency, 0);
            // Smoothly update filter cutoff using Web Audio API
            if (dynamicFilter.frequency && synth && synth.synth && synth.synth.audioCtx) {
                const filterNow = synth.synth.audioCtx.currentTime;
                dynamicFilter.frequency.cancelScheduledValues(filterNow);
                dynamicFilter.frequency.setValueAtTime(dynamicFilter.frequency.value, filterNow);
                dynamicFilter.frequency.exponentialRampToValueAtTime(filterSettings.frequency, filterNow + 0.01);
            }
        }
        
        // Play sound with two-stage velocity mapping (velocity curve + frequency compensation)
        // Uses settings from velocity-mapping-settings.js if available, otherwise defaults
        const k = (window.velocityMappingSettings && window.velocityMappingSettings.velocityExponent) ? window.velocityMappingSettings.velocityExponent : 2.0;
        const targetSPL = (window.velocityMappingSettings && window.velocityMappingSettings.targetSPL) ? window.velocityMappingSettings.targetSPL : 85;
        let amplitude = velocityToAmplitudeWithCompensation(velocity, midiNote, k, targetSPL);
        
        // Apply pedal coupling (research4) - adds sympathetic resonance - from pedal-coupling.js module
        const isPedalActive = sustainPedalActiveRef && (sustainPedalActiveRef.value !== undefined ? sustainPedalActiveRef.value : false);
        if (window.physicsSettings && window.physicsSettings.pedalCoupling && isPedalActive && window.applyPedalCoupling) {
            const freq = midiNoteToFrequency(midiNote);
            const couplingGain = window.applyPedalCoupling(freq, velocity, 1.0, activeNotes, midiNoteToFrequency);
            amplitude = Math.min(1.0, amplitude + couplingGain);
        }
        
        // Trigger the note
        if (!synth) {
            console.warn('Synth not initialized yet, cannot trigger note');
            return; // Cannot proceed without synth
        }
        
        synth.triggerAttack(noteName, undefined, amplitude);
        // Track the note name for release
        unisonVoices.set(midiNote, [noteName]);
        
        // Handle realistic sustain system (if enabled)
        if (window.physicsSettings && window.physicsSettings.realisticSustain && window.noteOnRealisticSustain) {
            window.noteOnRealisticSustain(midiNote, frequency, velocity);
        }
        
        // Create and start attack noise (if enabled)
        if (window.physicsSettings && window.physicsSettings.attackNoise && window.createAttackNoiseNode) {
            const attackNoiseNode = window.createAttackNoiseNode(velocity, frequency);
            if (attackNoiseNode) {
                attackNoiseNodes.set(midiNote, attackNoiseNode);
                // Connect noise to audio chain
                attackNoiseNode.gain.connect(dynamicFilter || synth);
                attackNoiseNode.start();
            }
        }
        
        // Visual feedback - pass velocity for velocity-based animation duration
        pressKeyFn(midiNote, velocity);
    };
    
    /**
     * Handle MIDI note off event
     * @param {number} midiNote - MIDI note number (0-127)
     */
    window.handleMidiNoteOff = function(midiNote) {
        // Show MIDI debug info if enabled
        if (window.showMidiDebugNoteOff) {
            window.showMidiDebugNoteOff(midiNote);
        }
        
        const noteName = midiNoteToNoteNameFn(midiNote);
        if (!noteName) return;
        
        // Remove from physically held notes
        physicallyHeldNotes.delete(midiNote);
        
        // Stop attack noise if it exists
        if (attackNoiseNodes.has(midiNote)) {
            const noiseNode = attackNoiseNodes.get(midiNote);
            if (noiseNode && noiseNode.stop) {
                noiseNode.stop();
            }
            attackNoiseNodes.delete(midiNote);
        }
        
        // Create and trigger release transient (if enabled)
        if (window.physicsSettings && window.physicsSettings.releaseTransient && window.createReleaseTransientNode) {
            const frequency = midiNoteToFrequency(midiNote);
            const currentAmplitude = activeNotes.has(midiNote) ? 0.5 : 0.3; // Estimate current amplitude
            const transientAmplitude = window.calculateReleaseTransientAmplitude ? 
                window.calculateReleaseTransientAmplitude(currentAmplitude, null) : currentAmplitude * 0.1;
            
            const releaseTransientNode = window.createReleaseTransientNode(frequency, transientAmplitude);
            if (releaseTransientNode) {
                releaseTransientNodes.set(midiNote, releaseTransientNode);
                // Connect transient to audio chain
                releaseTransientNode.gain.connect(dynamicFilter || synth);
                releaseTransientNode.start();
                
                // Auto-cleanup after transient duration
                const duration = window.calculateReleaseTransientDuration ? 
                    window.calculateReleaseTransientDuration(frequency) : 0.03;
                setTimeout(() => {
                    if (releaseTransientNodes.has(midiNote)) {
                        const node = releaseTransientNodes.get(midiNote);
                        if (node && node.stop) {
                            node.stop();
                        }
                        releaseTransientNodes.delete(midiNote);
                    }
                }, duration * 1000 + 100);
            }
        }
        
        // Handle realistic sustain system key release (if enabled)
        if (window.physicsSettings && window.physicsSettings.realisticSustain && window.keyReleasedRealisticSustain) {
            window.keyReleasedRealisticSustain(midiNote);
        }
        
        // Release sound only if sustain pedal is not active
        if (!sustainPedalActiveRef || !sustainPedalActiveRef.value) {
            // Cancel any sustain decay if it exists
            if (sustainDecayAutomations.has(midiNote)) {
                const automation = sustainDecayAutomations.get(midiNote);
                if (automation && automation.cancel) {
                    automation.cancel();
                }
                sustainDecayAutomations.delete(midiNote);
            }
            
            // Release all voices for this note (including unison voices if any)
            if (synth) {
                const voicesToRelease = unisonVoices.get(midiNote);
                if (voicesToRelease && voicesToRelease.length > 0) {
                    // Release all tracked voices - use releaseAllVoices to ensure all voices are released
                    const uniqueNoteNames = [...new Set(voicesToRelease)];
                    uniqueNoteNames.forEach(voiceNoteName => {
                        try {
                            if (synth.releaseAllVoices) {
                                synth.releaseAllVoices(voiceNoteName);
                            } else {
                                // Fallback: release one at a time until none left
                                while (true) {
                                    try {
                                        synth.triggerRelease(voiceNoteName);
                                    } catch (e) {
                                        break; // No more voices
                                    }
                                }
                            }
                        } catch (e) {
                            // If note doesn't exist (voice was stolen), that's okay
                            console.warn('Note release failed (may have been voice-stolen):', voiceNoteName);
                        }
                    });
                    // Clean up tracking
                    unisonVoices.delete(midiNote);
                } else {
                    // Release all voices for the main note
                    try {
                        if (synth.releaseAllVoices) {
                            synth.releaseAllVoices(noteName);
                        } else {
                            // Fallback: release one at a time until none left
                            while (true) {
                                try {
                                    synth.triggerRelease(noteName);
                                } catch (e) {
                                    break; // No more voices
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('Note release failed (may have been voice-stolen):', noteName);
                    }
                }
            }
            
            activeNotes.delete(midiNote);
            sustainedNotes.delete(midiNote); // Clean up if it was there
            noteAttackTimes.delete(midiNote); // Clean up attack time tracking
            
            // Clean up realistic sustain note (if enabled)
            if (window.physicsSettings && window.physicsSettings.realisticSustain && window.cleanupNoteRealisticSustain) {
                window.cleanupNoteRealisticSustain(midiNote);
            }
            
            // Mark frequency modulation as released
            if (frequencyModulations.has(midiNote)) {
                const modData = frequencyModulations.get(midiNote);
                if (modData.modulation && modData.modulation.release) {
                    modData.modulation.release();
                    modData.releaseTime = Tone.now();
                }
            }
        } else {
            // Sustain is active: mark this note as sustained (not physically held)
            sustainedNotes.add(midiNote);
            
            // Update synth state: key is released but note is sustained
            if (synth && synth.synth && typeof synth.synth.updateNoteKeyState === 'function') {
                synth.synth.updateNoteKeyState(noteName, false);
            }
            
            // Start gradual decay for this sustained note (if feature is enabled)
            if (window.startSustainDecay) {
                window.startSustainDecay(midiNote, noteName, {
                    sustainedNotes,
                    physicallyHeldNotes,
                    activeNotes,
                    sustainDecayAutomations,
                    noteVolumeNodes,
                    synth
                });
            }
            // Mark frequency modulation as released (for release drift)
            if (frequencyModulations.has(midiNote)) {
                const modData = frequencyModulations.get(midiNote);
                if (modData.modulation && modData.modulation.release) {
                    modData.modulation.release();
                    modData.releaseTime = Tone.now();
                }
            }
            // Keep the note in activeNotes (don't release it immediately)
        }
        
        // Visual feedback - always release key visually
        releaseKeyFn(midiNote);
    };
    
    /**
     * Update synth envelope sustain level
     * Called when effective sustain changes (e.g., sustain pedal boost)
     * @param {number} sustainLevel - New sustain level (0-1)
     */
    window.updateSynthEnvelopeSustain = function(sustainLevel) {
        if (!synth) return;
        
        // Update synth sustain for all voices
        // Note: This affects all active voices, but Tone.js PolySynth doesn't support per-voice control
        synth.set({
            envelope: {
                sustain: sustainLevel
            }
        });
    };
    
    /**
     * Handle MIDI control change event
     * @param {number} controller - Controller number (0-127)
     * @param {number} value - Controller value (0-127)
     */
    window.handleMidiControlChange = function(controller, value) {
        // Sustain pedal is controller 64
        if (controller === 64 && sustainPedalActiveRef) {
            const wasActive = sustainPedalActiveRef.value;
            const isNowActive = value >= 64; // >= 64 means pedal down
            sustainPedalActiveRef.value = isNowActive;
            
            // Handle spectral balance gain reduction on sustain pedal change
            if (window.handleSustainPedalChangeSpectralBalance) {
                window.handleSustainPedalChangeSpectralBalance(isNowActive);
            }
            
            // Handle envelope sustain boost on sustain pedal change
            if (window.handleSustainPedalChangeEnvelope) {
                window.handleSustainPedalChangeEnvelope(isNowActive);
            }
            
            // If sustain pedal is released, release only the sustained notes
            if (wasActive && !sustainPedalActiveRef.value) {
                // Create a copy to avoid modification during iteration
                const notesToRelease = Array.from(sustainedNotes);
                notesToRelease.forEach((midiNote) => {
                    // Stop attack noise if it exists
                    if (attackNoiseNodes.has(midiNote)) {
                        const noiseNode = attackNoiseNodes.get(midiNote);
                        if (noiseNode && noiseNode.stop) {
                            noiseNode.stop();
                        }
                        attackNoiseNodes.delete(midiNote);
                    }
                    
                    // Stop release transient if it exists
                    if (releaseTransientNodes.has(midiNote)) {
                        const transientNode = releaseTransientNodes.get(midiNote);
                        if (transientNode && transientNode.stop) {
                            transientNode.stop();
                        }
                        releaseTransientNodes.delete(midiNote);
                    }
                    
                    // Cancel any sustain decay automation
                    if (sustainDecayAutomations.has(midiNote)) {
                        const automation = sustainDecayAutomations.get(midiNote);
                        if (automation && automation.cancel) {
                            automation.cancel();
                        }
                        sustainDecayAutomations.delete(midiNote);
                    }
                    
                    // Release all voices for this note (including unison voices if any)
                    if (synth) {
                        const voicesToRelease = unisonVoices.get(midiNote);
                        if (voicesToRelease && voicesToRelease.length > 0) {
                            // Release all tracked voices (including duplicates - each triggerAttack needs a triggerRelease)
                            // Important: Even if multiple strings round to the same note name, we must release each one
                            voicesToRelease.forEach(voiceNoteName => {
                                try {
                                    synth.triggerRelease(voiceNoteName);
                                } catch (e) {
                                    // Ignore errors
                                }
                            });
                            // Clean up tracking
                            unisonVoices.delete(midiNote);
                        } else {
                            // Fallback: release main note name
                            const noteName = activeNotes.get(midiNote);
                            if (noteName) {
                                try {
                                    synth.triggerRelease(noteName);
                                } catch (e) {
                                    // Ignore errors
                                }
                            }
                        }
                    }
                    activeNotes.delete(midiNote);
                    sustainedNotes.delete(midiNote);
                    noteAttackTimes.delete(midiNote); // Clean up attack time tracking
                    frequencyModulations.delete(midiNote); // Clean up frequency modulation
                    
                    // Remove from attack darkening tracking
                    if (window.removeAttackDarkeningNote) {
                        window.removeAttackDarkeningNote(midiNote);
                    }
                });
            }
        }
    };
    
    console.log('MIDI Mapping module loaded');
})();

