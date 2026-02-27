/**
 * Web Audio API Additive Synthesis Engine
 * Based on research recommendations for efficient, realistic piano synthesis
 * 
 * Features:
 * - Object pooling for AudioNodes (critical for performance)
 * - Pre-computed spectral profiles for all velocities
 * - Per-voice control for realistic behavior
 * - Adaptive partial culling (LOD system)
 */

class AdditiveSynth {
    constructor(audioContext) {
        this.audioCtx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.partialPool = new PartialPool(128, this.audioCtx); // Increased to 128 partials for better polyphony
        this.spectralCache = new Map(); // baseFreq -> SpectralProfile
        this.activeNotes = new Map(); // noteId -> {partials: [], gainNode: GainNode, frequency, velocity, startTime, keyDown, pedalDown}
        this.pendingCleanups = new Map(); // noteId -> setTimeout ID (to cancel if needed)
        this.maxPartials = 12; // Reduced from 32 to 12 partials per note for better polyphony
        this.baseFreq = null; // Will be set per spectral profile
        
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor();
        
        // Master output
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.25; // Reduced master volume for better velocity sensitivity (was 0.4, still too loud for low velocities)
        this.masterGain.connect(this.audioCtx.destination);
        
        // Start continuous harmonic evolution update loop
        this.updateInterval = null;
        this.startHarmonicEvolution();
        
        // Start performance adaptation
        this.adaptToPerformance();
    }
    
    /**
     * Calculate prime factor weight (pre-computed lookup)
     */
    getPrimeFactorWeight(n) {
        // Small lookup table for first 32 numbers
        const primeWeights = [
            0, 0, 1, 1, 0.5, 1, 0.33, 1, 0.25, 0.5, 0.2, 1, 0.16, 1, 0.14, 0.33,
            0.125, 1, 0.11, 1, 0.1, 0.09, 0.08, 1, 0.07, 0.06, 0.05, 1, 0.04, 0.03, 0.02, 0.01
        ];
        return primeWeights[n] || 0.01;
    }
    
