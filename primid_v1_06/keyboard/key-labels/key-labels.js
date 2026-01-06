/**
 * Key Labels Module
 * Handles key label visibility and appearance
 */

(function() {
    'use strict';
    
    // Settings
    window.keyLabelSettings = {
        enabled: false, // Default: OFF
        showOnlyWhenPressed: true, // Default: only show when pressed
        alwaysVisible: false, // Alternative: always show labels
        blackKeyLabelMode: 'both' // Options: 'sharp', 'flat', 'both' - Default: both
    };
    
    // Store label meshes per MIDI note
    const keyLabelMeshes = new Map(); // midiNote -> THREE.Mesh
    // Store original label colors/textures for restoration
    const labelOriginalData = new Map(); // midiNote -> { text, color, fontSize, planeSize, planeHeight }
    
    /**
     * Initialize the key labels module
     */
    window.initKeyLabels = function() {
        // Module initialized
    };
    
    /**
     * Register a label mesh for a key
     * @param {number} midiNote - MIDI note number
     * @param {THREE.Mesh} labelMesh - Label mesh
     * @param {Object} originalData - Optional: original label data { text, color, fontSize, planeSize, planeHeight }
     */
    window.registerKeyLabel = function(midiNote, labelMesh, originalData) {
        keyLabelMeshes.set(midiNote, labelMesh);
        
        // Store original data if provided (for color changes)
        if (originalData) {
            labelOriginalData.set(midiNote, originalData);
        } else {
            // Try to extract from mesh material texture if available
            if (labelMesh.material && labelMesh.material.map) {
                // We'll need to store this when label is created
                // For now, try to infer from current state
                const currentColor = labelMesh.userData.originalColor || '#ffffff';
                labelOriginalData.set(midiNote, {
                    text: labelMesh.userData.originalText || '',
                    color: currentColor,
                    fontSize: labelMesh.userData.fontSize || 100,
                    planeSize: labelMesh.userData.planeSize || 0.12,
                    planeHeight: labelMesh.userData.planeHeight || null
                });
            }
        }
        
        // Set initial visibility based on settings
        if (window.keyLabelSettings.enabled) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = false; // Hidden by default
            } else {
                labelMesh.visible = true; // Always visible
            }
        } else {
            labelMesh.visible = false; // Module disabled
        }
    };
    
    /**
     * Update label text color (recreate texture with new color)
     * @param {number} midiNote - MIDI note number
     * @param {string} color - New color (hex string like '#000000' or '#ffffff')
     */
    window.updateLabelColor = function(midiNote, color) {
        const labelMesh = keyLabelMeshes.get(midiNote);
        if (!labelMesh || !labelMesh.material) return;
        
        const originalData = labelOriginalData.get(midiNote);
        if (!originalData) {
            // Try to get from userData
            const text = labelMesh.userData.originalText || '';
            const fontSize = labelMesh.userData.fontSize || 100;
            const planeSize = labelMesh.userData.planeSize || 0.12;
            const planeHeight = labelMesh.userData.planeHeight || null;
            
            if (!text) {
                console.warn('Cannot update label color - no original data for note', midiNote);
                return;
            }
            
            // Create new texture with new color
            if (typeof window !== 'undefined' && window.THREE && window.createTextTexture) {
                const newTexture = window.createTextTexture(text, color, fontSize);
                labelMesh.material.map = newTexture;
                labelMesh.material.needsUpdate = true;
            }
            return;
        }
        
        // Recreate texture with new color
        if (typeof window !== 'undefined' && window.THREE && window.createTextTexture) {
            const newTexture = window.createTextTexture(originalData.text, color, originalData.fontSize);
            labelMesh.material.map = newTexture;
            labelMesh.material.needsUpdate = true;
        }
    };
    
    /**
     * Change label to black (for when highlight is on)
     * @param {number} midiNote - MIDI note number
     */
    window.setLabelColorBlack = function(midiNote) {
        window.updateLabelColor(midiNote, '#000000');
    };
    
    /**
     * Restore label to original color (for when highlight is off)
     * @param {number} midiNote - MIDI note number
     */
    window.restoreLabelColor = function(midiNote) {
        const originalData = labelOriginalData.get(midiNote);
        if (originalData && originalData.color) {
            window.updateLabelColor(midiNote, originalData.color);
        } else {
            // Try to get from userData
            const labelMesh = keyLabelMeshes.get(midiNote);
            if (labelMesh && labelMesh.userData && labelMesh.userData.originalColor) {
                window.updateLabelColor(midiNote, labelMesh.userData.originalColor);
            } else {
                // Default: white for white keys, grey for black keys
                // Try to infer from midiNote (black keys are sharps/flats)
                // For now, default to white
                window.updateLabelColor(midiNote, '#ffffff');
            }
        }
    };
    
    /**
     * Show label for a key (when pressed)
     * @param {number} midiNote - MIDI note number
     */
    window.showKeyLabel = function(midiNote) {
        if (!window.keyLabelSettings.enabled) return;
        
        const labelMesh = keyLabelMeshes.get(midiNote);
        if (labelMesh) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = true;
            }
            // If alwaysVisible is true, label is already visible
        }
    };
    
    /**
     * Hide label for a key (when released)
     * @param {number} midiNote - MIDI note number
     */
    window.hideKeyLabel = function(midiNote) {
        if (!window.keyLabelSettings.enabled) return;
        
        const labelMesh = keyLabelMeshes.get(midiNote);
        if (labelMesh) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = false;
            }
            // If alwaysVisible is true, keep label visible
        }
    };
    
    /**
     * Update all label visibility based on current settings
     */
    window.updateAllKeyLabels = function() {
        keyLabelMeshes.forEach((labelMesh, midiNote) => {
            if (!window.keyLabelSettings.enabled) {
                labelMesh.visible = false;
            } else if (window.keyLabelSettings.alwaysVisible) {
                labelMesh.visible = true;
            }
            // If showOnlyWhenPressed, visibility is controlled by press/release
        });
    };
    
    /**
     * Get black key label text based on mode
     * @param {string} currentNote - Current white key note (e.g., "C4")
     * @param {string} nextNote - Next white key note (e.g., "D4")
     * @param {string} mode - 'sharp', 'flat', or 'both'
     * @returns {string} - Label text
     */
    window.getBlackKeyLabelText = function(currentNote, nextNote, mode) {
        const note1Letter = currentNote[0];
        const note2Letter = nextNote[0];
        
        // Black keys are the sharp of the first note (or flat of the second)
        // C-D -> C#/D♭, D-E -> D#/E♭, F-G -> F#/G♭, G-A -> G#/A♭, A-B -> A#/B♭
        const sharpMap = {
            'C': 'C#',
            'D': 'D#',
            'F': 'F#',
            'G': 'G#',
            'A': 'A#'
        };
        
        const flatMap = {
            'D': 'D♭',
            'E': 'E♭',
            'G': 'G♭',
            'A': 'A♭',
            'B': 'B♭'
        };
        
        const sharp = sharpMap[note1Letter];
        const flat = flatMap[note2Letter];
        
        if (mode === 'sharp') {
            return sharp || '';
        } else if (mode === 'flat') {
            return flat || '';
        } else {
            // both (default)
            return sharp + '<br>' + flat;
        }
    };
    
    /**
     * Update all black key labels based on current blackKeyLabelMode setting
     */
    window.updateBlackKeyLabels = function() {
        const mode = window.keyLabelSettings.blackKeyLabelMode || 'both';
        
        // Call the main.js function to update labels
        if (typeof window.updateBlackKeyLabelsFromMain === 'function') {
            window.updateBlackKeyLabelsFromMain(mode);
        } else {
            console.warn('updateBlackKeyLabelsFromMain not available - labels may not update');
        }
    };
    
    /**
     * Get all registered label meshes (for cleanup)
     * @returns {Map} - Map of midiNote -> labelMesh
     */
    window.getAllKeyLabels = function() {
        return keyLabelMeshes;
    };
    
    console.log('Key Labels module loaded');
})();

