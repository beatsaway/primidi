import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
// Tone.js is loaded via script tag, available globally as Tone

// Make THREE available globally for modules that need it (like key-highlight.js)
if (typeof window !== 'undefined') {
    window.THREE = THREE;
    window.pianoBrightness = 0.01; // 1% at start; ramp 1%→100% over 4s then slider
    window.cameraSettings = window.cameraSettings || { spacebarCyclesViews: true, rOrbitsCamera: true };
}

// Create scene
const scene = new THREE.Scene();
scene.background = null; // Transparent so body gradient shows through

// Create camera - top view to see all keys clearly
const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
// Initial position/target are applied from view 11 in index.html (single source of truth). Placeholder until then.
camera.position.set(0, 0, 3);
camera.fov = 50;
camera.updateProjectionMatrix();

// Overlay is transparent and doesn't take up space, so no offset needed
const UI_HEIGHT = 0;

// Create renderer with improved settings
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance",
    alpha: true // Enable transparency
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.margin = '0';
renderer.domElement.style.padding = '0';
renderer.domElement.style.zIndex = '1'; // Lower than UI elements
document.body.appendChild(renderer.domElement);

// Add orbit controls for camera rotation
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 0, 0);
controls.update();


// White key material - ivory/white for light mode (brightness via scene lights only)
const whiteKeyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xeeefee,
    metalness: 0.0,
    roughness: 0.3,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    reflectivity: 0.5
});

// Black key material - grey
const blackKeyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x404040,
    metalness: 0.0,
    roughness: 0.4,
    clearcoat: 0.3,
    clearcoatRoughness: 0.3,
    reflectivity: 0.3
});

// Function to create text texture (make available globally for key-labels module)
window.createTextTexture = function(text, color = '#ffffff', fontSize = 100) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    // Increase canvas resolution for larger text to maintain quality
    // Scale canvas size with fontSize to ensure text renders clearly
    const canvasSize = Math.max(256, Math.ceil(fontSize * 2.5));
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    
    // Transparent background
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Text color - adjust font size for labels with numbers
    context.fillStyle = color;
    context.font = `Bold ${fontSize}px Arial`;
    // Debug: log font size for first few labels
    if (text.includes('A0') || text.includes('B0') || text.includes('C1')) {
        console.log(`Creating texture for "${text}" with fontSize: ${fontSize}, canvas: ${canvasSize}x${canvasSize}`);
    }
    context.textAlign = 'center';
    
    // Handle multi-line text (split by <br> or \n)
    const lines = text.split(/<br>|\n/);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (canvas.height - totalHeight) / 2 + fontSize * 0.8;
    
    lines.forEach((line, index) => {
        context.textBaseline = 'top';
        context.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    // Use linear filtering only for large fonts (white keys) to prevent blurring
    // For smaller fonts (black keys), use default filtering to maintain original appearance
    if (fontSize >= 150) {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
    }
    return texture;
};
const createTextTexture = window.createTextTexture; // Also keep local reference

// Function to create text label as a plane
function createTextLabel(text, xPosition, keyHeight, keyDepth, color = '#ffffff', fontSize = 100, planeSize = 0.12, planeHeight = null) {
    const texture = createTextTexture(text, color, fontSize);
    // If planeHeight is not specified, use square plane (backward compatible)
    // Otherwise use rectangular plane to match key aspect ratio
    const height = planeHeight !== null ? planeHeight : planeSize;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, height);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        alphaTest: 0.1
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    
    // Position on the top surface of the key (long rectangle surface)
    // At the lower end (front edge) of the top surface
    // Top surface is at y = keyHeight
    // Lower end means closer to the front (positive z, towards +keyDepth/2)
    plane.position.set(xPosition, keyHeight + 0.001, keyDepth / 2 - 0.05);
    
    // Rotate to lie flat on the top surface (horizontal)
    plane.rotation.x = -Math.PI / 2;
    plane.rotation.y = 0;
    plane.rotation.z = 0;
    
    return plane;
}

// Generate key labels from A0 to C8 (88-key piano)
const keyLabels = [];
// Start with A0, B0
keyLabels.push('A0', 'B0');
// Full octaves 1-7: C to B
for (let octave = 1; octave <= 7; octave++) {
    keyLabels.push(`C${octave}`, `D${octave}`, `E${octave}`, `F${octave}`, `G${octave}`, `A${octave}`, `B${octave}`);
}
// End with C8
keyLabels.push('C8');

// Function to convert MIDI note number to note name (e.g., 60 -> "C4")
function midiNoteToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const note = noteNames[midiNote % 12];
    return note + octave;
}

// Make available globally for debug module
if (typeof window !== 'undefined') {
    window.midiNoteToNoteName = midiNoteToNoteName;
}

