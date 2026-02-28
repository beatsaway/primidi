/**
 * Key Labels Module
 * Handles key label visibility and appearance
 */

(function() {
    'use strict';
    
    // Settings
    window.keyLabelSettings = {
        enabled: true, // Default: ON (master switch from Keyboard settings)
        showOnlyWhenPressed: true, // Default: only show when pressed
        alwaysVisible: false, // Alternative: always show labels
        showNone: false, // If true, labels never shown (Visibility Mode: Show None)
        blackKeyLabelMode: 'both', // Options: 'sharp', 'flat', 'both' - Default: both
        labelDisplayMode: 'stickers', // 'stickers' = texture labels only, 'tags' = div labels only, 'both'
        labelFormat: 'noteOnly' // 'withOctave' = A3, B2, C1; 'noteOnly' = A, B, C (default)
    };

    function showStickers() {
        var s = window.keyLabelSettings;
        return s && s.enabled && (s.labelDisplayMode === 'stickers' || s.labelDisplayMode === 'both');
    }
    function showTags() {
        var s = window.keyLabelSettings;
        return s && s.enabled && !s.showNone && (s.labelDisplayMode === 'tags' || s.labelDisplayMode === 'both');
    }
    window.shouldShowDivLabels = showTags;

    // All 88 keys: MIDI 21 (A0) to 108 (C8). Display text for each (e.g. "A0", "A#0", "C1", "C#1").
    var noteNamesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    function midiToNoteName(midi) {
        var octave = Math.floor(midi / 12) - 1;
        var note = noteNamesSharp[midi % 12];
        return note + octave;
    }
    const all88Keys = (function() {
        var list = [];
        for (var midi = 21; midi <= 108; midi++) {
            list.push({ midiNote: midi, displayText: midiToNoteName(midi) });
        }
        return list;
    })();

    function noteNameToMidi(noteName) {
        if (typeof window.noteNameToMidiNote === 'function') {
            return window.noteNameToMidiNote(noteName);
        }
        var m = noteName.match(/^([A-G]#?)(\d+)$/);
        if (!m) return null;
        var idx = noteNamesSharp.indexOf(m[1]);
        if (idx === -1) return null;
        var octave = parseInt(m[2], 10);
        return (octave + 1) * 12 + idx;
    }

    let divLabelsContainer = null;

    function ensureDivLabelsContainer() {
        if (divLabelsContainer && divLabelsContainer.children.length === all88Keys.length) return divLabelsContainer;
        if (divLabelsContainer && divLabelsContainer.parentNode) divLabelsContainer.parentNode.removeChild(divLabelsContainer);
        divLabelsContainer = document.createElement('div');
        divLabelsContainer.id = 'div-labels-overlay';
        divLabelsContainer.className = 'div-labels-overlay';
        divLabelsContainer.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < all88Keys.length; i++) {
            var cell = document.createElement('div');
            cell.className = 'div-label-cell';
            cell.dataset.midi = String(all88Keys[i].midiNote);
            var span = document.createElement('span');
            span.textContent = all88Keys[i].displayText;
            cell.appendChild(span);
            divLabelsContainer.appendChild(cell);
        }
        document.body.appendChild(divLabelsContainer);
        return divLabelsContainer;
    }

    function isDivLabelsVisible() {
        return divLabelsContainer && divLabelsContainer.classList.contains('visible');
    }

    function updateDivLabelsVisibility() {
        var on = showTags();
        ensureDivLabelsContainer();
        divLabelsContainer.classList.toggle('visible', on);
    }

    window.updateDivLabelsVisibility = updateDivLabelsVisibility;

    window.ensureDivLabelsContainerAndShow = function() {
        if (!showTags()) return;
        ensureDivLabelsContainer();
        divLabelsContainer.classList.add('visible');
    };

    var _projectionVec = null;
    /**
     * Update div label positions to overlay the 3D key label meshes (like name tags on meshes).
     * Uses setFromMatrixPosition(mesh.matrixWorld) and project(camera) then same screen math as typical Three.js label examples.
     * @param {THREE.PerspectiveCamera} camera - Scene camera
     */
    window.updateDivLabelsPosition = function(camera) {
        if (!showTags()) return;
        if (!divLabelsContainer || !isDivLabelsVisible()) return;
        if (!window.THREE || !camera) return;
        var THREE = window.THREE;
        var showOnlyWhenPressed = !!(window.keyLabelSettings.showOnlyWhenPressed);
        var activeNotes = window.activeNotes || null;
        if (!_projectionVec) _projectionVec = new THREE.Vector3();
        var widthHalf = window.innerWidth / 2;
        var heightHalf = window.innerHeight / 2;
        for (var i = 0; i < all88Keys.length; i++) {
            var midiNote = all88Keys[i].midiNote;
            var mesh = keyLabelMeshes.get(midiNote);
            if (!mesh) continue;
            _projectionVec.setFromMatrixPosition(mesh.matrixWorld);
            _projectionVec.project(camera);
            var px = _projectionVec.x * widthHalf + widthHalf;
            var py = -(_projectionVec.y * heightHalf) + heightHalf;
            var cell = divLabelsContainer.children[i];
            if (cell) {
                var displayText = (window.getKeyLabelDisplayText && window.getKeyLabelDisplayText(midiNote)) || midiToNoteName(midiNote);
                var span = cell.querySelector('span') || cell.firstElementChild;
                if (span) span.textContent = displayText;
                cell.style.left = px + 'px';
                cell.style.top = (py - 12) + 'px';
                if (showOnlyWhenPressed && activeNotes) {
                    cell.style.visibility = activeNotes.has(midiNote) ? 'visible' : 'hidden';
                } else {
                    cell.style.visibility = 'visible';
                }
            }
        }
    };

    // Store label meshes per MIDI note
    const keyLabelMeshes = new Map(); // midiNote -> THREE.Mesh
    // Store original label colors/textures for restoration
    const labelOriginalData = new Map(); // midiNote -> { text, color, fontSize, planeSize, planeHeight }
    
    /**
     * Initialize the key labels module
     */
    window.initKeyLabels = function() {
        if (showTags()) {
            updateDivLabelsVisibility();
        }
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
        
        // Set initial visibility based on settings (stickers only when showStickers() and not Show None)
        if (showStickers() && !window.keyLabelSettings.showNone) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = false; // Hidden by default
            } else {
                labelMesh.visible = true; // Always visible
            }
        } else {
            labelMesh.visible = false;
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
        if (!showStickers() || window.keyLabelSettings.showNone) return;
        
        const labelMesh = keyLabelMeshes.get(midiNote);
        if (labelMesh) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = true;
            }
        }
    };
    
    /**
     * Hide label for a key (when released)
     * @param {number} midiNote - MIDI note number
     */
    window.hideKeyLabel = function(midiNote) {
        if (!showStickers() || window.keyLabelSettings.showNone) return;
        
        const labelMesh = keyLabelMeshes.get(midiNote);
        if (labelMesh) {
            if (window.keyLabelSettings.showOnlyWhenPressed) {
                labelMesh.visible = false;
            }
        }
    };
    
    /**
     * Update all label visibility based on current settings
     */
    window.updateAllKeyLabels = function() {
        keyLabelMeshes.forEach((labelMesh, midiNote) => {
            if (!showStickers() || window.keyLabelSettings.showNone) {
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
     * Update all key label textures to the current Format (withOctave vs noteOnly).
     */
    window.updateAllLabelFormats = function() {
        if (!window.createTextTexture) return;
        keyLabelMeshes.forEach(function(labelMesh, midiNote) {
            var displayText = window.getKeyLabelDisplayText && window.getKeyLabelDisplayText(midiNote);
            if (displayText == null) return;
            var color = (labelMesh.userData && labelMesh.userData.originalColor) || '#ffffff';
            var orig = labelOriginalData.get(midiNote);
            if (orig && orig.color) color = orig.color;
            var fontSize = (labelMesh.userData && labelMesh.userData.fontSize) || 100;
            if (orig && orig.fontSize) fontSize = orig.fontSize;
            var tex = window.createTextTexture(displayText, color, fontSize);
            if (labelMesh.material && tex) {
                labelMesh.material.map = tex;
                labelMesh.material.needsUpdate = true;
            }
        });
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

