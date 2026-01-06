/**
 * Realistic Piano Sustain System Module
 * Tracks note state (key down/up, pedal state) and smoothly transitions envelope parameters
 * Integrates with PianoEnvelopeModel and HarmonicProfileEvolution
 */

// Track active notes with state information
const realisticSustainNotes = new Map(); // noteId -> {freq, velocity, keyDown, startTime, partials, currentAmps, targetAmps}

/**
 * Initialize realistic sustain system
 */
function initRealisticSustain() {
    realisticSustainNotes.clear();
}

/**
 * Handle note on for realistic sustain
 * @param {string|number} noteId - Note identifier (MIDI note or note name)
 * @param {number} freq - Frequency in Hz
 * @param {number} velocity - MIDI velocity (0-127)
 */
function noteOnRealisticSustain(noteId, freq, velocity) {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return;
    }
    
    if (window.physicsSettings && !window.physicsSettings.realisticSustain) {
        return;
    }
    
    const note = {
        id: noteId,
        freq,
        velocity,
        keyDown: true,
        startTime: Tone.now(),
        partials: [], // Would be populated with partial oscillators in full implementation
        currentAmps: [],
        targetAmps: []
    };
    
    realisticSustainNotes.set(noteId, note);
    updateNoteEnvelopeRealisticSustain(noteId);
}

/**
 * Handle sustain pedal change
 * @param {boolean} pedalDown - Whether sustain pedal is down
 */
function sustainPedalChangeRealisticSustain(pedalDown) {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return;
    }
    
    if (window.physicsSettings && !window.physicsSettings.realisticSustain) {
        return;
    }
    
    // Update all active notes
    for (const [noteId, note] of realisticSustainNotes) {
        updateNoteEnvelopeRealisticSustain(noteId);
    }
}

/**
 * Handle key released
 * @param {string|number} noteId - Note identifier
 */
function keyReleasedRealisticSustain(noteId) {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return;
    }
    
    if (window.physicsSettings && !window.physicsSettings.realisticSustain) {
        return;
    }
    
    const note = realisticSustainNotes.get(noteId);
    if (note) {
        note.keyDown = false;
        updateNoteEnvelopeRealisticSustain(noteId);
    }
}

/**
 * Update note envelope based on current state
 * @param {string|number} noteId - Note identifier
 */
function updateNoteEnvelopeRealisticSustain(noteId) {
    if (typeof window === 'undefined' || typeof Tone === 'undefined') {
        return;
    }
    
    const note = realisticSustainNotes.get(noteId);
    if (!note) return;
    
    // Get current pedal state (from main.js or midi-mapping.js)
    const sustainPedalActive = (window.sustainPedalActive !== undefined) ? window.sustainPedalActive : false;
    
    // Get envelope decay times based on state
    if (window.getPianoEnvelopeDecayTimes) {
        const times = window.getPianoEnvelopeDecayTimes(
            note.freq,
            note.velocity,
            sustainPedalActive,
            note.keyDown
        );
        
        // Calculate target amplitudes for each partial
        const elapsed = Tone.now() - note.startTime;
        
        if (window.getHarmonicEvolution) {
            const harmonicRates = window.getHarmonicEvolution(elapsed, times);
            
            // Store targets for smooth interpolation
            note.targetAmps = harmonicRates;
            
            // Schedule amplitude changes (simplified - full implementation would interpolate)
            // In full implementation, this would smoothly transition partial amplitudes
        }
    }
}

/**
 * Clean up note when fully released
 * @param {string|number} noteId - Note identifier
 */
function cleanupNoteRealisticSustain(noteId) {
    realisticSustainNotes.delete(noteId);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.initRealisticSustain = initRealisticSustain;
    window.noteOnRealisticSustain = noteOnRealisticSustain;
    window.sustainPedalChangeRealisticSustain = sustainPedalChangeRealisticSustain;
    window.keyReleasedRealisticSustain = keyReleasedRealisticSustain;
    window.updateNoteEnvelopeRealisticSustain = updateNoteEnvelopeRealisticSustain;
    window.cleanupNoteRealisticSustain = cleanupNoteRealisticSustain;
    window.realisticSustainNotes = realisticSustainNotes;
}