// Function to convert note name to MIDI note number (e.g., "C4" -> 60)
function noteNameToMidiNote(noteName) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = noteName.match(/^([A-G]#?)(\d+)$/);
    if (!match) return null;
    const note = match[1];
    const octave = parseInt(match[2]);
    const noteIndex = noteNames.indexOf(note);
    if (noteIndex === -1) return null;
    return (octave + 1) * 12 + noteIndex;
}
if (typeof window !== 'undefined') {
    window.noteNameToMidiNote = noteNameToMidiNote;
}

// Function to check if a note is a black key (sharp/flat)
function isBlackKey(noteName) {
    return noteName.includes('#') || noteName.includes('♭');
}

// Function to get black key MIDI note between two white keys
function getBlackKeyMidiNote(currentNote, nextNote) {
    const currentMidi = noteNameToMidiNote(currentNote);
    const nextMidi = noteNameToMidiNote(nextNote);
    if (currentMidi === null || nextMidi === null) return null;
    // Black key is one semitone above the current note
    return currentMidi + 1;
}

// Debug: Log first few and last few labels to verify
console.log('First 5 labels:', keyLabels.slice(0, 5));
console.log('Last 5 labels:', keyLabels.slice(-5));
console.log('Total white keys:', keyLabels.length);

// Create white keys
const whiteKeyWidth = 0.15;
const whiteKeyHeight = 0.1;
const whiteKeyDepth = 0.8;
const whiteKeySpacing = 0.16;

// Black key dimensions - realistic proportions
const blackKeyWidth = 0.075; // About 2/3 of white key width (0.15)
const blackKeyHeight = 0.07; // Slightly taller than white keys
const blackKeyDepth = 0.5; // Longer, to align with white key back edge

const numWhiteKeys = keyLabels.length; // A0 to C8 = 52 white keys (88-key piano)

// Reuse geometry for better performance
const whiteKeyGeometry = new THREE.BoxGeometry(whiteKeyWidth, whiteKeyHeight, whiteKeyDepth);
const blackKeyGeometry = new THREE.BoxGeometry(blackKeyWidth, blackKeyHeight, blackKeyDepth);

// Store white key positions for black key placement
const whiteKeyPositions = [];

// Key map: MIDI note number -> { mesh, isBlack, originalMaterial, pressedMaterial, label }
const keyMap = new Map();

// Initialize keyboard visual modules (if available)
// Note: Key highlight initialization is deferred until after THREE.js is loaded
// We'll initialize it after the scene is set up, or use a deferred initialization

// Initialize key movement module
if (window.initKeyMovement) {
    window.initKeyMovement();
}

// Initialize key labels module
if (window.initKeyLabels) {
    window.initKeyLabels();
}

// Deferred initialization of key highlight (after THREE.js is available)
// This will be called after whiteKeyMaterial and blackKeyMaterial are created
function initializeKeyHighlightDeferred() {
    // THREE.js is imported as ES module and set to window.THREE
    // Check if window.THREE is available (for key-highlight.js module)
    if (typeof window === 'undefined' || !window.THREE) {
        console.log('Waiting for window.THREE...');
        setTimeout(initializeKeyHighlightDeferred, 50);
        return;
    }
    
    if (!window.THREE.MeshPhysicalMaterial) {
        console.log('Waiting for window.THREE.MeshPhysicalMaterial...');
        setTimeout(initializeKeyHighlightDeferred, 50);
        return;
    }
    
    if (window.initKeyHighlight && whiteKeyMaterial && blackKeyMaterial) {
        console.log('Initializing key highlight materials...');
        const initSuccess = window.initKeyHighlight(whiteKeyMaterial, blackKeyMaterial);
        
        // Verify initialization
        if (initSuccess && window.isKeyHighlightInitialized && window.isKeyHighlightInitialized()) {
            console.log('✓ Key highlight materials initialized successfully');
            
            // Now that materials are initialized, update all existing keys with pressed materials
            let updatedCount = 0;
            keyMap.forEach((keyData, midiNote) => {
                if (!keyData.pressedMaterial && window.getKeyPressedMaterial) {
                    keyData.pressedMaterial = window.getKeyPressedMaterial(keyData.isBlack);
                    if (keyData.pressedMaterial) {
                        updatedCount++;
                    }
                }
            });
            console.log(`✓ Updated ${updatedCount} keys with pressed materials`);
        } else {
            console.error('✗ Key highlight materials failed to initialize');
            console.error('  - initSuccess:', initSuccess);
            console.error('  - isKeyHighlightInitialized:', window.isKeyHighlightInitialized ? window.isKeyHighlightInitialized() : 'function missing');
            console.error('  - THREE available:', typeof THREE !== 'undefined');
            console.error('  - THREE.MeshPhysicalMaterial available:', typeof THREE !== 'undefined' && !!THREE.MeshPhysicalMaterial);
        }
    } else {
        console.warn('Cannot initialize key highlight - missing initKeyHighlight function or materials');
        if (!window.initKeyHighlight) console.warn('  - initKeyHighlight function missing');
        if (!whiteKeyMaterial) console.warn('  - whiteKeyMaterial missing');
        if (!blackKeyMaterial) console.warn('  - blackKeyMaterial missing');
    }
}

for (let i = 0; i < numWhiteKeys; i++) {
    const key = new THREE.Mesh(whiteKeyGeometry, whiteKeyMaterial.clone());
    const originalMaterial = key.material;
    
    const xPosition = (i - numWhiteKeys / 2) * whiteKeySpacing + whiteKeySpacing / 2;
    whiteKeyPositions.push(xPosition);
    key.position.set(xPosition, whiteKeyHeight / 2, 0);
    key.castShadow = true;
    key.receiveShadow = true;
    scene.add(key);
    
    // Add label as a textured plane on the top surface (moved up closer to black keys)
    // Use full label with octave number (A0, B0, C1, D1, etc.)
    const fullLabel = keyLabels[i]; // Keep full label: A0, B0, C1, D1, etc.
    // Debug: Log first few labels
    if (i < 5) console.log(`Key ${i}: Label = "${fullLabel}"`);
    // Use whiteKeyWidth for planeSize so text texture matches the key width
    // Keep plane square to prevent text stretching - the larger size will make text bigger
    // Increased fontSize significantly to compensate for larger plane size
    // Original: 80px font on 0.12 plane = 666.67px per unit
    // New: 200px font on 0.15 plane = 1333.33px per unit (2x larger)
    const label = createTextLabel(fullLabel, xPosition, whiteKeyHeight, whiteKeyDepth, '#ffffff', 200, whiteKeyWidth);
    // Attach label to key so it moves with key press animation (local position on top of key)
    label.position.set(0, whiteKeyHeight / 2 + 0.001, whiteKeyDepth / 2 - 0.25);
    key.add(label);
    
    // Store key reference in keyMap
    const midiNote = noteNameToMidiNote(fullLabel);
    if (midiNote !== null) {
        // Get pressed material from key highlight module (if available and initialized)
        // If not initialized yet, we'll get it later when the module is initialized
        let pressedMaterial = null;
        if (window.getKeyPressedMaterial && window.isKeyHighlightInitialized && window.isKeyHighlightInitialized()) {
            pressedMaterial = window.getKeyPressedMaterial(false);
        }
        
        // Store original Y position at creation time (not just when pressed)
        const keyData = {
            mesh: key,
            isBlack: false,
            originalMaterial: originalMaterial,
            pressedMaterial: pressedMaterial,
            label: fullLabel,
            originalY: whiteKeyHeight / 2, // Store original position: center of key at y = 0.05
            isPressed: false, // Track visual press state
            midiNote: midiNote // Store for animation tracking
        };
        keyMap.set(midiNote, keyData);
        
        // Register label with key-labels module (if available)
        // Store original data for color changes
        if (window.registerKeyLabel) {
            window.registerKeyLabel(midiNote, label, {
                text: fullLabel,
                color: '#ffffff',
                fontSize: 200,
                planeSize: whiteKeyWidth,
                planeHeight: null
            });
            // Also store in userData for easy access
            label.userData.originalText = fullLabel;
            label.userData.originalColor = '#ffffff';
            label.userData.fontSize = 200;
            label.userData.planeSize = whiteKeyWidth;
        }
    }
}

// Function to check if a black key should be placed between two white keys
function shouldHaveBlackKey(note1, note2) {
    const note1Letter = note1[0]; // Get the letter (E, F, G, A, B, C, D)
    const note2Letter = note2[0];
    
    // Black keys go between: C-D, D-E, F-G, G-A, A-B
    // NOT between: E-F, B-C
    const blackKeyPairs = [
        ['C', 'D'],
        ['D', 'E'],
        ['F', 'G'],
        ['G', 'A'],
        ['A', 'B']
    ];
    
    return blackKeyPairs.some(pair => pair[0] === note1Letter && pair[1] === note2Letter);
}

// Function to get black key label (both sharp and flat, no octave numbers)
function getBlackKeyLabel(currentNote, nextNote, mode) {
    const note1Letter = currentNote[0];
    const note2Letter = nextNote[0];
    
    // Use provided mode or default to setting
    const labelMode = mode || (window.keyLabelSettings && window.keyLabelSettings.blackKeyLabelMode) || 'both';
    
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
    
    if (labelMode === 'sharp') {
        return sharp || '';
    } else if (labelMode === 'flat') {
        return flat || '';
    } else {
        // both (default)
        return sharp + '<br>' + flat;
    }
}

// For additional div labels: get one-line black key text (e.g. "C#/D♭", "C#", "D♭"). Returns null for white keys.
window.getBlackKeyDivLabelText = function(midiNote) {
    const keyData = keyMap.get(midiNote);
    if (!keyData || !keyData.isBlack) return null;
    const allLabels = window.getAllKeyLabels && window.getAllKeyLabels();
    if (!allLabels) return null;
    const mesh = allLabels.get(midiNote);
    if (!mesh || !mesh.userData.currentNote) return null;
    const mode = (window.keyLabelSettings && window.keyLabelSettings.blackKeyLabelMode) || 'both';
    const html = getBlackKeyLabel(mesh.userData.currentNote, mesh.userData.nextNote, mode);
    return html.replace('<br>', '/');
};

// Get the label text to show on a key (sticker or tag) based on Format: withOctave (A3, C1) or noteOnly (A, B, C).
window.getKeyLabelDisplayText = function(midiNote) {
    const keyData = keyMap.get(midiNote);
    const format = (window.keyLabelSettings && window.keyLabelSettings.labelFormat) || 'noteOnly';
    const withOctave = (format === 'withOctave');
    const fullName = midiNoteToNoteName(midiNote);
    if (!keyData || !keyData.isBlack) {
        return withOctave ? fullName : fullName.replace(/\d+$/, '');
    }
    const allLabels = window.getAllKeyLabels && window.getAllKeyLabels();
    if (!allLabels) return fullName;
    const mesh = allLabels.get(midiNote);
    if (!mesh || !mesh.userData.currentNote) return fullName;
    const mode = (window.keyLabelSettings && window.keyLabelSettings.blackKeyLabelMode) || 'both';
    let text = getBlackKeyLabel(mesh.userData.currentNote, mesh.userData.nextNote, mode);
    text = text.replace('<br>', '/');
    if (withOctave) {
        const octave = Math.floor(midiNote / 12) - 1;
        text = text + octave;
    }
    return text;
};

// Add black keys between appropriate white keys
for (let i = 0; i < numWhiteKeys - 1; i++) {
    const currentNote = keyLabels[i];
    const nextNote = keyLabels[i + 1];
    
    if (shouldHaveBlackKey(currentNote, nextNote)) {
        const blackKey = new THREE.Mesh(blackKeyGeometry, blackKeyMaterial.clone());
        const originalMaterial = blackKey.material;
        
        // Position between the two white keys
        const xPosition = (whiteKeyPositions[i] + whiteKeyPositions[i + 1]) / 2;
        // Position: align back edge with white keys' back edge
        // White keys extend from z = -0.4 to z = 0.4 (centered at z = 0)
        // Labels are at z = 0.35 (front edge)
        // Position black key so its back edge aligns with white keys' back edge at z = -0.4
        const whiteKeyBackEdge = -whiteKeyDepth / 2; // -0.4
        const blackKeyZ = whiteKeyBackEdge + blackKeyDepth / 2; // -0.4 + 0.25 = -0.15
        blackKey.position.set(xPosition, whiteKeyHeight + blackKeyHeight / 2, blackKeyZ);
        blackKey.castShadow = true;
        blackKey.receiveShadow = true;
        scene.add(blackKey);
        
        // Add label as a textured plane on the top surface (lower part) with moody grey text
        // Position label relative to the black key's front edge
        // Use the setting from keyLabelSettings if available
        const labelMode = (window.keyLabelSettings && window.keyLabelSettings.blackKeyLabelMode) || 'both';
        const blackKeyLabel = getBlackKeyLabel(currentNote, nextNote, labelMode);
        const blackKeyFrontEdge = blackKeyZ + blackKeyDepth / 2; // Front edge of black key
        const label = createTextLabel(blackKeyLabel, xPosition, whiteKeyHeight + blackKeyHeight, blackKeyDepth, '#888888', 65, 0.15);
        // Attach label to black key so it moves with key press animation (local position on top of key)
        label.position.set(0, blackKeyHeight / 2 + 0.001, blackKeyDepth / 2 - 0.1);
        blackKey.add(label);
        
        // Store black key reference in keyMap
        const midiNote = getBlackKeyMidiNote(currentNote, nextNote);
        if (midiNote !== null) {
            // Get pressed material from key highlight module (if available and initialized)
            // If not initialized yet, we'll get it later when the module is initialized
            let pressedMaterial = null;
            if (window.getKeyPressedMaterial && window.isKeyHighlightInitialized && window.isKeyHighlightInitialized()) {
                pressedMaterial = window.getKeyPressedMaterial(true);
            }
            
            // Get the sharp note name for the black key
            const sharpNoteName = midiNoteToNoteName(midiNote);
            // Store original Y position at creation time (not just when pressed)
            const blackKeyY = whiteKeyHeight + blackKeyHeight / 2;
            const keyData = {
                mesh: blackKey,
                isBlack: true,
                originalMaterial: originalMaterial,
                pressedMaterial: pressedMaterial,
                label: sharpNoteName,
                originalY: blackKeyY, // Store original position
                isPressed: false, // Track visual press state
                midiNote: midiNote // Store for animation tracking
            };
            keyMap.set(midiNote, keyData);
            
            // Register label with key-labels module (if available)
            // Store original data for color changes
            if (window.registerKeyLabel) {
                window.registerKeyLabel(midiNote, label, {
                    text: blackKeyLabel,
                    color: '#888888',
                    fontSize: 65,
                    planeSize: 0.15,
                    planeHeight: null
                });
                // Also store in userData for easy access
                label.userData.originalText = blackKeyLabel;
                label.userData.originalColor = '#888888';
                label.userData.fontSize = 65;
                label.userData.planeSize = 0.15;
                // Store note information for label regeneration
                label.userData.currentNote = currentNote;
                label.userData.nextNote = nextNote;
            }
        }
    }
}

// Apply default label format (e.g. note only) to all key textures after keys are created
if (window.updateAllLabelFormats) {
    window.updateAllLabelFormats();
}

// Function to update all black key labels based on mode
window.updateBlackKeyLabelsFromMain = function(mode) {
    const labelMode = mode || (window.keyLabelSettings && window.keyLabelSettings.blackKeyLabelMode) || 'both';
    
    // Iterate through all keys in keyMap
    keyMap.forEach((keyData, midiNote) => {
        if (keyData.isBlack) {
            // Find the label mesh for this MIDI note
            const labelMesh = window.getAllKeyLabels ? window.getAllKeyLabels().get(midiNote) : null;
            if (labelMesh && labelMesh.userData.currentNote && labelMesh.userData.nextNote) {
                // Use getKeyLabelDisplayText so Format (note only vs note+octave) is respected
                const newLabelText = window.getKeyLabelDisplayText ? window.getKeyLabelDisplayText(midiNote) : getBlackKeyLabel(labelMesh.userData.currentNote, labelMesh.userData.nextNote, labelMode);
                
                // Update the label texture
                if (window.updateLabelColor && window.createTextTexture) {
                    const originalData = labelMesh.userData;
                    const newTexture = window.createTextTexture(newLabelText, originalData.originalColor || '#888888', originalData.fontSize || 65);
                    if (labelMesh.material) {
                        labelMesh.material.map = newTexture;
                        labelMesh.material.needsUpdate = true;
                    }
                    
                    // Update stored original text
                    labelMesh.userData.originalText = newLabelText;
                    
                    // Update in key-labels module if registered
                    if (window.registerKeyLabel) {
                        window.registerKeyLabel(midiNote, labelMesh, {
                            text: newLabelText,
                            color: originalData.originalColor || '#888888',
                            fontSize: originalData.fontSize || 65,
                            planeSize: originalData.planeSize || 0.15,
                            planeHeight: originalData.planeHeight || null
                        });
                    }
                }
            }
        }
    });
};

// Initialize key highlight module now that THREE.js is available
initializeKeyHighlightDeferred();

// Improved lighting setup — start dim and ramp to target for premium load effect
const LIGHT_RAMP_DURATION = 1.25; // seconds, match bg-reveal transition
const PIANO_BRIGHTNESS_RAMP_DURATION = 4; // seconds: 1% → 100% (no hold)
const PIANO_BRIGHTNESS_START = 0.01;      // 1%
const ambientLight = new THREE.AmbientLight(0xffffff, 0);
scene.add(ambientLight);
const ambientLightTarget = 0.4;

// Main directional light with shadows
const directionalLight = new THREE.DirectionalLight(0xffffff, 0);
directionalLight.position.set(5, 8, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 20;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
directionalLight.shadow.bias = -0.0001;
scene.add(directionalLight);
const directionalLightTarget = 1.0;

// Fill light from the opposite side for better depth
const fillLight = new THREE.DirectionalLight(0xffffff, 0);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);
const fillLightTarget = 0.3;

// Rim light for edge definition
const rimLight = new THREE.PointLight(0xffffff, 0, 15);
rimLight.position.set(0, 5, -8);
scene.add(rimLight);
const rimLightTarget = 0.5;

let loadRevealStartTime = null;
let pianoBrightnessRampDone = false;

// Ground plane removed - piano now floats in space

// ========== Audio Setup (must be before animate() to avoid initialization errors) ==========
// Track note attack times for dynamic filter control
const noteAttackTimes = new Map(); // midiNote -> { attackTimestamp: number, velocity: number, frequency: number }
// Track frequency modulations for pitch drift/vibrato
const frequencyModulations = new Map(); // midiNote -> { modulation: object, releaseTime: number }
// Track attack noise nodes per note
const attackNoiseNodes = new Map(); // midiNote -> attackNoiseNode
// Track release transient nodes per note
const releaseTransientNodes = new Map(); // midiNote -> releaseTransientNode
// Track note names per MIDI note (for proper release)
const unisonVoices = new Map(); // midiNote -> [noteName]

// Dynamic filter is now initialized below after synth is created
// (Moved to after synth initialization)


// Animation loop
// Optimize: Track frame count to update filter less frequently (every 3 frames = ~20fps instead of 60fps)
let filterUpdateFrameCounter = 0;
let lastAnimateTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const deltaSec = (now - lastAnimateTime) / 1000;
    lastAnimateTime = now;

    // Piano brightness: 1% → 100% over 4s, then slider
    if (loadRevealStartTime === null) loadRevealStartTime = now;
    const elapsed = (now - loadRevealStartTime) / 1000;
    let lightScale;
    if (elapsed < PIANO_BRIGHTNESS_RAMP_DURATION) {
        const t = elapsed / PIANO_BRIGHTNESS_RAMP_DURATION;
        const tEased = 1 - Math.pow(1 - t, 1.4);
        lightScale = PIANO_BRIGHTNESS_START + (1 - PIANO_BRIGHTNESS_START) * tEased;
    } else {
        if (!pianoBrightnessRampDone) {
            pianoBrightnessRampDone = true;
            window.pianoBrightness = 1; // stay at 100% after ramp; slider controls from here
        }
        lightScale = (typeof window.pianoBrightness === 'number') ? window.pianoBrightness : 1;
    }
    ambientLight.intensity = ambientLightTarget * lightScale;
    directionalLight.intensity = directionalLightTarget * lightScale;
    fillLight.intensity = fillLightTarget * lightScale;
    rimLight.intensity = rimLightTarget * lightScale;

    // Idle orbit: slow rotation around current target (works from any view when toggled ON)
    if (window.cameraIdleOrbit && window.cameraIdleOrbit.active && window.camera && window.controls) {
        const o = window.cameraIdleOrbit;
        if (o.lastAutoViewCheck == null) o.lastAutoViewCheck = now;
        if (now - o.lastAutoViewCheck >= 3000) {
            o.lastAutoViewCheck = now;
            if (Math.random() < 0.33 && window.cycleToNextCameraView) window.cycleToNextCameraView();
        }
        const tx = o.targetX != null ? o.targetX : 0;
        const ty = o.targetY != null ? o.targetY : 0;
        const tz = o.targetZ != null ? o.targetZ : 0;
        const rad = o.radius != null ? o.radius : 2.4;
        o.angle = (o.angle || 0) + (o.speed || 0.08) * deltaSec;
        camera.position.x = tx + rad * Math.sin(o.angle);
        camera.position.z = tz + rad * Math.cos(o.angle);
        camera.position.y = o.height !== undefined ? o.height : 1.06;
        controls.target.set(tx, ty, tz);
    }

    controls.update();

    if (window.shouldShowDivLabels && window.shouldShowDivLabels()) {
        if (window.ensureDivLabelsContainerAndShow) window.ensureDivLabelsContainerAndShow();
        scene.updateMatrixWorld(true);
        if (window.updateDivLabelsPosition) window.updateDivLabelsPosition(camera);
    }

    // Update key animations (for animated movement style)
    if (window.updateKeyAnimations) {
        const currentTime = performance.now() / 1000; // Convert to seconds
        window.updateKeyAnimations(currentTime);
    }
    
    renderer.render(scene, camera);
    
        filterUpdateFrameCounter++;
        if (filterUpdateFrameCounter >= 3) filterUpdateFrameCounter = 0;
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate();

// ========== MIDI and Sound Setup ==========

// ========== Frequency-Dependent Envelope System ==========
// Based on research3: Piano physics - note-dependent decay and release times

/**
 * Calculate release time based on MIDI note number
 * Formula: T_release(n) = R0 * 2^(-n/12 * d)
 * Where n is semitone offset from A0 (MIDI note 21)
 * 
 * @param {number} midiNote - MIDI note number (21 = A0, 108 = C8)
 * @returns {number} - Release time in seconds
 */
function calculateReleaseTime(midiNote) {
    const A0_MIDI = 21; // A0 MIDI note number
    const R0 = 2.0; // Base release time in seconds for A0 (2000ms)
    const d = 3.0; // Decay factor (halving per octave)
    
    const semitoneOffset = midiNote - A0_MIDI;
    const releaseTime = R0 * Math.pow(2, -semitoneOffset / 12 * d);
    
    // Clamp to reasonable range: 0.01s (10ms) to 2.0s (2000ms)
    return Math.max(0.01, Math.min(2.0, releaseTime));
}

// calculateSustainDecayTime is now provided by sustain-decay.js module

/**
 * Calculate decay parameter for Tone.js envelope
 * Decay is the time from peak to sustain level
 * For piano, this should be relatively short and note-independent
 * 
 * @returns {number} - Decay time in seconds
 */
function calculateDecayTime() {
    // Decay is typically short (100-200ms) and note-independent
    // This is the initial attack-to-sustain transition
    return 0.1;
}

// ========== Research4 Physics Implementation ==========
// Physics modules are loaded via script tags and available as window.* functions
// Modules: physics-settings.js, velocity-timbre.js, two-stage-decay.js, pedal-coupling.js

// Note: noteAttackTimes and dynamicFilter are declared earlier (before animate() function)

// GSL sample synth is provided by audio/gsl-synth.js (window.synth)
let synth = typeof window !== 'undefined' ? window.synth : null;

function initializeSynth() {
    if (synth) return synth;
    synth = typeof window !== 'undefined' ? window.synth : null;
    return synth;
}

// Helper function to safely get synth (initializes if needed)
function getSynth() {
    if (!synth) {
        // Try to initialize (may fail if AudioContext not allowed yet)
        try {
            initializeSynth();
        } catch (e) {
            console.warn('Synth initialization failed (may need user interaction):', e);
            return null;
        }
    }
    return synth;
}

// Tone compatibility for midi-mapping (uses Tone.now())
if (typeof window !== 'undefined') {
    window.Tone = window.Tone || {};
    window.Tone.now = () => {
        if (synth && synth.synth && synth.synth.audioCtx) {
            return synth.synth.audioCtx.currentTime;
        }
        return performance.now() / 1000;
    };
    Object.defineProperty(window.Tone, 'context', {
        get: () => (synth && synth.synth && synth.synth.audioCtx) ? synth.synth.audioCtx : null,
        configurable: true
    });
    window.Tone.Transport = {
        scheduleOnce: (callback, time) => setTimeout(callback, 0),
        clear: (id) => clearTimeout(id),
        state: 'started'
    };
    // Stubs so midi-mapping and resetAllSettingsToDefaults don't reference missing modules
    window.physicsSettings = window.physicsSettings || {};
    window.envelopeSettings = window.envelopeSettings || { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.5 };
    if (!window.velocityMappingSettings) window.velocityMappingSettings = { velocityExponent: 2.0, targetSPL: 85 };
    if (!window.frequencyCompensationSettings) window.frequencyCompensationSettings = { targetSPL: 85 };
    if (!window.delayPseudoReverbSettings) window.delayPseudoReverbSettings = {};
    if (!window.tremoloSettings) window.tremoloSettings = {};
}

// No dynamic filter for GSL sample playback
let filter = null;
function initializeDynamicFilter() {
    return filter;
}
let fakeBinauralOutput = null; // Will hold the fake binaural output node
let reverbOutput = null; // Will hold the reverb output node
let delayPseudoReverbOutput = null; // Will hold the delay pseudo-reverb output node
let spectralBalanceOutput = null; // Will hold the spectral balance output node
let spectralResonanceDelayOutput = null; // Will hold the spectral resonance delay output node
let tremoloOutput = null; // Will hold the tremolo output node

// Connect filter to synth's master gain
if (filter && synth && synth.synth && synth.synth.masterGain) {
    synth.synth.masterGain.disconnect();
    synth.synth.masterGain.connect(filter);
}

// Function to reconnect audio chain (called when reverb or fake binaural is toggled)
window.reconnectAudioChain = function() {
    // Early return if synth is not initialized
    if (!synth || !synth.synth || !synth.synth.masterGain) {
        console.warn('reconnectAudioChain: synth not initialized yet');
        return;
    }
    
    // Disconnect everything first
    synth.synth.masterGain.disconnect();
    if (filter) {
        filter.disconnect();
    }
    if (fakeBinauralOutput) {
        fakeBinauralOutput.disconnect();
    }
    if (reverbOutput) {
        reverbOutput.disconnect();
    }
    if (delayPseudoReverbOutput) {
        delayPseudoReverbOutput.disconnect();
    }
    if (spectralBalanceOutput) {
        spectralBalanceOutput.disconnect();
    }
    if (spectralResonanceDelayOutput) {
        spectralResonanceDelayOutput.disconnect();
    }
    if (tremoloOutput) {
        tremoloOutput.disconnect();
    }
    
    // Start with synth's master gain
    let currentOutput = synth.synth.masterGain;
    
    // Connect through dynamic filter if enabled
    if (filter) {
        currentOutput.connect(filter);
        currentOutput = filter;
    }
    
    // Connect fake binaural if enabled (before reverb)
    if (window.physicsSettings && window.physicsSettings.fakeBinaural && 
        window.fakeBinauralSettings && window.fakeBinauralSettings.enabled &&
        window.connectFakeBinaural) {
        fakeBinauralOutput = window.connectFakeBinaural(currentOutput);
        currentOutput = fakeBinauralOutput;
    } else {
        fakeBinauralOutput = null;
        // If fake binaural is disabled, ensure stereo output by creating a pass-through merger
        // This converts mono to stereo before passing to reverb or destination
        // Use Web Audio API ChannelMergerNode
        if (synth && synth.synth && synth.synth.audioCtx) {
            const audioCtx = synth.synth.audioCtx;
            const stereoPassThrough = audioCtx.createChannelMerger(2);
            currentOutput.connect(stereoPassThrough, 0, 0); // Left channel
            currentOutput.connect(stereoPassThrough, 0, 1); // Right channel (duplicate for mono)
            currentOutput = stereoPassThrough;
        }
    }
    
    // Connect binaural reverb if enabled (after fake binaural)
    if (window.physicsSettings && window.physicsSettings.binauralReverb && 
        window.binauralReverbSettings && window.binauralReverbSettings.enabled &&
        window.connectBinauralReverb) {
        reverbOutput = window.connectBinauralReverb(currentOutput);
        currentOutput = reverbOutput;
    } else {
        reverbOutput = null;
    }
    
    // Connect delay pseudo-reverb if enabled (after reverb, as CPU-efficient alternative/complement)
    if (window.physicsSettings && window.physicsSettings.delayPseudoReverb &&
        window.delayPseudoReverbSettings && window.delayPseudoReverbSettings.enabled &&
        window.connectDelayPseudoReverb) {
        delayPseudoReverbOutput = window.connectDelayPseudoReverb(currentOutput);
        currentOutput = delayPseudoReverbOutput;
    } else {
        delayPseudoReverbOutput = null;
    }
    
    // Connect spectral balance filter (after reverb/delay, before other delays)
    // Always call connectSpectralBalance - it handles enabled/disabled state internally
    if (window.connectSpectralBalance) {
        spectralBalanceOutput = window.connectSpectralBalance(currentOutput);
        currentOutput = spectralBalanceOutput;
    } else {
        spectralBalanceOutput = null;
    }
    
    // Connect spectral resonance delay if enabled (after spectral balance, before destination)
    if (window.physicsSettings && window.physicsSettings.spectralResonanceDelay &&
        window.connectSpectralResonanceDelay) {
        spectralResonanceDelayOutput = window.connectSpectralResonanceDelay(currentOutput);
        currentOutput = spectralResonanceDelayOutput;
    } else {
        spectralResonanceDelayOutput = null;
    }
    
    // Connect tremolo effect if enabled (after all delays, before destination)
    // This creates a sense of movement and life in the sound
    if (window.physicsSettings && window.physicsSettings.tremolo &&
        window.connectTremolo) {
        tremoloOutput = window.connectTremolo(currentOutput);
        currentOutput = tremoloOutput;
    } else {
        tremoloOutput = null;
    }
    
    // Connect to destination
    if (currentOutput && synth && synth.synth && synth.synth.audioCtx) {
        if (currentOutput.connect) {
            currentOutput.connect(synth.synth.audioCtx.destination);
        } else {
            // Fallback: connect synth directly
            synth.synth.masterGain.connect(synth.synth.audioCtx.destination);
        }
    } else if (synth && synth.synth && synth.synth.masterGain && synth.synth.audioCtx) {
        synth.synth.masterGain.connect(synth.synth.audioCtx.destination);
    }
};

// Note: Initial audio chain connection is handled by reconnectAudioChain() 
// which is called after synth initialization (on user click)

// Initialize VelocityTimbreManager for advanced timbre features (if available)
let timbreManager = null;
if (typeof window !== 'undefined' && window.VelocityTimbreManager && synth && synth.synth && synth.synth.audioCtx) {
    try {
        timbreManager = new window.VelocityTimbreManager(synth.synth.audioCtx);
    } catch (e) {
        console.warn('Failed to initialize VelocityTimbreManager:', e);
    }
}

// Set master volume when GSL synth has created its context (default 1000%, range 0–2000%)
if (synth && synth.setMasterVolume) {
    synth.setMasterVolume(1000);
}

// ========== MIDI Mapping Module ==========
// Initialize MIDI mapping module (must be after synth and state variables are created)
function initializeMidiMapping() {
    if (window.initMidiMapping) {
        // Create a reference object for sustainPedalActive so the module can modify it
        const sustainPedalActiveRef = { 
            get value() { return sustainPedalActive; },
            set value(v) { sustainPedalActive = v; }
        };
        
        window.initMidiMapping({
            synth: synth,
            keyMap: keyMap,
            dynamicFilter: filter,
            sustainPedalActiveRef: sustainPedalActiveRef,
            pressKey: pressKey,
            releaseKey: releaseKey,
            midiNoteToNoteName: midiNoteToNoteName,
            activeNotes: activeNotes,
            physicallyHeldNotes: physicallyHeldNotes,
            sustainedNotes: sustainedNotes,
            noteAttackTimes: noteAttackTimes,
            frequencyModulations: frequencyModulations,
            attackNoiseNodes: attackNoiseNodes,
            releaseTransientNodes: releaseTransientNodes,
            unisonVoices: unisonVoices,
            sustainDecayAutomations: sustainDecayAutomations,
            noteVolumeNodes: noteVolumeNodes
        });
    }
}

// Initialize MIDI mapping will be called after all state variables are declared

// ========== Physics Settings ==========
// Physics settings are managed by physics-settings.js module
// Initialize settings UI when DOM is ready
// Also initialize binaural reverb if it's enabled by default
function initializePhysicsSettings() {
    if (typeof window.initPhysicsSettings === 'function') {
        window.initPhysicsSettings();
    }
    
    // If binaural reverb is enabled in physics settings, initialize it
    // Use a small delay to ensure all modules are loaded
    setTimeout(() => {
        if (window.physicsSettings && window.physicsSettings.binauralReverb) {
            if (window.binauralReverbSettings) {
                window.binauralReverbSettings.enabled = true;
                // Initialize reverb if enabling
                if (window.initializeBinauralReverb) {
                    window.initializeBinauralReverb();
                }
                // Reconnect audio chain to apply changes
                if (window.reconnectAudioChain) {
                    window.reconnectAudioChain();
                }
            }
        }
    }, 100); // Small delay to ensure all modules are loaded
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePhysicsSettings);
} else {
    initializePhysicsSettings();
}