    /**
     * Calculate amplitude for a harmonic based on velocity and pitch
     * Uses improved models from piano-acoustics-foundations.md research:
     * - Pitch-dependent rolloff (bass has more harmonics than treble)
     * - Velocity-dependent brightness boost
     * - Odd/even harmonic balance (pianos emphasize odd harmonics)
     * 
     * @param {number} harmonicNum - Harmonic number (1 = fundamental, 2 = 2nd harmonic, etc.)
     * @param {number} velocity - MIDI velocity (0-127)
     * @param {number} fundamentalFreq - Fundamental frequency in Hz (for pitch-dependent rolloff)
     * @returns {number} - Amplitude multiplier (0-1)
     */
    calcAmplitude(harmonicNum, velocity, fundamentalFreq = null) {
        // If fundamentalFreq not provided, use a fallback (will be set by SpectralProfile)
        if (fundamentalFreq === null) {
            fundamentalFreq = 440; // Default to A4 if not provided
        }
        
        // 1. Base pitch-dependent rolloff (research: exp(-k × α(f₀)))
        // Use filter-based rolloff if available (Meeting 3: KS-Inspired), otherwise use exponential
        let amplitude;
        if (fundamentalFreq !== null && typeof window !== 'undefined' && window.getFilterBasedRolloff) {
            // Use filter-based rolloff (gentler, more natural)
            amplitude = window.getFilterBasedRolloff(harmonicNum, fundamentalFreq);
        } else if (fundamentalFreq !== null && typeof window !== 'undefined' && window.calculatePitchDependentHarmonicAmplitude) {
            amplitude = window.calculatePitchDependentHarmonicAmplitude(harmonicNum, fundamentalFreq);
        } else {
            // Fallback: simple exponential rolloff
            amplitude = Math.exp(-harmonicNum * 0.15);
        }
        
        // 2. Velocity-dependent brightness boost (research: higher velocity = brighter)
        const normalizedVel = Math.max(0, Math.min(127, velocity)) / 127.0;
        if (typeof window !== 'undefined' && window.calculateHarmonicRolloff) {
            // Use improved velocity-timbre rolloff model
            // Pass fundamentalFreq for balanced oscillator type (Phase 3)
            const velocityRolloff = window.calculateHarmonicRolloff(harmonicNum, velocity, fundamentalFreq);
            // Combine pitch-dependent and velocity-dependent rolloff
            amplitude = Math.min(1.0, amplitude * velocityRolloff / Math.exp(-harmonicNum * 0.15));
        } else {
            // Fallback: simple velocity brightness
            const brightness = 0.5 + (normalizedVel * 0.5); // 0.5 to 1.0
            amplitude *= (1.0 + normalizedVel * 0.3); // Velocity boost
        }
        
        // 3. Odd/even harmonic balance (research: pianos emphasize odd harmonics)
        if (typeof window !== 'undefined' && window.calculateOddEvenHarmonicBalance) {
            const balanceFactor = window.calculateOddEvenHarmonicBalance(harmonicNum, fundamentalFreq);
            amplitude *= balanceFactor;
        }
        
        // 4. Mid-range enhancement (Meeting 2: Boost harmonics 2-6 in C3-C5)
        if (typeof window !== 'undefined' && window.getMidRangeEnhancement) {
            const midRangeBoost = window.getMidRangeEnhancement(fundamentalFreq, harmonicNum);
            amplitude *= midRangeBoost;
        }
        
        // 5. Register-specific filtering (Meeting 3: Reduce high-note glassiness)
        if (typeof window !== 'undefined' && window.applyRegisterSpecificFiltering) {
            amplitude = window.applyRegisterSpecificFiltering(fundamentalFreq, harmonicNum, amplitude);
        }
        
        // 6. High-note glassiness reduction (Meeting 2: Additional reduction)
        if (typeof window !== 'undefined' && window.reduceHighNoteGlassiness) {
            amplitude = window.reduceHighNoteGlassiness(fundamentalFreq, harmonicNum, amplitude);
        }
        
        // 7. High-note low harmonic support (Meeting 4: Body Enhancement)
        // Boost low harmonics (1-4) in high/mid notes to give them more "body" and "thud"
        if (typeof window !== 'undefined' && window.getHighNoteLowHarmonicSupport) {
            const bodyBoost = window.getHighNoteLowHarmonicSupport(fundamentalFreq, harmonicNum);
            amplitude *= bodyBoost;
        }
        
        // 8. Low-note high harmonic cleanup (Meeting 4: Clean Balance)
        // Reduce very high harmonics (>8) in low notes to keep them clean
        if (typeof window !== 'undefined' && window.cleanLowNoteHighHarmonics) {
            amplitude = window.cleanLowNoteHighHarmonics(fundamentalFreq, harmonicNum, amplitude);
        }
        
        // 9. Mid-range resonance boost for perceived loudness balance
        // Boosts harmonics in 1-3kHz range (where human hearing is most sensitive)
        // Gives lower and higher keys more "body" and perceived loudness
        if (typeof window !== 'undefined' && window.getMidRangeResonanceBoost) {
            const resonanceBoost = window.getMidRangeResonanceBoost(fundamentalFreq, harmonicNum);
            amplitude *= resonanceBoost;
        }
        
        // 10. Tame high harmonics in C5-G6 range (523-1568 Hz)
        // This range can feel too loud due to very high harmonics
        if (typeof window !== 'undefined' && window.tameC5G6HighHarmonics) {
            amplitude = window.tameC5G6HighHarmonics(fundamentalFreq, harmonicNum, amplitude);
        }
        
        // 11. ISO 226 Peak Sensitivity Reduction
        // Reduces harmonics in 2-3 kHz range (especially 2500 Hz) where human hearing is most sensitive
        // Prevents these harmonics from sounding too loud due to peak sensitivity
        if (typeof window !== 'undefined' && window.applyISO226PeakSensitivityReduction) {
            amplitude = window.applyISO226PeakSensitivityReduction(fundamentalFreq, harmonicNum, amplitude);
        }
        
        return Math.max(0, Math.min(1, amplitude));
    }
    
    /**
     * Calculate decay time for a harmonic (higher harmonics decay faster)
     * High velocity = longer sustain for all harmonics (more energy transferred)
     * But high harmonics still decay faster overall than low harmonics
     */
    calcDecayTime(harmonicNum, velocity, baseDecay) {
        const normalizedVel = velocity / 127;
        const isHighHarmonic = harmonicNum > 6;
        
        if (!isHighHarmonic) {
            // Low harmonics: standard model (harder = faster decay initially, but more energy = longer overall)
            // Balance: harder hits have more initial energy, so they sustain longer despite faster initial decay
            const harmonicFactor = Math.pow(harmonicNum, 0.7);
            // Velocity extends sustain: harder hits = longer sustain (1.0x to 1.5x)
            const velFactor = 1.0 + (normalizedVel * 0.5); // Extend sustain by up to 50%
            return (baseDecay * velFactor) / harmonicFactor;
        }
        
        // High harmonics: Harder hits = LONGER sustain (same as low harmonics)
        // Higher velocity transfers more energy to high harmonics, extending their sustain
        // But high harmonics still decay much faster overall due to harmonic factor
        const harmonicFactor = Math.pow(harmonicNum / 6, 3); // Much steeper curve for high harmonics
        
        // Velocity extends sustain for high harmonics too (1.0x to 1.8x for high harmonics)
        // High harmonics benefit MORE from velocity because they need more energy to sustain
        const velFactor = 1.0 + (normalizedVel * 0.8); // Extend sustain by up to 80% for high harmonics
        
        // Add maximum duration limits for very high harmonics (safety limits)
        let maxDuration = Infinity;
        if (harmonicNum > 20) {
            maxDuration = 0.05; // 50ms max for harmonics >20 (increased from 10ms)
        } else if (harmonicNum > 16) {
            maxDuration = 0.15; // 150ms max for harmonics >16 (increased from 30ms)
        } else if (harmonicNum > 12) {
            maxDuration = 0.3; // 300ms max for harmonics >12 (increased from 100ms)
        }
        
        const calculatedDecay = (baseDecay * velFactor) / harmonicFactor;
        return Math.min(calculatedDecay, maxDuration);
    }
    
