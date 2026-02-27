/**
 * MIDI Input Module
 * Handles MIDI device detection, connection, and message processing
 */

(function() {
    'use strict';
    
    // Settings
    window.midiInputSettings = {
        enabled: true // Default: ON
    };
    
    // MIDI state
    let midiAccess = null;
    let midiInputs = [];
    let onMIDIMessageHandler = null;
    
    /**
     * Initialize MIDI input module
     * @param {Function} noteOnHandler - Function to call on note on (midiNote, velocity)
     * @param {Function} noteOffHandler - Function to call on note off (midiNote)
     * @param {Function} controlChangeHandler - Function to call on control change (controller, value)
     */
    window.initMidiInput = function(noteOnHandler, noteOffHandler, controlChangeHandler) {
        // Store handlers
        onMIDIMessageHandler = function(event) {
            if (!window.midiInputSettings.enabled) {
                return; // MIDI input disabled, ignore messages
            }
            
            const [status, data1, data2] = event.data;
            const command = status & 0xf0; // Upper nibble is command
            const channel = status & 0x0f; // Lower nibble is channel
            
            // Note On (0x90) or Note Off (0x80)
            if (command === 0x90) {
                // Note On
                if (data2 > 0) {
                    if (noteOnHandler) {
                        noteOnHandler(data1, data2);
                    }
                } else {
                    // Note Off (velocity 0 is sometimes used for note off)
                    if (noteOffHandler) {
                        noteOffHandler(data1);
                    }
                }
            } else if (command === 0x80) {
                // Note Off
                if (noteOffHandler) {
                    noteOffHandler(data1);
                }
            } else if (command === 0xB0) {
                // Control Change (0xB0-0xBF)
                const controller = data1;
                const value = data2;
                
                if (controlChangeHandler) {
                    controlChangeHandler(controller, value);
                }
            }
        };
        
        // Request MIDI access
        requestMIDIAccess();
    };
    
    /**
     * Request MIDI access and setup inputs
     */
    async function requestMIDIAccess() {
        try {
            // Request MIDI access
            midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            
            console.log('MIDI access granted');
            
            // Setup initial inputs
            setupMIDIInputs();
            
            // Listen for new MIDI devices
            midiAccess.onstatechange = (event) => {
                console.log('MIDI device state changed:', event.port.name, event.port.state);
                if (event.port.state === 'connected' && event.port.type === 'input') {
                    event.port.onmidimessage = onMIDIMessageHandler;
                    midiInputs.push(event.port);
                    console.log('New MIDI input connected:', event.port.name);
                } else if (event.port.state === 'disconnected' && event.port.type === 'input') {
                    const index = midiInputs.indexOf(event.port);
                    if (index > -1) {
                        midiInputs.splice(index, 1);
                    }
                    console.log('MIDI input disconnected:', event.port.name);
                }
            };
            
        } catch (error) {
            console.error('MIDI access denied or not available:', error);
            console.log('Please allow MIDI access when prompted, or check if your browser supports Web MIDI API.');
        }
    }
    
    /**
     * Setup MIDI inputs
     */
    function setupMIDIInputs() {
        midiInputs = [];
        if (!midiAccess) return;
        
        const inputs = midiAccess.inputs.values();
        
        for (let input of inputs) {
            input.onmidimessage = onMIDIMessageHandler;
            midiInputs.push(input);
            console.log('MIDI input connected:', input.name);
        }
        
        if (midiInputs.length === 0) {
            console.log('No MIDI input devices found. Connect a MIDI device and refresh.');
        }
    }
    
    /**
     * Enable MIDI input
     */
    window.enableMidiInput = function() {
        window.midiInputSettings.enabled = true;
        console.log('MIDI input enabled');
    };
    
    /**
     * Disable MIDI input
     */
    window.disableMidiInput = function() {
        window.midiInputSettings.enabled = false;
        console.log('MIDI input disabled');
    };
    
    /**
     * Get MIDI input status
     * @returns {boolean} Whether MIDI input is enabled
     */
    window.isMidiInputEnabled = function() {
        return window.midiInputSettings.enabled;
    };
    
    /**
     * Get connected MIDI inputs
     * @returns {Array} Array of connected MIDI input devices
     */
    window.getMidiInputs = function() {
        return [...midiInputs];
    };
    
    console.log('MIDI Input module loaded');
})();