// Sustain pedal state
let sustainPedalActive = false;
// Expose to window for realistic sustain module
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'sustainPedalActive', {
        get: () => sustainPedalActive,
        set: (value) => { sustainPedalActive = value; }
    });
}
// Track notes that are currently being held down (physically pressed)
const physicallyHeldNotes = new Set();
// Track notes that are being sustained by the pedal (not physically pressed)
const sustainedNotes = new Set(); // midiNote -> noteName
// Track all currently active notes (playing) - for reference/debugging
const activeNotes = new Map(); // midiNote -> noteName
// Note: noteAttackTimes is declared earlier (before animate() function)
// Track sustain decay automation for each sustained note
const sustainDecayAutomations = new Map(); // midiNote -> { volumeNode, cancel }
// Map of note names to their volume nodes for sustain decay
const noteVolumeNodes = new Map(); // noteName -> Tone.Volume

// Expose to window for MIDI debug module (after all variables are declared)
if (typeof window !== 'undefined') {
    window.physicallyHeldNotes = physicallyHeldNotes;
    window.sustainedNotes = sustainedNotes;
    window.activeNotes = activeNotes;
    window.unisonVoices = unisonVoices;
    window.noteVolumeNodes = noteVolumeNodes;
}

// Initialize MIDI mapping after all state variables are declared
initializeMidiMapping();