    /**
     * Get or create spectral profile for a base frequency
     */
    getSpectralProfile(baseFreq) {
        // Round frequency to nearest Hz for caching
        const freqKey = Math.round(baseFreq);
        
        if (!this.spectralCache.has(freqKey)) {
            this.spectralCache.set(freqKey, new SpectralProfile(baseFreq, this));
        }
        
        return this.spectralCache.get(freqKey);
    }
    
    /**
     * Select which partials to activate (adaptive culling)
     */
    selectPartials(configs, maxPartials = null) {
        const limit = maxPartials || this.maxPartials;
        const ampThreshold = 0.001; // Ignore quiet partials
        const maxFreq = 24000; // Web Audio API limit
        
        const candidates = [];
        for (let i = 0; i < configs.length; i++) {
            // Filter out quiet partials and frequencies above Web Audio API limit
            if (configs[i].amp > ampThreshold && configs[i].freq <= maxFreq) {
                candidates.push({ index: i, amp: configs[i].amp });
            }
        }
        
        // Sort by amplitude (loudest first) and take top N
        candidates.sort((a, b) => b.amp - a.amp);
        return candidates.slice(0, limit).map(c => configs[c.index]);
    }
    
    /**
     * Trigger a note on
     */
    noteOn(noteId, frequency, velocity, keyDown = true, pedalDown = false) {
        // Get spectral profile
        const profile = this.getSpectralProfile(frequency);
        const configs = profile.getConfigs(velocity);
        
        // Adaptive partial allocation: use fewer partials when pool is low
        const poolAvailable = this.partialPool.available.length;
        const poolTotal = this.partialPool.pool.length;
        const poolUsageRatio = 1 - (poolAvailable / poolTotal);
        
        // Reduce max partials when pool is >70% full
        let adaptiveMaxPartials = this.maxPartials;
        if (poolUsageRatio > 0.7) {
            // Scale down partials: at 100% usage, use 6 partials; at 70%, use full 12
            adaptiveMaxPartials = Math.max(6, Math.round(this.maxPartials * (1 - (poolUsageRatio - 0.7) / 0.3)));
        }
        
        // Select partials to activate (with adaptive limit)
        const partialConfigs = this.selectPartials(configs, adaptiveMaxPartials);
        
        // Create master gain node for this note (allows per-note volume control)
        const noteGain = this.audioCtx.createGain();
        noteGain.gain.value = 1.0;
        noteGain.connect(this.masterGain);
        
        // Acquire and configure partials from pool
        const partials = [];
        const now = this.audioCtx.currentTime;
        
        // Store initial amplitudes for each partial (for harmonic evolution)
        const initialAmplitudes = [];
        
        for (const config of partialConfigs) {
            // Skip partials that are too high frequency (already filtered in selectPartials, but double-check)
            if (config.freq > 24000) {
                continue; // Skip this partial
            }
            
            let partial = this.partialPool.acquire();
            if (!partial) {
                // Pool exhausted - try voice stealing from quietest sustained note
                const stolenNoteId = this.stealVoiceFromQuietestSustainedNote();
                if (stolenNoteId !== null) {
                    partial = this.partialPool.acquire();
                    if (partial) {
                        // Successfully stole a voice, continue
                    } else {
                        // Still no partials available even after stealing
                        console.warn(`Partial pool exhausted while acquiring partial ${partials.length + 1} of ${partialConfigs.length} for note ${noteId}`);
                        break; // Stop trying to acquire more partials
                    }
                } else {
                    // No sustained notes to steal from
                    console.warn(`Partial pool exhausted while acquiring partial ${partials.length + 1} of ${partialConfigs.length} for note ${noteId}`);
                    break; // Stop trying to acquire more partials
                }
            }
            
            if (partial) {
                // Set frequency (already filtered to be <= 24kHz)
                partial.osc.frequency.value = config.freq;
                
                // Store harmonic number and initial amplitude
                initialAmplitudes.push({
                    harmonicNum: config.harmonicNum,
                    initialAmp: config.amp
                });
                
                // Apply initial envelope (will be continuously updated by harmonic evolution)
                this.applyEnvelope(partial.gain, velocity, config.decay, now);
                
                // Connect: osc -> filter -> gain -> noteGain -> masterGain
                partial.osc.connect(partial.filter);
                partial.filter.connect(partial.gain);
                partial.gain.connect(noteGain);
                
                partials.push(partial);
            }
        }
        
        // Log if we got fewer partials than requested
        if (partials.length < partialConfigs.length) {
            console.warn(`Note ${noteId}: Only got ${partials.length} of ${partialConfigs.length} requested partials`);
        }
        
        // Store note info with state tracking
        this.activeNotes.set(noteId, {
            partials: partials,
            gainNode: noteGain,
            frequency: frequency,
            velocity: velocity,
            startTime: now,
            keyDown: keyDown,
            pedalDown: pedalDown,
            initialAmplitudes: initialAmplitudes,
            lastUpdateTime: now
        });
        
        return noteGain; // Return gain node for per-note volume control
    }
    
