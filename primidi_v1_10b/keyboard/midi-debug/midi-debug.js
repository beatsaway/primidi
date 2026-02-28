/**
 * MIDI Debug Display Module
 * Shows real-time MIDI note number, velocity, and module state
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
            var header = document.createElement('div');
            header.className = 'midi-debug-header';
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
        
        debugContainer.classList.add('midi-debug-visible');
        
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
            }, 100);
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
            debugContainer.classList.remove('midi-debug-visible');
            // Stop update interval
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
        }
    };
    
    /**
     * Update debug display with current active notes
     */
    function updateDebugDisplay() {
        if (!debugContainer) return;
        
        // Clear existing note entries (keep header)
        debugContainer.innerHTML = '';
        var newHeader = document.createElement('div');
        newHeader.className = 'midi-debug-header';
        newHeader.textContent = 'MIDI Debug';
        debugContainer.appendChild(newHeader);
        
        // Get global state from main.js
        const globalActiveNotes = window.activeNotes || new Map();
        const globalSustainedNotes = window.sustainedNotes || new Set();
        const globalPhysicallyHeldNotes = window.physicallyHeldNotes || new Set();
        const sustainPedalActive = window.sustainPedalActive || false;
        const realisticSustainNotes = window.realisticSustainNotes || new Map();
        
        // Get all active MIDI notes (from both local and global tracking)
        const allActiveMidiNotes = new Set();
        activeNotes.forEach((info, midiNote) => allActiveMidiNotes.add(midiNote));
        globalActiveNotes.forEach((noteName, midiNote) => allActiveMidiNotes.add(midiNote));
        
        // Sort notes by MIDI number
        const sortedNotes = Array.from(allActiveMidiNotes).sort((a, b) => a - b);
        
        var pedalStatus = document.createElement('div');
        pedalStatus.className = 'midi-debug-pedal' + (sustainPedalActive ? ' on' : '');
        pedalStatus.innerHTML = '<strong>Sustain Pedal:</strong> ' + (sustainPedalActive ? 'ON' : 'OFF');
        debugContainer.appendChild(pedalStatus);

        if (sortedNotes.length === 0) {
            var emptyMsg = document.createElement('div');
            emptyMsg.className = 'midi-debug-empty';
            emptyMsg.textContent = 'No active notes';
            debugContainer.appendChild(emptyMsg);
            return;
        }
        
        sortedNotes.forEach(function (midiNote) {
            var noteEntry = document.createElement('div');
            noteEntry.className = 'midi-debug-note';

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
            
            var velClass = velocity >= 100 ? 'midi-debug-vel high' : velocity >= 64 ? 'midi-debug-vel mid' : 'midi-debug-vel';
            var keyClass = isPhysicallyHeld ? 'on' : '';
            var sustainedClass = isSustained ? 'sustain-on' : '';
            var activeClass = isActive ? 'on' : '';
            var noteHtml = '<div class="midi-debug-note-row">' +
                '<div><div class="midi-debug-note-name">' + noteName + '</div><div class="midi-debug-note-meta">MIDI: ' + midiNote + '</div></div>' +
                '<div><div class="' + velClass + '">' + velocity + '</div><div class="midi-debug-note-meta">vel</div></div></div>' +
                '<div class="midi-debug-detail">' +
                '<div class="midi-debug-states">' +
                '<span class="' + keyClass + '">' + (isPhysicallyHeld ? '●' : '○') + ' Key</span>' +
                '<span class="' + sustainedClass + '">' + (isSustained ? '●' : '○') + ' Sustained</span>' +
                '<span class="' + activeClass + '">' + (isActive ? '●' : '○') + ' Active</span>' +
                '</div>';
            if (envelopeState) {
                noteHtml += '<div class="midi-debug-detail-block"><strong>Envelope:</strong> ' + envelopeState.state + ' | Fast: ' + envelopeState.fastDecay + 's Slow: ' + envelopeState.slowDecay + 's | Elapsed: ' + envelopeState.elapsed + 's</div>';
            }
            if (harmonicInfo) {
                noteHtml += '<div class="midi-debug-detail-block">H1: ' + harmonicInfo.h1 + ' H4: ' + harmonicInfo.h4 + ' H8: ' + harmonicInfo.h8 + ' H16: ' + harmonicInfo.h16 + '</div>';
            }
            noteHtml += '</div>';
            noteEntry.innerHTML = noteHtml;
            debugContainer.appendChild(noteEntry);
        });
        
        var summary = document.createElement('div');
        summary.className = 'midi-debug-summary';
        summary.textContent = sortedNotes.length + ' active note' + (sortedNotes.length !== 1 ? 's' : '') + ' | ' + globalPhysicallyHeldNotes.size + ' held | ' + globalSustainedNotes.size + ' sustained';
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
            debugContainer.classList.remove('midi-debug-visible');
            debugContainer.innerHTML = '';
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