// Function to press a key visually
// This ensures visual state matches audio state - key should be at y = -0.02 when pressed
// @param {number} midiNote - MIDI note number
// @param {number} velocity - Optional MIDI velocity (0-127) for velocity-based animation duration
function pressKey(midiNote, velocity) {
    const keyData = keyMap.get(midiNote);
    if (keyData) {
        // If key is already pressed, reset it first to prevent cumulative movement
        if (keyData.isPressed) {
            // Reset to original position before pressing again
            keyData.mesh.position.y = keyData.originalY;
        }
        
        // Ensure we have a valid originalY (fallback to current position if missing)
        if (keyData.originalY === undefined) {
            keyData.originalY = keyData.mesh.position.y;
        }
        
        // Apply highlight (yellow tint) if enabled
        if (window.applyKeyHighlight) {
            window.applyKeyHighlight(keyData);
        }
        
        // Apply movement (up/down effect) if enabled
        const keyHeight = keyData.isBlack ? blackKeyHeight : whiteKeyHeight;
        if (window.pressKeyMovement) {
            window.pressKeyMovement(keyData, keyHeight, velocity);
        }
        
        // Show label if enabled
        if (window.showKeyLabel) {
            window.showKeyLabel(midiNote);
        }
        
        keyData.isPressed = true; // Mark as pressed
    }
}