    /**
     * Apply envelope to a gain node
     */
    applyEnvelope(gainNode, velocity, decayTime, startTime) {
        const normalizedVel = Math.max(0.001, velocity / 127); // Ensure minimum value for exponential ramps
        const attackTime = 0.01 + (0.02 * (1 - normalizedVel)); // Harder = faster attack
        const sustainLevel = Math.max(0.001, 0.3 + (normalizedVel * 0.2)); // 0.3 to 0.5, ensure minimum
        
        const now = startTime || this.audioCtx.currentTime;
        
        // Cancel any existing automation
        gainNode.gain.cancelScheduledValues(now);
        
        // Attack: exponential ramp from near-zero to peak
        // Use a small positive value (0.001) as starting point for exponential ramps
        // Apply velocity scaling: velocity^2 for proper dynamic range (low velocity = much quieter)
        const velocityScale = Math.pow(normalizedVel, 2.0); // Square curve: vel 0.2 -> 0.04, vel 1.0 -> 1.0
        const attackStart = 0.001;
        const attackTarget = Math.max(0.001, velocityScale); // Velocity-scaled target
        gainNode.gain.setValueAtTime(attackStart, now);
        gainNode.gain.exponentialRampToValueAtTime(attackTarget, now + attackTime);
        
        // Decay: exponential ramp to sustain level
        const sustainTarget = Math.max(0.001, sustainLevel * velocityScale); // Velocity-scaled sustain
        gainNode.gain.exponentialRampToValueAtTime(sustainTarget, now + attackTime + decayTime);
        
        // Sustain: held at sustain level (until noteOff)
        gainNode.gain.setValueAtTime(sustainTarget, now + attackTime + decayTime);
    }
    
    /**
     * Trigger a note off
     */
    noteOff(noteId, releaseTime = 0.5, immediateCleanup = false) {
        const note = this.activeNotes.get(noteId);
        if (!note) return;
        
        // Cancel any pending cleanup for this note
        if (this.pendingCleanups.has(noteId)) {
            clearTimeout(this.pendingCleanups.get(noteId));
            this.pendingCleanups.delete(noteId);
        }
        
        const now = this.audioCtx.currentTime;
        
        // Ensure minimum release time to prevent clicks (0.1s minimum)
        const safeReleaseTime = Math.max(0.1, releaseTime);
        
        // Get master gainNode value (may have been reduced by sustain decay)
        const masterGainValue = note.gainNode ? note.gainNode.gain.value : 1.0;
        
        // Apply release envelope to all partials
        // Account for master gainNode value: effective volume = masterGain * partialGain
        // We'll ramp both master and partial gains to 0 to ensure smooth release
        note.partials.forEach(partial => {
            const currentPartialValue = partial.gain.gain.value;
            // Effective current value accounting for master gain
            const effectiveValue = currentPartialValue * masterGainValue;
            
            partial.gain.gain.cancelScheduledValues(now);
            partial.gain.gain.setValueAtTime(currentPartialValue, now);
            
            // Use linear ramp for very short releases to avoid clicks, exponential for longer releases
            if (safeReleaseTime < 0.15) {
                // Very short release: use linear ramp to prevent clicks
                partial.gain.gain.linearRampToValueAtTime(0.001, now + safeReleaseTime);
            } else {
                // Longer release: use exponential ramp for smooth decay
                partial.gain.gain.exponentialRampToValueAtTime(0.001, now + safeReleaseTime);
            }
        });
        
        // Also apply release envelope to master gainNode if it's not at 1.0
        // This ensures smooth release when sustain decay was active
        if (note.gainNode && masterGainValue < 0.99) {
            note.gainNode.gain.cancelScheduledValues(now);
            note.gainNode.gain.setValueAtTime(masterGainValue, now);
            if (safeReleaseTime < 0.15) {
                note.gainNode.gain.linearRampToValueAtTime(0.001, now + safeReleaseTime);
            } else {
                note.gainNode.gain.exponentialRampToValueAtTime(0.001, now + safeReleaseTime);
            }
        }
        
        // If immediate cleanup is requested (e.g., when retriggering), clean up right away
        if (immediateCleanup) {
            this.cleanupNote(noteId);
        } else {
            // Schedule cleanup after release
            const timeoutId = setTimeout(() => {
                this.cleanupNote(noteId);
                this.pendingCleanups.delete(noteId);
            }, (releaseTime * 1000) + 100);
            this.pendingCleanups.set(noteId, timeoutId);
        }
    }
    
