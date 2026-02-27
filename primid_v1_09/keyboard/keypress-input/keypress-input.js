/**
 * Keypress Input Module
 * Handles computer keyboard input to play piano keys
 * Maps: a,w,s,e,d,f,t,g,y,h,u,j,k,o,l,p,;,',],\ to C3-G4 range
 * < and > to shift octave (A0 to C8 range)
 */

(function() {
    'use strict';
    
    // Settings
    window.keypressInputSettings = {
        enabled: true, // Default: ON
        baseOctave: 3, // Starting octave (C3)
        minOctave: 0, // Minimum octave (A0 = MIDI note 21)
        maxOctave: 8  // Maximum octave (C8 = MIDI note 108)
    };
    
    // Current octave offset (0 = base octave, +1 = one octave up, -1 = one octave down)
    let octaveOffset = 0;
    
    // Track currently pressed keys to prevent repeats
    const pressedKeys = new Set();
    
    // MIDI note handlers (set via initKeypressInput)
    let handleNoteOnFn = null;
    let handleNoteOffFn = null;
    
    // Keyboard mapping: key -> { midiNoteOffset, isBlack }
    // Base range: C3 to G4 (MIDI notes 48-67)
    // C3=48, C#3=49, D3=50, D#3=51, E3=52, F3=53, F#3=54, G3=55, G#3=56, A3=57, A#3=58, B3=59, C4=60, C#4=61, D4=62, D#4=63, E4=64, F4=65, F#4=66, G4=67
    const keyMap = {
        'a': { offset: 0, isBlack: false },   // C
        'w': { offset: 1, isBlack: true },    // C#
        's': { offset: 2, isBlack: false },   // D
        'e': { offset: 3, isBlack: true },    // D#
        'd': { offset: 4, isBlack: false },   // E
        'f': { offset: 5, isBlack: false },   // F
        't': { offset: 6, isBlack: true },    // F#
        'g': { offset: 7, isBlack: false },   // G
        'y': { offset: 8, isBlack: true },    // G#
        'h': { offset: 9, isBlack: false },   // A
        'u': { offset: 10, isBlack: true },   // A#
        'j': { offset: 11, isBlack: false },   // B
        'k': { offset: 12, isBlack: false },   // C (next octave)
        'o': { offset: 13, isBlack: true },   // C#
        'l': { offset: 14, isBlack: false },   // D
        'p': { offset: 15, isBlack: true },   // D#
        ';': { offset: 16, isBlack: false },   // E
        "'": { offset: 17, isBlack: false },   // F
        ']': { offset: 18, isBlack: true },   // F#
        '\\': { offset: 19, isBlack: false }   // G
    };
    
    // Base MIDI note for C3
    const BASE_MIDI_NOTE = 48; // C3
    
    /**
     * Calculate MIDI note from key and current octave
     * @param {string} key - Keyboard key
     * @returns {number|null} - MIDI note number or null if invalid
     */
    function getMidiNote(key) {
        const mapping = keyMap[key.toLowerCase()];
        if (!mapping) return null;
        
        // Calculate MIDI note: base note (C3=48) + offset + octave shift
        // When octaveOffset=0, we're at baseOctave (3), so C3=48
        // When octaveOffset=+1, we're at octave 4, so C4=60
        // When octaveOffset=-1, we're at octave 2, so C2=36
        const midiNote = BASE_MIDI_NOTE + mapping.offset + (octaveOffset * 12);
        
        // Clamp to valid MIDI range (0-127)
        const minNote = 21; // A0
        const maxNote = 108; // C8
        return Math.max(21, Math.min(127, midiNote));
    }
    
    /**
     * Handle keydown event
     */
    function handleKeyDown(event) {
        if (!window.keypressInputSettings.enabled) return;
        
        // Prevent default behavior for mapped keys
        const key = event.key.toLowerCase();
        
        // Handle octave shift
        if (key === ',' || key === '<') {
            // Shift down one octave
            const newOffset = octaveOffset - 1;
            const newOctave = window.keypressInputSettings.baseOctave + newOffset;
            if (newOctave >= window.keypressInputSettings.minOctave) {
                octaveOffset = newOffset;
                event.preventDefault();
            }
            return;
        }
        
        if (key === '.' || key === '>') {
            // Shift up one octave
            const newOffset = octaveOffset + 1;
            const newOctave = window.keypressInputSettings.baseOctave + newOffset;
            if (newOctave <= window.keypressInputSettings.maxOctave) {
                octaveOffset = newOffset;
                event.preventDefault();
            }
            return;
        }
        
        // Handle piano keys
        if (keyMap[key] && !pressedKeys.has(key)) {
            const midiNote = getMidiNote(key);
            if (midiNote !== null && handleNoteOnFn) {
                pressedKeys.add(key);
                // Use velocity 100 (moderate velocity)
                handleNoteOnFn(midiNote, 100);
                event.preventDefault();
            }
        }
    }
    
    /**
     * Handle keyup event
     */
    function handleKeyUp(event) {
        if (!window.keypressInputSettings.enabled) return;
        
        const key = event.key.toLowerCase();
        
        // Handle octave shift keys (no action on release)
        if (key === ',' || key === '<' || key === '.' || key === '>') {
            return;
        }
        
        // Handle piano keys
        if (keyMap[key] && pressedKeys.has(key)) {
            const midiNote = getMidiNote(key);
            if (midiNote !== null && handleNoteOffFn) {
                pressedKeys.delete(key);
                handleNoteOffFn(midiNote);
                event.preventDefault();
            }
        }
    }
    
    /**
     * Initialize keypress input module
     * @param {Function} handleNoteOn - Function to call on note on (midiNote, velocity)
     * @param {Function} handleNoteOff - Function to call on note off (midiNote)
     */
    window.initKeypressInput = function(handleNoteOn, handleNoteOff) {
        handleNoteOnFn = handleNoteOn;
        handleNoteOffFn = handleNoteOff;
        
        // Add event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Also handle window blur to release all keys
        window.addEventListener('blur', () => {
            // Release all currently pressed keys
            pressedKeys.forEach(key => {
                const midiNote = getMidiNote(key);
                if (midiNote !== null && handleNoteOffFn) {
                    handleNoteOffFn(midiNote);
                }
            });
            pressedKeys.clear();
        });
    };
    
    /**
     * Enable keypress input
     */
    window.enableKeypressInput = function() {
        window.keypressInputSettings.enabled = true;
    };
    
    /**
     * Disable keypress input
     */
    window.disableKeypressInput = function() {
        window.keypressInputSettings.enabled = false;
        // Release all currently pressed keys
        pressedKeys.forEach(key => {
            const midiNote = getMidiNote(key);
            if (midiNote !== null && handleNoteOffFn) {
                handleNoteOffFn(midiNote);
            }
        });
        pressedKeys.clear();
    };
    
    /**
     * Check if keypress input is enabled
     */
    window.isKeypressInputEnabled = function() {
        return window.keypressInputSettings.enabled;
    };
    
    /**
     * Get current octave
     */
    window.getCurrentOctave = function() {
        return window.keypressInputSettings.baseOctave + octaveOffset;
    };
    
    /**
     * Reset octave to base
     */
    window.resetOctave = function() {
        octaveOffset = 0;
    };
    
    console.log('Keypress Input module loaded');
})();