// Function to release a key visually
// This ensures visual state matches audio state - key should be at y = 0.05 when released
function releaseKey(midiNote) {
    const keyData = keyMap.get(midiNote);
    if (keyData) {
        // Remove highlight (restore original material)
        if (window.removeKeyHighlight) {
            window.removeKeyHighlight(keyData);
        }
        
        // Apply movement (restore position) if enabled
        const keyHeight = keyData.isBlack ? blackKeyHeight : whiteKeyHeight;
        if (window.releaseKeyMovement) {
            window.releaseKeyMovement(keyData, keyHeight);
        } else {
            // Fallback: restore position manually if module not available
            if (keyData.originalY !== undefined) {
                keyData.mesh.position.y = keyData.originalY;
            } else {
                // Fallback: calculate original position if not stored
                if (keyData.isBlack) {
                    keyData.mesh.position.y = whiteKeyHeight + blackKeyHeight / 2;
                } else {
                    keyData.mesh.position.y = whiteKeyHeight / 2; // 0.05
                }
            }
        }
        
        // Hide label if enabled
        if (window.hideKeyLabel) {
            window.hideKeyLabel(midiNote);
        }
        
        keyData.isPressed = false; // Mark as released
    }
}

// ========== MIDI Mapping Module ==========
// Velocity mapping and ADSR envelope handling is now in midi-mapping.js module

// Function to handle MIDI note on (wrapper for midi-mapping module)
function handleNoteOn(midiNote, velocity) {
    if (window.handleMidiNoteOn) {
        window.handleMidiNoteOn(midiNote, velocity);
    }
}

// Function to handle MIDI note off (wrapper for midi-mapping module)
function handleNoteOff(midiNote) {
    if (window.handleMidiNoteOff) {
        window.handleMidiNoteOff(midiNote);
    }
}


// Legacy function - now handled by midi-mapping module (kept for reference, can be removed)
function handleNoteOn_OLD(midiNote, velocity) {
    const noteName = midiNoteToNoteName(midiNote);
    if (noteName) {
        // If this note is already active, release it first to prevent multiple voices
        // This is especially important when pressing the same note multiple times while sustain is active
        if (activeNotes.has(midiNote)) {
            // CRITICAL: Release visual key first to prevent cumulative movement
            // This ensures visual state matches audio state
            releaseKey(midiNote);
            
            // Release all voices for this note (including unison voices if any)
            const voicesToRelease = unisonVoices.get(midiNote);
            if (voicesToRelease && voicesToRelease.length > 0) {
                // Release all tracked voices (including duplicates - each triggerAttack needs a triggerRelease)
                voicesToRelease.forEach(voiceNoteName => {
                    try {
                        synth.triggerRelease(voiceNoteName);
                    } catch (e) {
                        // Ignore errors
                    }
                });
                unisonVoices.delete(midiNote);
            } else {
                try {
                    synth.triggerRelease(noteName);
                } catch (e) {
                    // Ignore errors if note doesn't exist
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
        
        // Get velocity-dependent attack time (from velocity-attack.js module)
        // If velocity-dependent attack is enabled, use it; otherwise use envelope settings
        // Pass primary envelope attack as base for velocity-dependent scaling
        const attackTime = (window.physicsSettings && window.physicsSettings.velocityAttack && window.getAttackTimeForVelocity) ?
            window.getAttackTimeForVelocity(velocity, baseEnvelope.attack) : baseEnvelope.attack;
        
        // Get frequency for this note (for filter keytracking)
        const frequency = midiNoteToFrequency(midiNote);
        
        // Store note attack info for dynamic filter control
        // Store timestamp when note was attacked (for filter decay calculation)
        const attackTimestamp = synth.synth.audioCtx.currentTime;
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
        
        // Ensure synth is initialized
        if (!synth) {
            initializeSynth();
        }
        
        // Update envelope parameters on the synth before triggering
        // Note: With Web Audio API, we can set per-note envelope settings
        if (synth) {
            synth.setNoteEnvelope(noteName, {
                attack: attackTime,
                decay: adjustedDecayTime,
                sustain: (window.physicsSettings && window.physicsSettings.twoStageDecay) ? 
                    (baseEnvelope.sustain * twoStageDecay.amplitudeRatio) : baseEnvelope.sustain,
                release: releaseTime
            });
        }
        
        // Update dynamic filter based on this note (if enabled)
        if (window.physicsSettings && window.physicsSettings.dynamicFilter && window.getDynamicFilterSettings && filter) {
            const filterSettings = window.getDynamicFilterSettings(velocity, frequency, 0);
            // Smoothly update filter cutoff
            if (synth && synth.synth && synth.synth.audioCtx) {
                const filterNow = synth.synth.audioCtx.currentTime;
                filter.frequency.cancelScheduledValues(filterNow);
                filter.frequency.setValueAtTime(filter.frequency.value, filterNow);
                filter.frequency.exponentialRampToValueAtTime(filterSettings.frequency, filterNow + 0.01);
            }
        }
        
        // Play sound with two-stage velocity mapping (velocity curve + frequency compensation)
        // Uses settings from velocity-mapping-settings.js if available, otherwise defaults
        const k = (window.velocityMappingSettings && window.velocityMappingSettings.velocityExponent) ? window.velocityMappingSettings.velocityExponent : 2.0;
        const targetSPL = (window.velocityMappingSettings && window.velocityMappingSettings.targetSPL) ? window.velocityMappingSettings.targetSPL : 85;
        let amplitude = velocityToAmplitudeWithCompensation(velocity, midiNote, k, targetSPL);
        
        // Apply pedal coupling (research4) - adds sympathetic resonance - from pedal-coupling.js module
        if (window.physicsSettings && window.physicsSettings.pedalCoupling && sustainPedalActive && window.applyPedalCoupling) {
            const freq = midiNoteToFrequency(midiNote);
            const couplingGain = window.applyPedalCoupling(freq, velocity, 1.0, activeNotes, midiNoteToFrequency);
            amplitude = Math.min(1.0, amplitude + couplingGain);
        }
        
        // Trigger the note
        if (synth) {
            synth.triggerAttack(noteName, undefined, amplitude);
        }
        // Track the note name for release
        unisonVoices.set(midiNote, [noteName]);
        
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
        
        // Visual feedback
        pressKey(midiNote);
    }
}

// startSustainDecay is now provided by sustain-decay.js module

// Legacy function - now handled by midi-mapping module (kept for reference, can be removed)
function handleNoteOff_OLD(midiNote) {
    const noteName = midiNoteToNoteName(midiNote);
    if (noteName) {
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
        
        // Release sound only if sustain pedal is not active
        if (!sustainPedalActive) {
            // Cancel any sustain decay if it exists
            if (sustainDecayAutomations.has(midiNote)) {
                const automation = sustainDecayAutomations.get(midiNote);
                if (automation && automation.cancel) {
                    automation.cancel();
                }
                sustainDecayAutomations.delete(midiNote);
            }
            
            // Release all voices for this note (including unison voices if any)
            const voicesToRelease = unisonVoices.get(midiNote);
            if (voicesToRelease && voicesToRelease.length > 0) {
                // Release all tracked voices (including duplicates - each triggerAttack needs a triggerRelease)
                // Important: Even if multiple strings round to the same note name, we must release each one
                voicesToRelease.forEach(voiceNoteName => {
                    try {
                        synth.triggerRelease(voiceNoteName);
                    } catch (e) {
                        // If note doesn't exist (voice was stolen), that's okay
                        console.warn('Note release failed (may have been voice-stolen):', voiceNoteName);
                    }
                });
                // Clean up tracking
                unisonVoices.delete(midiNote);
            } else {
                // Fallback: release main note name if no tracking found
                try {
                    synth.triggerRelease(noteName);
                } catch (e) {
                    console.warn('Note release failed (may have been voice-stolen):', noteName);
                }
            }
            
            activeNotes.delete(midiNote);
            sustainedNotes.delete(midiNote); // Clean up if it was there
            noteAttackTimes.delete(midiNote); // Clean up attack time tracking
            
            // Mark frequency modulation as released
            if (frequencyModulations.has(midiNote)) {
                const modData = frequencyModulations.get(midiNote);
                if (modData.modulation && modData.modulation.release) {
                    modData.modulation.release();
                    modData.releaseTime = synth.synth.audioCtx.currentTime;
                }
            }
        } else {
            // Sustain is active: mark this note as sustained (not physically held)
            sustainedNotes.add(midiNote);
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
                    modData.releaseTime = synth.synth.audioCtx.currentTime;
                }
            }
            // Keep the note in activeNotes (don't release it immediately)
        }
        
        // Visual feedback - always release key visually
        releaseKey(midiNote);
    }
}

// Safety function to release all stuck notes (can be called manually if needed)
function releaseAllNotes() {
    // Cancel all sustain decay automations
    sustainDecayAutomations.forEach((automation, midiNote) => {
        if (automation && automation.cancel) {
            automation.cancel();
        }
    });
    sustainDecayAutomations.clear();
    
    // Stop all attack noise nodes
    attackNoiseNodes.forEach((noiseNode, midiNote) => {
        if (noiseNode && noiseNode.stop) {
            noiseNode.stop();
        }
    });
    attackNoiseNodes.clear();
    
    // Stop all release transient nodes
    releaseTransientNodes.forEach((transientNode, midiNote) => {
        if (transientNode && transientNode.stop) {
            transientNode.stop();
        }
    });
    releaseTransientNodes.clear();
    
    activeNotes.forEach((noteName, midiNote) => {
        try {
            synth.triggerRelease(noteName);
        } catch (e) {
            // Ignore errors
        }
    });
    activeNotes.clear();
    physicallyHeldNotes.clear();
    sustainedNotes.clear();
    noteAttackTimes.clear(); // Clean up filter tracking
    frequencyModulations.clear(); // Clean up frequency modulation tracking
    unisonVoices.clear(); // Clean up unison voice tracking
    
    // CRITICAL: Release all visual keys to ensure visual state matches audio state
    keyMap.forEach((keyData, midiNote) => {
        if (keyData.isPressed) {
            releaseKey(midiNote);
        }
    });
    
    console.log('All notes released');
}

// MIDI Input Module Integration
// Handle sustain pedal control change
function handleControlChange(controller, value) {
    // Sustain pedal is controller 64
    if (controller === 64) {
        const wasActive = sustainPedalActive;
        const isNowActive = value >= 64; // >= 64 means pedal down
        sustainPedalActive = isNowActive;
        
        // Update synth's sustain pedal state for harmonic evolution
        if (synth && synth.synth && typeof synth.synth.setSustainPedal === 'function') {
            synth.synth.setSustainPedal(isNowActive);
        }
        
        // Handle spectral balance gain reduction on sustain pedal change
        if (window.handleSustainPedalChangeSpectralBalance) {
            window.handleSustainPedalChangeSpectralBalance(isNowActive);
        }
        
        // Handle envelope sustain boost on sustain pedal change
        if (window.handleSustainPedalChangeEnvelope) {
            window.handleSustainPedalChangeEnvelope(isNowActive);
        }
        
        // Handle realistic sustain system on sustain pedal change
        if (window.sustainPedalChangeRealisticSustain) {
            window.sustainPedalChangeRealisticSustain(isNowActive);
        }
        
        // If sustain pedal is released, release only the sustained notes
        if (wasActive && !sustainPedalActive) {
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
                activeNotes.delete(midiNote);
                sustainedNotes.delete(midiNote);
                noteAttackTimes.delete(midiNote); // Clean up attack time tracking
                frequencyModulations.delete(midiNote); // Clean up frequency modulation
            });
        }
    }
}