    /**
     * Update note state (key down, pedal down)
     */
    updateNoteState(noteId, keyDown, pedalDown) {
        const note = this.activeNotes.get(noteId);
        if (note) {
            note.keyDown = keyDown;
            note.pedalDown = pedalDown;
        }
    }
    
    /**
     * Steal voice from quietest sustained note (not physically held)
     * Returns noteId if a note was stolen, null otherwise
     */
    stealVoiceFromQuietestSustainedNote() {
        let quietestNoteId = null;
        let quietestVolume = Infinity;
        const now = this.audioCtx.currentTime;
        
        // Find the quietest sustained note (keyDown = false, meaning not physically held)
        for (const [noteId, note] of this.activeNotes) {
            // Only steal from notes that are not physically held (sustained by pedal)
            if (!note.keyDown && note.partials.length > 0) {
                // Calculate current effective volume (master gain * average partial gain)
                const masterGain = note.gainNode ? note.gainNode.gain.value : 1.0;
                const avgPartialGain = note.partials.reduce((sum, p) => sum + p.gain.gain.value, 0) / note.partials.length;
                const effectiveVolume = masterGain * avgPartialGain;
                
                // Also consider age - older sustained notes are better candidates
                const age = now - note.startTime;
                // Prefer quieter and older notes
                const stealScore = effectiveVolume / (1 + age * 0.1); // Older notes get lower score
                
                if (stealScore < quietestVolume) {
                    quietestVolume = stealScore;
                    quietestNoteId = noteId;
                }
            }
        }
        
        // If we found a candidate, release it
        if (quietestNoteId !== null) {
            const note = this.activeNotes.get(quietestNoteId);
            if (note) {
                // Release the note immediately (with short release time to avoid clicks)
                this.noteOff(quietestNoteId, 0.05, false); // 50ms quick release
                console.log(`Voice stolen from note ${quietestNoteId} (volume: ${quietestVolume.toFixed(4)})`);
                return quietestNoteId;
            }
        }
        
        return null;
    }
    
    /**
     * Set per-note volume (for sustain decay, etc.)
     */
    setNoteVolume(noteId, volume) {
        const note = this.activeNotes.get(noteId);
        if (note && note.gainNode) {
            const now = this.audioCtx.currentTime;
            note.gainNode.gain.cancelScheduledValues(now);
            note.gainNode.gain.setValueAtTime(volume, now);
        }
    }
    
    /**
     * Ramp note volume (for gradual fade-out)
     */
    rampNoteVolume(noteId, targetVolume, duration) {
        const note = this.activeNotes.get(noteId);
        if (note && note.gainNode) {
            const now = this.audioCtx.currentTime;
            const currentValue = note.gainNode.gain.value;
            note.gainNode.gain.cancelScheduledValues(now);
            note.gainNode.gain.setValueAtTime(currentValue, now);
            note.gainNode.gain.exponentialRampToValueAtTime(targetVolume, now + duration);
        }
    }
    
    /**
     * Start continuous harmonic evolution update loop
     * Updates partial amplitudes based on time and harmonic evolution
     */
    startHarmonicEvolution() {
        if (this.updateInterval) {
            return; // Already started
        }
        
        // Update every 200ms (5Hz) - reduces bouncy/tremolo effect by allowing ramps to complete
        // Longer interval = smoother transitions, prevents constant ramp interruptions
        this.updateInterval = setInterval(() => {
            this.updateHarmonicEvolution();
        }, 200);
    }
    
