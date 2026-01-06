/**
 * MIDI Debug Display Module
 * Shows real-time MIDI note number, velocity, voice node info, and module state
 */

(function() {
    'use strict';
    
    // Initialize debug settings
    window.midiDebugSettings = window.midiDebugSettings || {
        enabled: false
    };
    
    let debugContainer = null;
    const activeNotes = new Map(); // midiNote -> {velocity, timestamp}
    let updateInterval = null;
    
    /**
     * Initialize MIDI debug display
     */
    function initMidiDebug() {
        // Create debug container if it doesn't exist
        if (!debugContainer) {
            debugContainer = document.createElement('div');
            debugContainer.id = 'midi-debug-container';
            debugContainer.style.cssText = `
                position: fixed;
                top: 60px;
                right: 20px;
                background: rgba(20, 20, 30, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 12px;
                min-width: 320px;
                max-width: 450px;
                max-height: 600px;
                overflow-y: auto;
                z-index: 10000;
                font-family: 'Inter', 'Monaco', 'Courier New', monospace;
                font-size: 12px;
                color: #fff;
                display: none;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            `;
            
            const header = document.createElement('div');
            header.style.cssText = `
                font-weight: 600;
                margin-bottom: 8px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                color: #4a9eff;
            `;
            header.textContent = 'MIDI Debug';
            debugContainer.appendChild(header);
            
            document.body.appendChild(debugContainer);
        }
    }
    
    /**
     * Show MIDI note on debug info
     */
    window.showMidiDebugNoteOn = function(midiNote, velocity) {
        if (!window.midiDebugSettings || !window.midiDebugSettings.enabled) {
            return;
        }
        
        initMidiDebug();
        
        if (!debugContainer) return;
        
        // Store note info
        activeNotes.set(midiNote, {
            velocity: velocity,
            timestamp: Date.now()
        });
        
        // Update display immediately
        updateDebugDisplay();
        
        // Show container
        debugContainer.style.display = 'block';
        
        // Start continuous update if not already running
        if (!updateInterval) {
            updateInterval = setInterval(() => {
                if (window.midiDebugSettings && window.midiDebugSettings.enabled && debugContainer) {
                    updateDebugDisplay();
                } else {
                    // Stop interval if disabled
                    if (updateInterval) {
                        clearInterval(updateInterval);
                        updateInterval = null;
                    }
                }
            }, 100); // Update every 100ms for real-time voice node info
        }
    };
    
    /**
     * Show MIDI note off debug info
     */
    window.showMidiDebugNoteOff = function(midiNote) {
        if (!window.midiDebugSettings || !window.midiDebugSettings.enabled) {
            return;
        }
        
        if (!debugContainer) return;
        
        // Remove note from active notes
        activeNotes.delete(midiNote);
        
        // Update display
        updateDebugDisplay();
        
        // Check if we should hide container (no active notes in local or global tracking)
        const globalActiveNotes = window.activeNotes || new Map();
        if (activeNotes.size === 0 && globalActiveNotes.size === 0) {
            debugContainer.style.display = 'none';
            // Stop update interval
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
        }
    };
    
    /**
     * Update debug display with current active notes and voice node info
     */
    function updateDebugDisplay() {
        if (!debugContainer) return;
        
        // Clear existing note entries (keep header)
        const header = debugContainer.querySelector('div');
        debugContainer.innerHTML = '';
        
        const newHeader = document.createElement('div');
        newHeader.style.cssText = `
            font-weight: 600;
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            color: #4a9eff;
        `;
        newHeader.textContent = 'MIDI Debug (Voice Nodes)';
        debugContainer.appendChild(newHeader);
        
        // Get global state from main.js
        const globalActiveNotes = window.activeNotes || new Map();
        const globalSustainedNotes = window.sustainedNotes || new Set();
        const globalPhysicallyHeldNotes = window.physicallyHeldNotes || new Set();
        const globalUnisonVoices = window.unisonVoices || new Map();
        const globalNoteVolumeNodes = window.noteVolumeNodes || new Map();
        const sustainPedalActive = window.sustainPedalActive || false;
        const realisticSustainNotes = window.realisticSustainNotes || new Map();
        
        // Get all active MIDI notes (from both local and global tracking)
        const allActiveMidiNotes = new Set();
        activeNotes.forEach((info, midiNote) => allActiveMidiNotes.add(midiNote));
        globalActiveNotes.forEach((noteName, midiNote) => allActiveMidiNotes.add(midiNote));
        
        // Sort notes by MIDI number
        const sortedNotes = Array.from(allActiveMidiNotes).sort((a, b) => a - b);
        
        // Show sustain pedal state
        const pedalStatus = document.createElement('div');
        pedalStatus.style.cssText = `
            margin-bottom: 8px;
            padding: 6px;
            background: ${sustainPedalActive ? 'rgba(74, 158, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
            border-radius: 4px;
            font-size: 11px;
            color: ${sustainPedalActive ? '#4a9eff' : 'rgba(255, 255, 255, 0.6)'};
        `;
        pedalStatus.innerHTML = `
            <strong>Sustain Pedal:</strong> ${sustainPedalActive ? 'ON' : 'OFF'}
        `;
        debugContainer.appendChild(pedalStatus);
        
        if (sortedNotes.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'color: rgba(255, 255, 255, 0.4); font-style: italic;';
            emptyMsg.textContent = 'No active notes';
            debugContainer.appendChild(emptyMsg);
            return;
        }
        
        // Display each active note with voice node info
        sortedNotes.forEach((midiNote) => {
            const noteEntry = document.createElement('div');
            noteEntry.style.cssText = `
                padding: 8px;
                margin-bottom: 6px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                border-left: 3px solid #4a9eff;
            `;
            
            // Get note name
            let noteName = '';
            if (window.midiNoteToNoteName) {
                noteName = window.midiNoteToNoteName(midiNote);
            } else {
                const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                const octave = Math.floor(midiNote / 12) - 1;
                const note = noteNames[midiNote % 12];
                noteName = note + octave;
            }
            
            // Get velocity from local tracking
            const localInfo = activeNotes.get(midiNote);
            const velocity = localInfo ? localInfo.velocity : 0;
            
            // Determine note state
            const isPhysicallyHeld = globalPhysicallyHeldNotes.has(midiNote);
            const isSustained = globalSustainedNotes.has(midiNote);
            const isActive = globalActiveNotes.has(midiNote);
            
            // Get voice node info
            const voices = globalUnisonVoices.get(midiNote) || [];
            const voiceVolumeInfo = [];
            voices.forEach(voiceNoteName => {
                const volumeNode = globalNoteVolumeNodes.get(voiceNoteName);
                if (volumeNode && volumeNode.volume) {
                    const volumeDb = volumeNode.volume.value;
                    const volumeLinear = Math.pow(10, volumeDb / 20);
                    voiceVolumeInfo.push({
                        noteName: voiceNoteName,
                        volumeDb: volumeDb.toFixed(1),
                        volumeLinear: volumeLinear.toFixed(3)
                    });
                } else {
                    voiceVolumeInfo.push({
                        noteName: voiceNoteName,
                        volumeDb: 'N/A',
                        volumeLinear: 'N/A'
                    });
                }
            });
            
            // Get realistic sustain info if enabled
            let envelopeState = null;
            let harmonicInfo = null;
            if (window.physicsSettings && window.physicsSettings.realisticSustain) {
                const sustainNote = realisticSustainNotes.get(midiNote);
                if (sustainNote) {
                    const elapsed = typeof Tone !== 'undefined' ? Tone.now() - sustainNote.startTime : 0;
                    if (window.getPianoEnvelopeState && window.getPianoEnvelopeDecayTimes) {
                        const state = window.getPianoEnvelopeState(sustainNote.keyDown, sustainPedalActive);
                        const decayTimes = window.getPianoEnvelopeDecayTimes(
                            sustainNote.freq,
                            sustainNote.velocity,
                            sustainPedalActive,
                            sustainNote.keyDown
                        );
                        envelopeState = {
                            state: state,
                            fastDecay: decayTimes.fastDecay.toFixed(2),
                            slowDecay: decayTimes.slowDecay.toFixed(2),
                            resonance: decayTimes.resonance.toFixed(2),
                            elapsed: elapsed.toFixed(2)
                        };
                        
                        // Get harmonic evolution if enabled
                        if (window.physicsSettings.harmonicProfileEvolution && window.getHarmonicEvolution) {
                            const harmonicRates = window.getHarmonicEvolution(elapsed, decayTimes);
                            harmonicInfo = {
                                h1: harmonicRates[1] ? harmonicRates[1].toFixed(3) : 'N/A',
                                h4: harmonicRates[4] ? harmonicRates[4].toFixed(3) : 'N/A',
                                h8: harmonicRates[8] ? harmonicRates[8].toFixed(3) : 'N/A',
                                h16: harmonicRates[16] ? harmonicRates[16].toFixed(3) : 'N/A'
                            };
                        }
                    }
                }
            }
            
            // Build note entry HTML
            let noteHtml = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #fff; font-size: 13px;">${noteName}</div>
                        <div style="font-size: 10px; color: rgba(255, 255, 255, 0.5);">MIDI: ${midiNote}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 600; color: ${velocity >= 100 ? '#ff6b6b' : velocity >= 64 ? '#ffd93d' : '#4a9eff'}; font-size: 14px;">${velocity}</div>
                        <div style="font-size: 10px; color: rgba(255, 255, 255, 0.4);">vel</div>
                    </div>
                </div>
                
                <div style="font-size: 10px; margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                    <div style="display: flex; gap: 8px; margin-bottom: 4px;">
                        <span style="color: ${isPhysicallyHeld ? '#4a9eff' : 'rgba(255, 255, 255, 0.4)'};">
                            ${isPhysicallyHeld ? '●' : '○'} Key
                        </span>
                        <span style="color: ${isSustained ? '#ffd93d' : 'rgba(255, 255, 255, 0.4)'};">
                            ${isSustained ? '●' : '○'} Sustained
                        </span>
                        <span style="color: ${isActive ? '#4a9eff' : 'rgba(255, 255, 255, 0.4)'};">
                            ${isActive ? '●' : '○'} Active
                        </span>
                    </div>
            `;
            
            // Add voice node volume info
            if (voiceVolumeInfo.length > 0) {
                noteHtml += `<div style="margin-top: 4px; color: rgba(255, 255, 255, 0.7);"><strong>Voice Nodes:</strong></div>`;
                voiceVolumeInfo.forEach(voice => {
                    const volumeColor = voice.volumeDb !== 'N/A' && parseFloat(voice.volumeDb) < -30 ? 'rgba(255, 255, 255, 0.4)' : '#4a9eff';
                    noteHtml += `
                        <div style="margin-left: 8px; font-size: 9px; color: ${volumeColor};">
                            ${voice.noteName}: ${voice.volumeDb}dB (${voice.volumeLinear})
                        </div>
                    `;
                });
            }
            
            // Add envelope model state if available
            if (envelopeState) {
                noteHtml += `
                    <div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="color: #4a9eff; font-weight: 500; font-size: 10px;">Envelope Model:</div>
                        <div style="margin-left: 8px; font-size: 9px; color: rgba(255, 255, 255, 0.7);">
                            State: <strong>${envelopeState.state}</strong><br>
                            Fast Decay: ${envelopeState.fastDecay}s | Slow: ${envelopeState.slowDecay}s<br>
                            Resonance: ${envelopeState.resonance} | Elapsed: ${envelopeState.elapsed}s
                        </div>
                    </div>
                `;
            }
            
            // Add harmonic evolution info if available
            if (harmonicInfo) {
                noteHtml += `
                    <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <div style="color: #ffd93d; font-weight: 500; font-size: 10px;">Harmonic Evolution:</div>
                        <div style="margin-left: 8px; font-size: 9px; color: rgba(255, 255, 255, 0.7);">
                            H1: ${harmonicInfo.h1} | H4: ${harmonicInfo.h4}<br>
                            H8: ${harmonicInfo.h8} | H16: ${harmonicInfo.h16}
                        </div>
                    </div>
                `;
            }
            
            noteHtml += `</div>`;
            
            noteEntry.innerHTML = noteHtml;
            debugContainer.appendChild(noteEntry);
        });
        
        // Add summary at bottom
        const summary = document.createElement('div');
        summary.style.cssText = `
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 10px;
            color: rgba(255, 255, 255, 0.5);
        `;
        summary.textContent = `${sortedNotes.length} active note${sortedNotes.length !== 1 ? 's' : ''} | ${globalPhysicallyHeldNotes.size} held | ${globalSustainedNotes.size} sustained`;
        debugContainer.appendChild(summary);
    }
    
    /**
     * Clear debug display
     */
    window.clearMidiDebugDisplay = function() {
        activeNotes.clear();
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        if (debugContainer) {
            debugContainer.style.display = 'none';
            // Clear content but keep container
            const header = debugContainer.querySelector('div');
            debugContainer.innerHTML = '';
            if (header) {
                debugContainer.appendChild(header);
            }
        }
    };
    
    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMidiDebug);
    } else {
        initMidiDebug();
    }
    
    console.log('MIDI Debug module loaded');
})();
