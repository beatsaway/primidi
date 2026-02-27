/**
 * Key Movement Module
 * Handles key up/down movement effects with animation options
 */

(function() {
    'use strict';
    
    // Settings
    window.keyMovementSettings = {
        enabled: true, // Default: ON
        animationStyle: 'animated', // 'none', 'instant', 'animated' - Default: 'animated' for smooth movement
        pressDepth: 0.7, // 70% of key height
        animationDuration: 0.1, // seconds for animated style
        maxPressDepth: 0.9 // Maximum depth as percentage of key height (safety limit)
    };
    
    // Animation state tracking
    const keyAnimations = new Map(); // midiNote -> { startTime, startY, targetY, easing, duration }
    
    /**
     * Initialize the key movement module
     */
    window.initKeyMovement = function() {
        // Module initialized
    };
    
    /**
     * Easing function for smooth animation (ease-out)
     * @param {number} t - Time (0 to 1)
     * @returns {number} - Eased value
     */
    function easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    /**
     * Update key animations (call this in animation loop)
     * @param {number} currentTime - Current time in seconds
     */
    window.updateKeyAnimations = function(currentTime) {
        if (window.keyMovementSettings.animationStyle !== 'animated') {
            return;
        }
        
        keyAnimations.forEach((anim, midiNote) => {
            const elapsed = currentTime - anim.startTime;
            const duration = anim.duration || window.keyMovementSettings.animationDuration;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOut(progress);
            
            let currentY = anim.startY + (anim.targetY - anim.startY) * eased;
            
            // Safety clamp: prevent key from going below minimum safe position
            if (anim.keyData.originalY !== undefined) {
                const keyHeight = anim.keyData.isBlack ? 0.07 : 0.1; // Approximate key heights
                const maxDepth = keyHeight * (window.keyMovementSettings.maxPressDepth || 0.9);
                const minY = anim.keyData.originalY - maxDepth;
                currentY = Math.max(currentY, minY);
            }
            
            anim.keyData.mesh.position.y = currentY;
            
            if (progress >= 1) {
                // Animation complete
                keyAnimations.delete(midiNote);
            }
        });
    };
    
    /**
     * Calculate animation duration based on MIDI velocity
     * @param {number} velocity - MIDI velocity (0-127), or null/undefined for default
     * @returns {number} - Duration in seconds
     */
    function getAnimationDurationForVelocity(velocity) {
        if (velocity === null || velocity === undefined) {
            // Default duration when no velocity (keyboard input, etc.)
            return 0.1; // 100ms
        }
        
        // Map velocity (0-127) to duration (600ms - 100ms)
        // Higher velocity = shorter duration (faster animation)
        // Lower velocity = longer duration (slower animation)
        // Linear mapping: velocity 127 -> 0.1s (100ms), velocity 0 -> 0.6s (600ms)
        const minDuration = 0.1; // 100ms for highest velocity
        const maxDuration = 0.6; // 600ms for lowest velocity
        const normalizedVelocity = velocity / 127; // 0 to 1
        const duration = maxDuration - (normalizedVelocity * (maxDuration - minDuration));
        return duration;
    }
    
    /**
     * Move key down (press effect)
     * @param {Object} keyData - Key data from keyMap
     * @param {number} keyHeight - Height of the key
     * @param {number} velocity - Optional MIDI velocity (0-127) for velocity-based animation duration
     */
    window.pressKeyMovement = function(keyData, keyHeight, velocity) {
        if (!window.keyMovementSettings.enabled || !keyData) return;
        
        // Ensure we have originalY (store it if not set)
        if (keyData.originalY === undefined) {
            keyData.originalY = keyData.mesh.position.y;
        }
        
        // Get midiNote from keyData
        const midiNote = keyData.midiNote;
        if (midiNote === undefined || midiNote === null) return;
        
        // Calculate target depth with safety limit
        const maxDepth = keyHeight * (window.keyMovementSettings.maxPressDepth || 0.9);
        const pressDepth = Math.min(
            keyHeight * window.keyMovementSettings.pressDepth,
            maxDepth
        );
        
        // Calculate target Y position
        const targetY = keyData.originalY - pressDepth;
        
        // Safety check: prevent key from going too far down (below originalY - maxDepth)
        const minY = keyData.originalY - maxDepth;
        const safeTargetY = Math.max(targetY, minY);
        
        // If key is already pressed/animated, cancel animation and use current position as start
        // This prevents cumulative movement on rapid presses
        const currentY = keyData.mesh.position.y;
        const startY = (keyAnimations.has(midiNote) || keyData.isPressed) ? currentY : keyData.originalY;
        
        // Cancel any existing animation
        keyAnimations.delete(midiNote);
        
        switch (window.keyMovementSettings.animationStyle) {
            case 'none':
                // No movement
                break;
            case 'instant':
                // Instant position change with safety clamp
                // safeTargetY is already clamped to prevent going below minY (originalY - maxDepth)
                // Additional check: ensure we never exceed the safety limit
                const instantFinalY = Math.max(safeTargetY, minY);
                keyData.mesh.position.y = instantFinalY;
                break;
            case 'animated':
                // Animated movement with velocity-based duration
                const startTime = performance.now() / 1000; // Convert to seconds
                const animationDuration = getAnimationDurationForVelocity(velocity);
                keyAnimations.set(midiNote, {
                    startTime: startTime,
                    startY: startY,
                    targetY: safeTargetY,
                    keyData: keyData,
                    duration: animationDuration
                });
                break;
            default:
                // Fallback to instant
                keyData.mesh.position.y = safeTargetY;
                break;
        }
    };
    
    /**
     * Move key up (release effect)
     * @param {Object} keyData - Key data from keyMap
     * @param {number} keyHeight - Height of the key
     */
    window.releaseKeyMovement = function(keyData, keyHeight) {
        if (!keyData) return;
        
        // Get midiNote from keyData
        const midiNote = keyData.midiNote;
        if (midiNote !== undefined && midiNote !== null) {
            // Cancel any existing animation
            keyAnimations.delete(midiNote);
        }
        
        if (keyData.originalY === undefined) {
            // Fallback: calculate original position
            if (keyData.isBlack) {
                keyData.originalY = keyHeight + (keyHeight * 0.7) / 2; // Approximate
            } else {
                keyData.originalY = keyHeight / 2;
            }
        }
        
        // Use originalY as target, but ensure it's not below current position if something went wrong
        const targetY = keyData.originalY;
        
        // Safety check: if key is somehow stuck too low, force it back to original
        const currentY = keyData.mesh.position.y;
        const maxDepth = keyHeight * (window.keyMovementSettings.maxPressDepth || 0.9);
        const minSafeY = keyData.originalY - maxDepth;
        
        // If current position is below safe minimum, force reset to original
        const safeTargetY = (currentY < minSafeY) ? keyData.originalY : targetY;
        
        switch (window.keyMovementSettings.animationStyle) {
            case 'none':
                // No movement
                break;
            case 'instant':
                // Instant position change - always restore to originalY (safety reset)
                keyData.mesh.position.y = safeTargetY;
                break;
            case 'animated':
                // Animated movement
                if (midiNote !== undefined && midiNote !== null) {
                    const startTime = performance.now() / 1000; // Convert to seconds
                    keyAnimations.set(midiNote, {
                        startTime: startTime,
                        startY: keyData.mesh.position.y,
                        targetY: safeTargetY,
                        keyData: keyData
                    });
                } else {
                    // Fallback to instant if no midiNote
                    keyData.mesh.position.y = safeTargetY;
                }
                break;
        }
    };
    
    console.log('Key Movement module loaded');
})();