    /**
     * Stop harmonic evolution update loop
     */
    stopHarmonicEvolution() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Update harmonic evolution for all active notes
     * This continuously decays partials even when key is held
     */
    updateHarmonicEvolution() {
        const now = this.audioCtx.currentTime;
        
        // Get sustain pedal state from window (if available)
        const sustainPedalActive = (typeof window !== 'undefined' && window.sustainPedalActive) || false;
        
        for (const [noteId, note] of this.activeNotes) {
            const elapsed = now - note.startTime;
            
            // Get piano envelope decay times based on state
            let baseState;
            if (typeof window !== 'undefined' && window.getPianoEnvelopeDecayTimes) {
                baseState = window.getPianoEnvelopeDecayTimes(
                    note.frequency,
                    note.velocity,
                    note.pedalDown || sustainPedalActive,
                    note.keyDown
                );
            } else {
                // Fallback: default decay times
                baseState = {
                    fastDecay: 0.3,
                    slowDecay: 8.0,
                    resonance: note.pedalDown || sustainPedalActive ? 0.6 : 0.3
                };
            }
            
            // Get harmonic evolution rates (pass velocity for velocity-dependent decay)
            let harmonicRates;
            if (typeof window !== 'undefined' && window.getHarmonicEvolution) {
                harmonicRates = window.getHarmonicEvolution(elapsed, baseState, note.velocity);
            } else {
                // Fallback: simple exponential decay
                // Use 1-based indexing to match harmonic evolution module
                const decayTime = baseState.slowDecay;
                const decayRate = Math.exp(-elapsed / decayTime);
                harmonicRates = [];
                for (let h = 1; h <= 16; h++) {
                    harmonicRates[h] = decayRate;
                }
            }
            
            // Update each partial's amplitude based on harmonic evolution
            note.partials.forEach((partial, index) => {
                if (index >= note.initialAmplitudes.length) return;
                
                const harmonicInfo = note.initialAmplitudes[index];
                const harmonicNum = harmonicInfo.harmonicNum;
                
                // Get decay rate for this harmonic (1-based indexing)
                const decayRate = harmonicRates[harmonicNum] || 1.0;
                
                // Calculate target amplitude: initial amplitude * decay rate
                let targetAmp = harmonicInfo.initialAmp * decayRate;
                
                // Apply time-varying brightness (research: brightness evolves during note)
                if (typeof window !== 'undefined' && window.getHarmonicTimeVaryingBrightness) {
                    const attackTime = typeof window.getAttackTimeForVelocity === 'function' 
                        ? window.getAttackTimeForVelocity(note.velocity) 
                        : 0.01;
                    const brightnessMultiplier = window.getHarmonicTimeVaryingBrightness(
                        harmonicNum, 
                        note.velocity, 
                        elapsed, 
                        attackTime
                    );
                    targetAmp *= brightnessMultiplier;
                }
                
                // Apply Karplus-style noise burst (Meeting 3: KS-Inspired warmth for soft notes)
                if (typeof window !== 'undefined' && window.addKarplusStyleNoiseBurst) {
                    const noiseBurst = window.addKarplusStyleNoiseBurst(harmonicNum, note.velocity, elapsed);
                    targetAmp *= noiseBurst;
                }
                
                // Ensure minimum value for exponential ramps
                const minAmp = 0.0001;
                const clampedAmp = Math.max(minAmp, targetAmp);
                
                // Smoothly update partial gain
                // Use longer ramp (200ms) to match update interval and avoid bouncy/tremolo-like behavior
                // Only update if change is significant to prevent constant ramp interruptions
                const currentValue = partial.gain.gain.value;
                const changeRatio = Math.abs(currentValue - clampedAmp) / Math.max(currentValue, minAmp);
                if (changeRatio > 0.05) { // Only update if change is >5% to reduce unnecessary ramps
                    partial.gain.gain.cancelScheduledValues(now);
                    partial.gain.gain.setValueAtTime(Math.max(minAmp, currentValue), now);
                    partial.gain.gain.exponentialRampToValueAtTime(clampedAmp, now + 0.2); // 200ms ramp matches update interval
                }
                
                // If amplitude is very low, we could stop the partial, but let it decay naturally
            });
            
            // Check if note should be cleaned up (all partials decayed)
            // Use a more lenient check - if all partials are very quiet, clean up
            const maxPartialAmp = Math.max(...note.partials.map(p => p.gain.gain.value));
            
            // If max partial amplitude is below threshold and note has been playing for a while, schedule cleanup
            // This ensures notes decay naturally even if held forever
            if (maxPartialAmp < 0.0005 && elapsed > 0.5) {
                // Note has decayed - schedule cleanup
                if (!this.pendingCleanups.has(noteId)) {
                    const timeoutId = setTimeout(() => {
                        // Double-check before cleanup (in case note was retriggered)
                        const note = this.activeNotes.get(noteId);
                        if (note) {
                            const currentMaxAmp = Math.max(...note.partials.map(p => p.gain.gain.value));
                            if (currentMaxAmp < 0.001) {
                                this.cleanupNote(noteId);
                            }
                        }
                        this.pendingCleanups.delete(noteId);
                    }, 200);
                    this.pendingCleanups.set(noteId, timeoutId);
                }
            }
            
            note.lastUpdateTime = now;
        }
    }
    