// Initialize MIDI input module when page loads
// Note: Tone.js requires user interaction to start audio context
function initializeMidiInput() {
    if (window.initMidiInput) {
        window.initMidiInput(handleNoteOn, handleNoteOff, handleControlChange);
    } else {
        console.warn('MIDI input module not loaded');
    }
}

// Initialize keypress input module
function initializeKeypressInput() {
    if (window.initKeypressInput) {
        window.initKeypressInput(handleNoteOn, handleNoteOff);
    } else {
        console.warn('Keypress input module not loaded');
    }
}

document.addEventListener('click', () => {
    if (!synth) {
        initializeSynth();
        initializeMidiMapping();
    }
    var ctx = synth && synth.synth && synth.synth.audioCtx;
    function afterAudioReady() {
        initializeMidiInput();
        initializeKeypressInput();
        if (window.populateGslPresetDropdown) {
            window.populateGslPresetDropdown();
        }
        if (window.cameraIdleOrbit) window.cameraIdleOrbit.active = false;
        if (window.applyCameraView) {
            window.currentCameraViewIndex = 5;
            window.applyCameraView(5);
        }
    }
    if (ctx && ctx.state !== 'running') {
        ctx.resume().then(afterAudioReady).catch(afterAudioReady);
    } else {
        afterAudioReady();
    }
}, { once: true });

// Spacebar: cycle to next camera view (when enabled in Display > Camera)
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.key === ' ') {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) return;
        const allow = (window.cameraSettings && window.cameraSettings.spacebarCyclesViews);
        if (!allow) return;
        event.preventDefault();
        if (window.cycleToNextCameraView) window.cycleToNextCameraView();
    }
});

// Also try to initialize MIDI and keypress input immediately (may require user interaction for audio)
// Note: Synth will be initialized on first user click
console.log('Click anywhere to enable MIDI and audio');

// Keyboard shortcut to release all stuck notes (press 'R' key); R also toggles orbit when enabled in Display > Camera
window.addEventListener('keydown', (event) => {
    if (event.key === 'r' || event.key === 'R') {
        if (event.shiftKey) {
            releaseAllNotes();
            console.log('Released all notes (Shift+R)');
        } else {
            const rOrbitsEnabled = (window.cameraSettings && window.cameraSettings.rOrbitsCamera);
            if (rOrbitsEnabled && window.cameraIdleOrbit && window.camera && window.controls) {
                const o = window.cameraIdleOrbit;
                o.active = !o.active;
                if (o.active) {
                    var t = window.controls.target;
                    var p = window.camera.position;
                    o.targetX = t.x;
                    o.targetY = t.y;
                    o.targetZ = t.z;
                    var dx = p.x - t.x, dz = p.z - t.z;
                    o.radius = Math.sqrt(dx * dx + dz * dz) || 2.4;
                    o.height = p.y;
                    o.angle = Math.atan2(dx, dz);
                    o.lastAutoViewCheck = performance.now();
                }
                console.log('Camera rotate at piano: ' + (o.active ? 'ON' : 'OFF'));
            }
        }
        return;
    }
    // Press 'C' (no modifiers) to capture current camera (position + target) for pasting into a view. Ctrl+C = normal copy.
    if ((event.key === 'c' || event.key === 'C') && !event.ctrlKey && !event.altKey && !event.metaKey) {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable)) return;
        if (!window.camera || !window.controls) return;
        const p = window.camera.position;
        const t = window.controls.target;
        const fmt = (v) => Math.round(v * 1000) / 1000;
        const snippet = `position: { x: ${fmt(p.x)}, y: ${fmt(p.y)}, z: ${fmt(p.z)} },\ntarget: { x: ${fmt(t.x)}, y: ${fmt(t.y)}, z: ${fmt(t.z)} }`;
        console.log('Camera (paste into a view):\n' + snippet);
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(snippet).then(() => console.log('(copied to clipboard)')).catch(() => {});
        }
    }
});

/**
 * Log differences between current settings and default settings
 * Only lists modules that are different from defaults (on/off differences or changed values)
 * Also displays results in the settings diff panel on the left side
 */
