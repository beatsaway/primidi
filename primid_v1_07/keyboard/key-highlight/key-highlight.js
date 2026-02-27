/**
 * Key Highlight Module
 * Handles white highlighting when keys are pressed
 */

(function() {
    'use strict';
    
    // Settings
    window.keyHighlightSettings = {
        enabled: true, // Default: ON - White highlight when keys are pressed
        whiteKeyColor: 0xffffff, // White
        blackKeyColor: 0xffffff, // White
        emissiveIntensity: 0.5 // Increased emissive for more visible glow
    };
    
    // Create pressed materials
    let whiteKeyPressedMaterial = null;
    let blackKeyPressedMaterial = null;
    
    /**
     * Initialize the key highlight module
     * @param {THREE.MeshPhysicalMaterial} whiteKeyMaterial - Base white key material
     * @param {THREE.MeshPhysicalMaterial} blackKeyMaterial - Base black key material
     */
    window.initKeyHighlight = function(whiteKeyMaterial, blackKeyMaterial) {
        // Check if THREE is available (from window.THREE set by main.js)
        const THREE_ref = (typeof window !== 'undefined' && window.THREE) ? window.THREE : 
                         (typeof THREE !== 'undefined') ? THREE : null;
        
        if (!THREE_ref || !THREE_ref.MeshPhysicalMaterial) {
            console.error('THREE.js not available for key highlight initialization', {
                'window.THREE': typeof window !== 'undefined' ? typeof window.THREE : 'window undefined',
                'THREE': typeof THREE !== 'undefined' ? typeof THREE : 'undefined',
                'MeshPhysicalMaterial': THREE_ref ? !!THREE_ref.MeshPhysicalMaterial : false
            });
            return false;
        }
        
        if (!whiteKeyMaterial || !blackKeyMaterial) {
            console.error('Base materials not provided to initKeyHighlight', {
                whiteKeyMaterial: !!whiteKeyMaterial,
                blackKeyMaterial: !!blackKeyMaterial
            });
            return false;
        }
        
        // Ensure settings are loaded
        if (!window.keyHighlightSettings) {
            console.error('keyHighlightSettings not available');
            return false;
        }
        
        try {
            const whiteColor = window.keyHighlightSettings.whiteKeyColor || 0xffff00;
            const blackColor = window.keyHighlightSettings.blackKeyColor || 0xaaaa00;
            const emissiveIntensity = window.keyHighlightSettings.emissiveIntensity || 0.5;
            
            whiteKeyPressedMaterial = new THREE_ref.MeshPhysicalMaterial({
                color: whiteColor,
                metalness: 0.0,
                roughness: 0.3,
                clearcoat: 0.5,
                clearcoatRoughness: 0.2,
                reflectivity: 0.5,
                emissive: whiteColor, // Use same color for emissive
                emissiveIntensity: emissiveIntensity
            });
            
            blackKeyPressedMaterial = new THREE_ref.MeshPhysicalMaterial({
                color: blackColor,
                metalness: 0.0,
                roughness: 0.4,
                clearcoat: 0.3,
                clearcoatRoughness: 0.3,
                reflectivity: 0.3,
                emissive: blackColor, // Use same color for emissive
                emissiveIntensity: emissiveIntensity
            });
            
            // Verify materials were created
            if (!whiteKeyPressedMaterial || !blackKeyPressedMaterial) {
                console.error('Failed to create materials - they are null');
                return false;
            }
            
            console.log('✓ Key highlight materials created successfully:', {
                whiteColor: whiteColor.toString(16),
                blackColor: blackColor.toString(16),
                whiteMaterialExists: !!whiteKeyPressedMaterial,
                blackMaterialExists: !!blackKeyPressedMaterial
            });
            
            return true;
        } catch (error) {
            console.error('Error creating key highlight materials:', error);
            whiteKeyPressedMaterial = null;
            blackKeyPressedMaterial = null;
            return false;
        }
    };
    
    /**
     * Get pressed material for a key
     * @param {boolean} isBlack - Whether the key is black
     * @returns {THREE.MeshPhysicalMaterial} - Pressed material (cloned) or null if not initialized
     */
    window.getKeyPressedMaterial = function(isBlack) {
        // If not initialized yet, try to initialize if THREE.js is available
        if (!whiteKeyPressedMaterial || !blackKeyPressedMaterial) {
            if (typeof THREE !== 'undefined' && window.initKeyHighlight) {
                // Try to initialize if we have the materials available
                // Note: This requires whiteKeyMaterial and blackKeyMaterial to be passed
                // For now, just return null and let the caller handle it
                return null;
            }
            return null;
        }
        return (isBlack ? blackKeyPressedMaterial : whiteKeyPressedMaterial).clone();
    };
    
    /**
     * Check if key highlight is initialized
     * @returns {boolean} Whether the module is initialized
     */
    window.isKeyHighlightInitialized = function() {
        return whiteKeyPressedMaterial !== null && blackKeyPressedMaterial !== null;
    };
    
    /**
     * Apply highlight to a key (change material to pressed material)
     * @param {Object} keyData - Key data from keyMap
     */
    window.applyKeyHighlight = function(keyData) {
        if (!window.keyHighlightSettings.enabled || !keyData || !keyData.mesh) return;
        
        // If pressedMaterial doesn't exist, try to get it now
        if (!keyData.pressedMaterial) {
            if (window.getKeyPressedMaterial) {
                keyData.pressedMaterial = window.getKeyPressedMaterial(keyData.isBlack);
            }
        }
        
        // If still no pressedMaterial, materials might not be initialized yet
        // Try to get it one more time (in case initialization completed)
        if (!keyData.pressedMaterial && window.getKeyPressedMaterial) {
            keyData.pressedMaterial = window.getKeyPressedMaterial(keyData.isBlack);
        }
        
        // Apply the pressed material if available
        if (keyData.pressedMaterial) {
            // Force material update by setting it directly
            keyData.mesh.material = keyData.pressedMaterial;
            keyData.mesh.material.needsUpdate = true;
            
            // Change label color to black for better visibility on highlight
            if (window.setLabelColorBlack && keyData.midiNote !== undefined) {
                window.setLabelColorBlack(keyData.midiNote);
            }
        } else {
            console.warn('✗ No pressedMaterial available - highlight not applied');
        }
    };
    
    /**
     * Remove highlight from a key (restore original material)
     * @param {Object} keyData - Key data from keyMap
     */
    window.removeKeyHighlight = function(keyData) {
        if (!keyData) return;
        
        if (keyData.originalMaterial) {
            keyData.mesh.material = keyData.originalMaterial;
        }
        
        // Restore label color to original (white/grey) when highlight is removed
        if (window.restoreLabelColor && keyData.midiNote !== undefined) {
            window.restoreLabelColor(keyData.midiNote);
        }
    };
    
    // Key Highlight module loaded
})();