    /**
     * Clean up a note (release partials back to pool)
     */
    cleanupNote(noteId) {
        const note = this.activeNotes.get(noteId);
        if (!note) return; // Already cleaned up or doesn't exist
        
        // Cancel any pending cleanup timeout
        if (this.pendingCleanups.has(noteId)) {
            clearTimeout(this.pendingCleanups.get(noteId));
            this.pendingCleanups.delete(noteId);
        }
        
        const now = this.audioCtx.currentTime;
        
        // Release all partials back to pool
        // At this point, partials should already be at 0.001 or below from release envelope
        // Smoothly ramp down before disconnecting to avoid clicks
        const partialCount = note.partials.length;
        note.partials.forEach(partial => {
            // Smoothly ramp to 0 before disconnecting (avoid instant cutoff = click)
            const currentValue = partial.gain.gain.value;
            partial.gain.gain.cancelScheduledValues(now);
            if (currentValue > 0.001) {
                // Ramp down smoothly over 10ms to avoid clicks
                partial.gain.gain.setValueAtTime(currentValue, now);
                partial.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
            } else {
                // Already quiet, safe to set to 0
                partial.gain.gain.setValueAtTime(0, now);
            }
            // Schedule disconnect after ramp completes
            setTimeout(() => {
                partial.osc.disconnect();
                partial.filter.disconnect();
                partial.gain.disconnect();
                this.partialPool.release(partial);
            }, 15); // Wait 15ms for ramp to complete
        });
        
        // Smoothly ramp down master gain node before disconnecting
        if (note.gainNode) {
            const currentGainValue = note.gainNode.gain.value;
            note.gainNode.gain.cancelScheduledValues(now);
            if (currentGainValue > 0.001) {
                // Ramp down smoothly
                note.gainNode.gain.setValueAtTime(currentGainValue, now);
                note.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.01);
                setTimeout(() => {
                    note.gainNode.disconnect();
                }, 15);
            } else {
                note.gainNode.gain.setValueAtTime(0, now);
                note.gainNode.disconnect();
            }
        }
        
        this.activeNotes.delete(noteId);
        
        // Debug: log cleanup
        if (partialCount > 0) {
            // Note cleanup completed (logging removed for cleaner console)
        }
    }
    
    /**
     * Adapt to performance (reduce partial count if needed)
     * Disabled for now - we want consistent polyphony
     */
    adaptToPerformance() {
        // Disabled: Keep maxPartials at 12 for consistent polyphony
        // The performance monitor was causing issues by overriding our settings
        /*
        this.performanceMonitor.update();
        const newBudget = this.performanceMonitor.getPartialBudget();
        
        // Only allow reduction, not increase (to maintain consistent polyphony)
        if (newBudget < this.maxPartials) {
            this.maxPartials = Math.max(12, newBudget); // Never go below 12
            console.log(`Adapted partial budget to ${this.maxPartials}`);
        }
        */
        
        // Continue monitoring (but don't adapt)
        requestAnimationFrame(() => this.adaptToPerformance());
    }
    
    /**
     * Get active note count
     */
    getActiveNoteCount() {
        return this.activeNotes.size;
    }
    
    /**
     * Get active partial count
     */
    getActivePartialCount() {
        let count = 0;
        this.activeNotes.forEach(note => {
            count += note.partials.length;
        });
        return count;
    }
}

/**
 * Spectral Profile - Pre-computed configurations for all velocities
 */
class SpectralProfile {
    constructor(baseFreq, synth) {
        this.baseFreq = baseFreq;
        this.synth = synth;
        this.configs = new Array(128); // One config per velocity level
        
        // Store baseFreq in synth for calcAmplitude access
        synth.baseFreq = baseFreq;
        
        // Pre-compute all velocity levels
        for (let v = 0; v < 128; v++) {
            this.configs[v] = this.computeConfigsForVelocity(v);
        }
    }
    