function logSettingsDifferences() {
    console.log('=== Settings Differences from Defaults ===');
    
    const differences = [];
    
    // Compare physics settings (module on/off states)
    if (window.physicsSettings && window.defaultPhysicsSettings) {
        const physicsDiffs = [];
        for (const key in window.defaultPhysicsSettings) {
            if (window.physicsSettings[key] !== window.defaultPhysicsSettings[key]) {
                physicsDiffs.push({
                    module: key,
                    default: window.defaultPhysicsSettings[key],
                    current: window.physicsSettings[key]
                });
            }
        }
        if (physicsDiffs.length > 0) {
            differences.push({
                category: 'Physics Settings (Module On/Off)',
                items: physicsDiffs.map(d => `${d.module}: ${d.default ? 'ON' : 'OFF'} → ${d.current ? 'ON' : 'OFF'}`)
            });
        }
    }
    
    // Compare envelope settings
    if (window.getEnvelopeSettings) {
        const current = window.getEnvelopeSettings();
        const defaults = {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.3,
            release: 0.5,
            sustainPedalSustainBoost: true,
            sustainBoostDuration: 8.0,
            sustainRestoreDuration: 0.2
        };
        const envelopeDiffs = [];
        for (const key in defaults) {
            if (current[key] !== defaults[key]) {
                envelopeDiffs.push(`${key}: ${defaults[key]} → ${current[key]}`);
            }
        }
        if (envelopeDiffs.length > 0) {
            differences.push({
                category: 'Envelope Settings',
                items: envelopeDiffs
            });
        }
    }
    
    // Compare frequency compensation settings
    if (window.frequencyCompensationSettings) {
        const current = window.frequencyCompensationSettings;
        const defaults = { targetSPL: 85 };
        const freqCompDiffs = [];
        for (const key in defaults) {
            if (current[key] !== defaults[key]) {
                freqCompDiffs.push(`${key}: ${defaults[key]} → ${current[key]}`);
            }
        }
        if (freqCompDiffs.length > 0) {
            differences.push({
                category: 'Frequency Compensation Settings',
                items: freqCompDiffs
            });
        }
    }
    
    // Compare velocity mapping settings
    if (window.velocityMappingSettings) {
        const current = window.velocityMappingSettings;
        const defaults = {
            velocityExponent: 2.0,
            targetSPL: 85
        };
        const velMapDiffs = [];
        for (const key in defaults) {
            if (current[key] !== defaults[key]) {
                velMapDiffs.push(`${key}: ${defaults[key]} → ${current[key]}`);
            }
        }
        if (velMapDiffs.length > 0) {
            differences.push({
                category: 'Velocity Mapping Settings',
                items: velMapDiffs
            });
        }
    }
    
    // Compare delay pseudo-reverb settings
    if (window.delayPseudoReverbSettings) {
        const current = window.delayPseudoReverbSettings;
        const defaults = {
            dryWet: 0.3,
            crossoverFreq: 300,
            delayLeft: 0.013,
            delayRight: 0.029,
            delayCenter: 0.003,
            feedbackLeft: 0.15,
            feedbackRight: 0.15,
            feedbackCenter: 0.1,
            modulationAmount: 0.001,
            modulationAmountRight: 0.002,
            feedbackHighpass: 500,
            feedbackLowpass: 8000,
            crossFeedback: true,
            crossFeedbackAmount: 0.2,
            cosmicMode: false,
            pingPongDelay: false,
            pingPongAmount: 0.3,
            longDelayLeft: 0.150,
            longDelayRight: 0.200,
            cosmicFeedback: 0.25
        };
        const delayDiffs = [];
        for (const key in defaults) {
            if (key === 'enabled') continue; // Skip enabled state (handled by physics settings)
            if (current[key] !== undefined && current[key] !== defaults[key]) {
                delayDiffs.push(`${key}: ${defaults[key]} → ${current[key]}`);
            }
        }
        if (delayDiffs.length > 0) {
            differences.push({
                category: 'Delay Pseudo-Reverb Settings',
                items: delayDiffs
            });
        }
    }
    
    // Compare piano envelope model settings
    if (window.pianoEnvelopeModelSettings) {
        const current = window.pianoEnvelopeModelSettings;
        // Get defaults from reset function if available, or use common defaults
        const defaults = {
            keyDownDecayTime: 0.5,
            pedalOnlyDecayTime: 0.3,
            keyOnlyDecayTime: 0.2,
            noKeyNoPedalDecayTime: 0.1,
            decayExponent: 2.0
        };
        const pianoEnvDiffs = [];
        for (const key in defaults) {
            if (current[key] !== undefined && current[key] !== defaults[key]) {
                pianoEnvDiffs.push(`${key}: ${defaults[key]} → ${current[key]}`);
            }
        }
        if (pianoEnvDiffs.length > 0) {
            differences.push({
                category: 'Piano Envelope Model Settings',
                items: pianoEnvDiffs
            });
        }
    }
    
    // Compare harmonic profile evolution settings
    if (window.harmonicProfileEvolutionSettings) {
        const current = window.harmonicProfileEvolutionSettings;
        const defaults = {
            decayMultiplier: 2.0,
            maxDecayMultiplier: 10.0,
            keyHeldDecayRate: 0.5,
            pedalOnlyDecayRate: 1.0
        };
        const harmonicDiffs = [];
        for (const key in defaults) {
            if (current[key] !== undefined && current[key] !== defaults[key]) {
                harmonicDiffs.push(`${key}: ${defaults[key]} → ${current[key]}`);
            }
        }
        if (harmonicDiffs.length > 0) {
            differences.push({
                category: 'Harmonic Profile Evolution Settings',
                items: harmonicDiffs
            });
        }
    }
    
    // Compare tremolo/chorus settings
    // Note: tremoloSettings is an alias for chorusSettings
    const tremoloSettings = window.tremoloSettings || window.chorusSettings;
    if (tremoloSettings) {
        const current = tremoloSettings;
        const defaults = {
            rate: 0.8,          // LFO rate in Hz
            depth: 0.003,       // Delay modulation depth in seconds
            delayTime: 0.015,   // Base delay time in seconds
            feedback: 0.2,      // Feedback amount
            wetLevel: 0.4,      // Wet signal level
            dryLevel: 0.6,      // Dry signal level
            pingPongRate: 0.5,  // Ping-pong panning rate (Hz)
            pingPongDepth: 0.7, // Ping-pong panning depth
            strength: 1.0       // Overall effect strength
        };
        const tremoloDiffs = [];
        for (const key in defaults) {
            if (key === 'enabled') continue; // Skip enabled state (handled by physics settings)
            if (current[key] !== undefined && current[key] !== defaults[key]) {
                tremoloDiffs.push(`${key}: ${defaults[key]} → ${current[key]}`);
            }
        }
        if (tremoloDiffs.length > 0) {
            differences.push({
                category: 'Tremolo/Chorus Settings',
                items: tremoloDiffs
            });
        }
    }
    
    // Log results to console
    if (differences.length === 0) {
        console.log('No differences found - all settings are at defaults.');
    } else {
        differences.forEach(diff => {
            console.log(`\n${diff.category}:`);
            diff.items.forEach(item => {
                console.log(`  - ${item}`);
            });
        });
    }
    
    console.log('\n=== End of Settings Differences ===');
    
    // Display results in the settings diff panel
    displaySettingsDifferences(differences);
}

/**
 * Display settings differences in the left-side panel
 */
function displaySettingsDifferences(differences) {
    const contentDiv = document.getElementById('settings-diff-content');
    if (!contentDiv) return;
    
    if (differences.length === 0) {
        contentDiv.innerHTML = '<div class="no-diffs">✓ All settings are at defaults</div>';
        return;
    }
    
    let html = '';
    differences.forEach(diff => {
        html += `<div class="diff-category">`;
        html += `<div class="diff-category-title">${diff.category}</div>`;
        diff.items.forEach(item => {
            html += `<div class="diff-item">${item}</div>`;
        });
        html += `</div>`;
    });
    
    contentDiv.innerHTML = html;
}

// Export function globally
if (typeof window !== 'undefined') {
    window.logSettingsDifferences = logSettingsDifferences;
}

/**
 * Default sound profile - all default settings for all modules
 * This is the baseline that all presets are based on
 */
const defaultSoundProfile = {
    physics: {
        // All physics modules ON by default (from defaultPhysicsSettings)
        // This will be set from window.defaultPhysicsSettings
    },
    frequencyCompensation: {
        targetSPL: 85
    },
    delayPseudoReverb: {
        enabled: true,
        dryWet: 0.3,
        crossoverFreq: 300,
        delayCenter: 0.003,
        cosmicMode: false,
        pingPongDelay: false,
        pingPongAmount: 0.3
    },
    tremolo: {
        enabled: true,
        rate: 0.8,
        depth: 0.003,
        delayTime: 0.015,
        feedback: 0.2,
        wetLevel: 0.4,
        dryLevel: 0.6,
        pingPongRate: 0.5,
        pingPongDepth: 0.7,
        strength: 1.0
    },
    velocityMapping: {
        velocityExponent: 2.0,
        targetSPL: 85
    }
};

/**
 * Preset configurations
 * These presets reset to defaults first, then apply specific changes
 */
const soundPresets = {
    primal: {
        // Default settings - no changes needed
        physics: {},
        frequencyCompensation: {},
        delayPseudoReverb: {},
        tremolo: {},
        velocityMapping: {}
    },
    cosmos: {
        physics: {},
        frequencyCompensation: {
            targetSPL: 51
        },
        delayPseudoReverb: {
            dryWet: 1,
            cosmicMode: true,
            pingPongDelay: true,
            pingPongAmount: 0.5
        },
        tremolo: {
            wetLevel: 0.82,
            strength: 0.5
        },
        velocityMapping: {}
    },
    livid: {
        physics: {
            tremolo: false
        },
        frequencyCompensation: {
            targetSPL: 51
        },
        delayPseudoReverb: {
            dryWet: 0.96,
            crossoverFreq: 100,
            delayCenter: 0.01,
            cosmicMode: true,
            pingPongDelay: true,
            pingPongAmount: 0
        },
        tremolo: {
            wetLevel: 0.82,
            strength: 0.5
        },
        velocityMapping: {}
    },
    bluish: {
        physics: {
            frequencyCompensation: false,
            delayPseudoReverb: false,
            tremolo: false
        },
        frequencyCompensation: {
            targetSPL: 40
        },
        delayPseudoReverb: {},
        tremolo: {},
        velocityMapping: {
            velocityExponent: 1.5,
            targetSPL: 41
        }
    }
};

/**
 * Reset all settings to defaults using the default sound profile
 */
function resetAllSettingsToDefaults() {
    console.log('Resetting all settings to defaults...');
    
    // Reset physics settings to defaults
    if (window.defaultPhysicsSettings && window.physicsSettings) {
        Object.keys(window.defaultPhysicsSettings).forEach(key => {
            window.physicsSettings[key] = window.defaultPhysicsSettings[key];
        });
    }
    
    // Reset envelope settings
    if (window.resetEnvelopeSettingsToDefaults) {
        window.resetEnvelopeSettingsToDefaults();
    }
    
    // Reset frequency compensation settings to default profile
    if (window.frequencyCompensationSettings) {
        window.frequencyCompensationSettings.targetSPL = defaultSoundProfile.frequencyCompensation.targetSPL;
        if (window.setFrequencyCompensationSettings) {
            window.setFrequencyCompensationSettings(window.frequencyCompensationSettings);
        }
    }
    
    // Reset velocity mapping settings to default profile
    if (window.velocityMappingSettings) {
        window.velocityMappingSettings.velocityExponent = defaultSoundProfile.velocityMapping.velocityExponent;
        window.velocityMappingSettings.targetSPL = defaultSoundProfile.velocityMapping.targetSPL;
        if (window.setVelocityMappingSettings) {
            window.setVelocityMappingSettings(window.velocityMappingSettings);
        }
    }
    
    // Reset delay pseudo-reverb settings to default profile
    if (window.delayPseudoReverbSettings) {
        const defaults = defaultSoundProfile.delayPseudoReverb;
        window.delayPseudoReverbSettings.enabled = defaults.enabled;
        window.delayPseudoReverbSettings.dryWet = defaults.dryWet;
        window.delayPseudoReverbSettings.crossoverFreq = defaults.crossoverFreq;
        window.delayPseudoReverbSettings.delayCenter = defaults.delayCenter;
        window.delayPseudoReverbSettings.cosmicMode = defaults.cosmicMode;
        window.delayPseudoReverbSettings.pingPongDelay = defaults.pingPongDelay;
        window.delayPseudoReverbSettings.pingPongAmount = defaults.pingPongAmount;
        if (window.setDelayPseudoReverbSettings) {
            window.setDelayPseudoReverbSettings(window.delayPseudoReverbSettings);
        }
    }
    
    // Reset tremolo/chorus settings to default profile
    const tremoloSettings = window.tremoloSettings || window.chorusSettings;
    if (tremoloSettings) {
        const defaults = defaultSoundProfile.tremolo;
        tremoloSettings.enabled = defaults.enabled;
        tremoloSettings.rate = defaults.rate;
        tremoloSettings.depth = defaults.depth;
        tremoloSettings.delayTime = defaults.delayTime;
        tremoloSettings.feedback = defaults.feedback;
        tremoloSettings.wetLevel = defaults.wetLevel;
        tremoloSettings.dryLevel = defaults.dryLevel;
        tremoloSettings.pingPongRate = defaults.pingPongRate;
        tremoloSettings.pingPongDepth = defaults.pingPongDepth;
        tremoloSettings.strength = defaults.strength;
        // Rebuild chorus chain
        if (window.setupChorusChain) {
            window.setupChorusChain();
        }
    }
    
    // Sync physics settings checkboxes for modules that can be enabled/disabled
    // These are controlled by physicsSettings but also have their own enabled state
    if (window.physicsSettings) {
        // Ensure tremolo is enabled in physics settings (default: true)
        if (window.physicsSettings.tremolo === undefined || window.physicsSettings.tremolo === true) {
            window.physicsSettings.tremolo = true;
        }
        // Ensure delayPseudoReverb is enabled in physics settings (default: true)
        if (window.physicsSettings.delayPseudoReverb === undefined || window.physicsSettings.delayPseudoReverb === true) {
            window.physicsSettings.delayPseudoReverb = true;
        }
        // Ensure frequencyCompensation is enabled in physics settings (default: true)
        if (window.physicsSettings.frequencyCompensation === undefined || window.physicsSettings.frequencyCompensation === true) {
            window.physicsSettings.frequencyCompensation = true;
        }
    }
    
    console.log('Reset to defaults complete');
}