    computeConfigsForVelocity(velocity) {
        const normalizedVel = velocity / 127;
        const configs = [];
        
        // Determine max partials based on pitch (bass has more harmonics than treble)
        // Use balanced harmonic count for smoother timbre transition (Meeting 2)
        let maxPartials = 32; // Default
        if (typeof window !== 'undefined' && window.getBalancedHarmonicCount) {
            // Use balanced count (4-12 range) for smoother timbre transition
            maxPartials = Math.max(12, window.getBalancedHarmonicCount(this.baseFreq));
        } else if (typeof window !== 'undefined' && window.getMaxAudibleHarmonics) {
            // Fallback to original if balanced not available
            maxPartials = Math.max(12, window.getMaxAudibleHarmonics(this.baseFreq, 0.01));
        }
        
        // Compute partials up to maxPartials
        for (let i = 0; i < maxPartials; i++) {
            const harmonicNum = i + 1;
            
            // Balanced inharmonicity (Meeting 2: Frequency-dependent scaling)
            // HIGH notes need LESS stretch (already glass-like)
            // LOW notes can have MORE stretch (adds complexity)
            const primeFactor = this.synth.getPrimeFactorWeight(harmonicNum);
            const baseStretch = 0.1; // Maximum stretch
            const freqFactor = 1.0 - Math.min(1.0, this.baseFreq / 2000); // 1 at low freq, 0 at high
            const balancedStretch = baseStretch * freqFactor;
            const stretch = 1.0 + (normalizedVel * balancedStretch * primeFactor);
            
            // Calculate frequency with inharmonicity
            // Use proper inharmonicity calculation if available
            let freq;
            if (typeof window !== 'undefined' && window.calculateInharmonicPartialFrequency) {
                // Estimate MIDI note from frequency for inharmonicity calculation
                const midiNote = Math.round(69 + 12 * Math.log2(this.baseFreq / 440));
                freq = window.calculateInharmonicPartialFrequency(this.baseFreq, harmonicNum, null, midiNote, velocity);
            } else {
                freq = this.baseFreq * harmonicNum * stretch;
            }
            
            // Calculate amplitude with improved models (now includes pitch-dependent rolloff)
            const amp = this.synth.calcAmplitude(harmonicNum, velocity, this.baseFreq);
            
            // Calculate decay time (higher partials decay faster)
            const baseDecay = 0.3; // Base decay time
            const decay = this.synth.calcDecayTime(harmonicNum, velocity, baseDecay);
            
            configs.push({
                freq: freq,
                amp: amp,
                decay: decay,
                harmonicNum: harmonicNum
            });
        }
        
        return configs;
    }
    
    getConfigs(velocity) {
        return this.configs[Math.max(0, Math.min(127, velocity))];
    }
}

/**
 * Partial Pool - Object pooling for AudioNodes (critical for performance)
 */
class PartialPool {
    constructor(size = 48, audioContext) {
        this.audioCtx = audioContext;
        this.pool = [];
        this.available = [];
        
        // Pre-create all AudioNodes
        for (let i = 0; i < size; i++) {
            const osc = this.audioCtx.createOscillator();
            const filter = this.audioCtx.createBiquadFilter();
            const gain = this.audioCtx.createGain();
            
            osc.type = 'sine';
            filter.type = 'lowpass';
            filter.frequency.value = 20000; // Start fully open
            filter.Q.value = 1.0;
            gain.gain.value = 0;
            
            osc.start();
            
            this.pool.push({
                osc: osc,
                filter: filter,
                gain: gain,
                inUse: false,
                index: i
            });
            
            this.available.push(i);
        }
    }
    
    acquire() {
        if (this.available.length === 0) {
            console.warn(`Partial pool exhausted! Available: ${this.available.length}, Total: ${this.pool.length}, In use: ${this.pool.length - this.available.length}`);
            return null;
        }
        
        const idx = this.available.pop();
        const partial = this.pool[idx];
        partial.inUse = true;
        
        // Reset gain
        partial.gain.gain.cancelScheduledValues(0);
        partial.gain.gain.value = 0;
        
        return partial;
    }
    
    release(partial) {
        if (!partial || !partial.inUse) return;
        
        const idx = partial.index;
        partial.inUse = false;
        partial.gain.gain.cancelScheduledValues(0);
        partial.gain.gain.value = 0;
        
        // Disconnect
        partial.osc.disconnect();
        partial.filter.disconnect();
        partial.gain.disconnect();
        
        this.available.push(idx);
    }
}

/**
 * Performance Monitor - Adapts partial count based on performance
 */
class PerformanceMonitor {
    constructor() {
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 60;
        this.maxPartialBudget = 48;
        this.currentBudget = 48;
    }
    
    update() {
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastTime;
        
        if (elapsed >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = now;
            this.adaptToPerformance();
        }
    }
    
    adaptToPerformance() {
        if (this.fps < 50) {
            // Reduce budget if performance is poor
            this.currentBudget = Math.max(16, this.currentBudget - 8);
        } else if (this.fps > 58 && this.currentBudget < this.maxPartialBudget) {
            // Increase budget if performance is good
            this.currentBudget = Math.min(this.maxPartialBudget, this.currentBudget + 4);
        }
    }
    
    getPartialBudget() {
        return this.currentBudget;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.AdditiveSynth = AdditiveSynth;
    window.SpectralProfile = SpectralProfile;
    window.PartialPool = PartialPool;
    window.PerformanceMonitor = PerformanceMonitor;
}