/**
 * Populate preset dropdown from GSL manifest (preset names only; "Loading…" = this manifest fetch).
 * Does NOT load every preset's samples—only the chosen preset is preloaded after user starts audio.
 */
function populateGslPresetDropdown() {
    const handler = window.InstrumentSampleHandler;
    if (!handler || typeof handler.ensureGslManifest !== 'function') return Promise.resolve();
    return handler.ensureGslManifest().then(function (list) {
        const sel = document.getElementById('preset-select');
        if (!list || !list.length) return;
        if (sel) {
            sel.innerHTML = '';
            list.forEach(function (entry) {
                const opt = document.createElement('option');
                opt.value = entry.slug;
                const displayName = (entry.label && typeof entry.label === 'string')
                    ? entry.label
                    : (entry.id && typeof entry.id === 'string')
                        ? entry.id.replace(/^\d+_\d+_\s*/, '')
                        : entry.id;
                opt.textContent = displayName || entry.slug;
                sel.appendChild(opt);
            });
        }
        const defaultSlug = list.some(function (e) { return e.slug === 'gsl_piano'; }) ? 'gsl_piano' : list[0].slug;
        window.currentGslPreset = defaultSlug;
        if (sel) sel.value = defaultSlug;
        startBackgroundPreloadCurrentPreset();
        if (window.applySoundPreset) window.applySoundPreset(defaultSlug);
        var gridContainer = document.getElementById('instrument-grid-container');
        if (gridContainer) {
            gridContainer.querySelectorAll('.instrument-item.selected').forEach(function (el) { el.classList.remove('selected'); });
            gridContainer.querySelectorAll('.instrument-item[data-slug="' + defaultSlug + '"]').forEach(function (el) { el.classList.add('selected'); });
        }
    }).catch(function () {});
}

/**
 * Preload the currently chosen preset's note samples in the background (non-blocking).
 * Call after user has started the audio context (e.g. first click). Good strategy: fewer missed notes.
 */
function startBackgroundPreloadCurrentPreset() {
    const preset = window.currentGslPreset;
    if (!preset) return;
    const handler = window.InstrumentSampleHandler;
    const ctx = window.synth && window.synth.synth && window.synth.synth.audioCtx;
    if (!handler || !ctx) return;
    const baseUrl = (document.baseURI || window.location.href || '').replace(/\/[^/]*$/, '/');
    handler.ensurePresetLoaded(ctx, preset, baseUrl).catch(function (e) { console.warn('Preset preload:', e); });
}

/**
 * Apply a sound preset (GSL only).
 */
function applySoundPreset(presetName) {
    if (!presetName) return;
    const handler = window.InstrumentSampleHandler;
    const isGsl = handler && handler.isGslPreset && handler.isGslPreset(presetName);
    if (isGsl) {
        window.currentGslPreset = presetName;
        startBackgroundPreloadCurrentPreset();
        const presetSelect = document.getElementById('preset-select');
        if (presetSelect) presetSelect.value = presetName;
    }
}

/**
 * Update UI checkboxes after preset is applied
 */
function updateUIAfterPreset() {
    if (!window.physicsSettings) return;
    
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
    const enableInharmonicity = document.getElementById('enable-inharmonicity');
    const enableAttackNoise = document.getElementById('enable-attack-noise');
    const enableOddEvenHarmonicBalance = document.getElementById('enable-odd-even-harmonic-balance');
    const enablePitchHarmonicRolloff = document.getElementById('enable-pitch-harmonic-rolloff');
    const enablePerPartialDecay = document.getElementById('enable-per-partial-decay');
    const enableReleaseTransient = document.getElementById('enable-release-transient');
    const enableVelocitySensitiveDelay = document.getElementById('enable-velocity-sensitive-delay');
    const enableSympatheticResonanceDelay = document.getElementById('enable-sympathetic-resonance-delay');
    const enableSpectralResonanceDelay = document.getElementById('enable-spectral-resonance-delay');
    const enableDelayPseudoReverb = document.getElementById('enable-delay-pseudo-reverb');
    const enableTremolo = document.getElementById('enable-tremolo');
    const enablePianoEnvelopeModel = document.getElementById('enable-piano-envelope-model');
    const enableHarmonicProfileEvolution = document.getElementById('enable-harmonic-profile-evolution');
    const enableRealisticSustain = document.getElementById('enable-realistic-sustain');
    
    if (enableVelocityTimbre) enableVelocityTimbre.checked = window.physicsSettings.velocityTimbre;
    if (enableTwoStageDecay) enableTwoStageDecay.checked = window.physicsSettings.twoStageDecay;
    if (enablePedalCoupling) enablePedalCoupling.checked = window.physicsSettings.pedalCoupling;
    if (enableSustainDecay) enableSustainDecay.checked = window.physicsSettings.sustainDecay;
    if (enableAdvancedTimbre) enableAdvancedTimbre.checked = window.physicsSettings.advancedTimbre;
    if (enableVelocityAttack) enableVelocityAttack.checked = window.physicsSettings.velocityAttack;
    if (enableTimeVaryingBrightness) enableTimeVaryingBrightness.checked = window.physicsSettings.timeVaryingBrightness;
    if (enableDynamicFilter) enableDynamicFilter.checked = window.physicsSettings.dynamicFilter;
    if (enableFrequencyCompensation) enableFrequencyCompensation.checked = window.physicsSettings.frequencyCompensation;
    if (enableFrequencyEnvelope) enableFrequencyEnvelope.checked = window.physicsSettings.frequencyEnvelope;
    if (enableBinauralReverb) enableBinauralReverb.checked = window.physicsSettings.binauralReverb;
    if (enableFakeBinaural) enableFakeBinaural.checked = window.physicsSettings.fakeBinaural;
    if (enableSpectralBalance) enableSpectralBalance.checked = window.physicsSettings.spectralBalance;
    if (enableInharmonicity) enableInharmonicity.checked = window.physicsSettings.inharmonicity;
    if (enableAttackNoise) enableAttackNoise.checked = window.physicsSettings.attackNoise;
    if (enableOddEvenHarmonicBalance) enableOddEvenHarmonicBalance.checked = window.physicsSettings.oddEvenHarmonicBalance;
    if (enablePitchHarmonicRolloff) enablePitchHarmonicRolloff.checked = window.physicsSettings.pitchHarmonicRolloff;
    if (enablePerPartialDecay) enablePerPartialDecay.checked = window.physicsSettings.perPartialDecay;
    if (enableReleaseTransient) enableReleaseTransient.checked = window.physicsSettings.releaseTransient;
    if (enableVelocitySensitiveDelay) enableVelocitySensitiveDelay.checked = window.physicsSettings.velocitySensitiveDelay;
    if (enableSympatheticResonanceDelay) enableSympatheticResonanceDelay.checked = window.physicsSettings.sympatheticResonanceDelay;
    if (enableSpectralResonanceDelay) enableSpectralResonanceDelay.checked = window.physicsSettings.spectralResonanceDelay;
    if (enableDelayPseudoReverb) enableDelayPseudoReverb.checked = window.physicsSettings.delayPseudoReverb;
    if (enableTremolo) enableTremolo.checked = window.physicsSettings.tremolo;
    if (enablePianoEnvelopeModel) enablePianoEnvelopeModel.checked = window.physicsSettings.pianoEnvelopeModel;
    if (enableHarmonicProfileEvolution) enableHarmonicProfileEvolution.checked = window.physicsSettings.harmonicProfileEvolution;
    if (enableRealisticSustain) enableRealisticSustain.checked = window.physicsSettings.realisticSustain;
}

// Apply piano brightness (scene lights only; slider + open-settings sync)
function applyPianoBrightness() {
    const scale = (typeof window.pianoBrightness === 'number') ? window.pianoBrightness : 1;
    ambientLight.intensity = ambientLightTarget * scale;
    directionalLight.intensity = directionalLightTarget * scale;
    fillLight.intensity = fillLightTarget * scale;
    rimLight.intensity = rimLightTarget * scale;
}

// Export functions globally - at end of file after all functions are defined
if (typeof window !== 'undefined') {
    window.applyPianoBrightness = applyPianoBrightness;
    window.applySoundPreset = applySoundPreset;
    window.populateGslPresetDropdown = populateGslPresetDropdown;
    window.soundPresets = soundPresets;
    window.defaultSoundProfile = defaultSoundProfile;
    window.resetAllSettingsToDefaults = resetAllSettingsToDefaults;
    window.updateUIAfterPreset = updateUIAfterPreset;
    // Export camera and controls for debugging
    window.camera = camera;
    window.controls = controls;
    console.log('✓ Preset functions exported to window');
}
