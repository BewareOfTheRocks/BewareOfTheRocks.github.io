import * as THREE from 'three';

export class CameraController {
    constructor(camera, target = new THREE.Vector3(0, 0, 0), minDistance = 2, maxDistance = 50) {
        this.camera = camera;
        this.target = target.clone();
        
        // Camera movement settings
        this.minDistance = minDistance;
        this.maxDistance = maxDistance;
        this.currentDistance = Math.max(minDistance, 50); // Start at reasonable distance but respect minDistance
        
        // Rotation settings
        this.rotationSpeed = 0.01;
        this.zoomSpeed = 0.5;
        
        // Mouse state
        this.isMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Spherical coordinates (for orbiting)
        this.spherical = new THREE.Spherical();
        this.spherical.setFromVector3(this.camera.position.clone().sub(this.target));
        
        // Bind event handlers
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        
        // Auto-rotation (geostationary orbit only)
        this.autoRotate = false;
        this.autoRotateSpeed = 0.01; // Always matches Earth's rotation speed
        
        // Lock-in system for following objects
        this.lockedTarget = null; // Reference to the object we're locked onto
        this.lockMode = 'none'; // 'none', 'sun', 'earth'
        this.isTransitioning = false; // Flag to prevent input during transitions
        
        // Meteors list for asteroid locking
        this.meteorsList = [];
        this.currentMeteorIndex = -1; // Track current meteor index

        this.update();
    }
    
    // Enable mouse and keyboard controls
    enableControls(domElement) {
        domElement.addEventListener('mousedown', this.onMouseDown);
        domElement.addEventListener('mousemove', this.onMouseMove);
        domElement.addEventListener('mouseup', this.onMouseUp);
        domElement.addEventListener('wheel', this.onWheel);
        window.addEventListener('keydown', this.onKeyDown);
        
        // Prevent context menu on right click
        domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    // Disable controls
    disableControls(domElement) {
        domElement.removeEventListener('mousedown', this.onMouseDown);
        domElement.removeEventListener('mousemove', this.onMouseMove);
        domElement.removeEventListener('mouseup', this.onMouseUp);
        domElement.removeEventListener('wheel', this.onWheel);
        window.removeEventListener('keydown', this.onKeyDown);
    }
    
    onMouseDown(event) {
        this.isMouseDown = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }
    
    onMouseMove(event) {
        if (!this.isMouseDown) return;
        
        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;
        
        // Rotate around the target
        this.spherical.theta -= deltaX * this.rotationSpeed;
        this.spherical.phi += deltaY * this.rotationSpeed;
        
        // Limit vertical rotation
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
        
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        
        this.update();
    }
    
    onMouseUp(event) {
        this.isMouseDown = false;
    }
    
    onWheel(event) {
        event.preventDefault();
        
        // Zoom in/out
        const zoomDelta = event.deltaY * this.zoomSpeed * 0.01;
        this.currentDistance += zoomDelta;
        
        // Determine safe minimum distance based on current position
        let safeMinDistance = this.minDistance;
        
        // If not locked to a target, use global safe minimum based on proximity to objects
        if (!this.lockedTarget) {
            // Calculate distance to sun (at origin)
            const distanceToSun = this.target.length();
            const sunRadius = 15;
            
            // If we're close to the sun, enforce sun's minimum distance
            if (distanceToSun < sunRadius * 3) {
                safeMinDistance = Math.max(safeMinDistance, sunRadius * 2.5);
            }
            
            // General safe minimum for free camera
            safeMinDistance = Math.max(safeMinDistance, 20);
        }
        
        this.currentDistance = Math.max(safeMinDistance, Math.min(this.maxDistance, this.currentDistance));
        
        this.spherical.radius = this.currentDistance;
        this.update();
    }
    
    onKeyDown(event) {
        // Prevent input during transitions
        if (this.isTransitioning) return;
        
        switch(event.code) {
            case 'KeyR':
                // Reset camera position
                this.resetCamera();
                break;
            case 'KeyG':
                // Toggle geostationary orbit (matches Earth rotation)
                this.autoRotate = !this.autoRotate;
                break;
            case 'Digit0':
                // Lock onto sun with transition
                this.lockOntoSunWithTransition();
                break;
            case 'Digit1':
                // Lock onto earth with transition
                this.lockOntoEarthWithTransition();
                break;
            case 'Digit2':
                // Lock onto meteor if it exists
                this.lockOntoMeteorIfExists();
                break;
            case 'KeyA':
                // Lock onto first asteroid/meteor from the list
                if (this.meteorsList.length > 0) {
                    const firstMeteor = this.meteorsList[0];
                    this.setCurrentMeteor(firstMeteor);
                    this.lockOntoMeteor(firstMeteor);
                    console.log('Camera locked onto first asteroid');
                } else {
                    console.log('No asteroids available to lock onto');
                }
                break;
            case 'Escape':
                // Unlock from any target
                this.unlockTarget();
                break;
            case 'ArrowUp':
                // Move closer
                this.currentDistance = Math.max(this.minDistance, this.currentDistance - 5);
                
                // Apply same safety check as wheel zoom
                if (!this.lockedTarget) {
                    const distanceToSun = this.target.length();
                    const sunRadius = 15;
                    if (distanceToSun < sunRadius * 3) {
                        this.currentDistance = Math.max(this.currentDistance, sunRadius * 2.5);
                    }
                    this.currentDistance = Math.max(this.currentDistance, 20);
                }
                
                this.spherical.radius = this.currentDistance;
                this.update();
                break;
            case 'ArrowDown':
                // Move further
                this.currentDistance = Math.min(this.maxDistance, this.currentDistance + 5);
                this.spherical.radius = this.currentDistance;
                this.update();
                break;
            case 'ArrowRight':
                // Go to next meteor
                if (this.meteorsList.length > 0 && this.currentMeteorIndex < this.meteorsList.length - 1) {
                    this.lockOntoMeteorByIndex(this.currentMeteorIndex + 1);
                }
                break;
            case 'ArrowLeft':
                // Go to previous meteor
                if (this.meteorsList.length > 0 && this.currentMeteorIndex > 0) {
                    this.lockOntoMeteorByIndex(this.currentMeteorIndex - 1);
                }
                break;
        }
    }
    
    // Update camera position
    update() {
        // Defensive checks for spherical coordinates
        if (
            isNaN(this.spherical.radius) ||
            isNaN(this.spherical.phi) ||
            isNaN(this.spherical.theta) ||
            !isFinite(this.spherical.radius) ||
            !isFinite(this.spherical.phi) ||
            !isFinite(this.spherical.theta)
        ) {
            console.error('CameraController: Invalid spherical coordinates detected, skipping camera update.', this.spherical);
            return;
        }
        // Clamp phi to avoid flipping
        this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));
        // Clamp radius to min/max distance
        this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));
        // Defensive check for target
        if (!this.target || isNaN(this.target.x) || isNaN(this.target.y) || isNaN(this.target.z)) {
            console.error('CameraController: Invalid target detected, skipping camera update.', this.target);
            return;
        }
        // Update target if locked onto an object (but not during transitions)
        if (this.lockedTarget && this.lockedTarget.getPosition && !this.isTransitioning) {
            this.target.copy(this.lockedTarget.getPosition());
            
            // Dynamically adjust minimum distance based on locked target's radius
            this.updateMinDistanceForTarget();
        }
        
        // Auto-rotation
        if (this.autoRotate) {
            this.spherical.theta += this.autoRotateSpeed;
        }
        
        // Convert spherical coordinates to cartesian
        const position = new THREE.Vector3();
        position.setFromSpherical(this.spherical);
        position.add(this.target);
        
        this.camera.position.copy(position);
        this.camera.lookAt(this.target);
    }
    
    // Update minimum distance based on the current locked target
    updateMinDistanceForTarget() {
        if (!this.lockedTarget) return;
        
        let targetRadius = 1; // Default radius
        
        // Get radius based on target type
        if (this.lockedTarget.radius !== undefined) {
            targetRadius = this.lockedTarget.radius;
        } else if (this.lockMode === 'sun' && this.sunInstance) {
            targetRadius = 15; // Sun radius from ThreeDemo.js
        } else if (this.lockMode === 'earth' && this.earthInstance) {
            targetRadius = 1; // Earth radius from ThreeDemo.js
        } else if (this.lockMode === 'meteor' && this.currentMeteor) {
            targetRadius = this.currentMeteor.radius || 0.2; // Meteor radius or default
        }
        
        // Set minimum distance to be safely outside the object (radius * 2.5)
        const newMinDistance = targetRadius * 2.5;
        
        // Update minimum distance if it's different
        if (Math.abs(this.minDistance - newMinDistance) > 0.1) {
            this.minDistance = newMinDistance;
            
            // Ensure current distance respects new minimum
            if (this.currentDistance < this.minDistance) {
                this.currentDistance = this.minDistance;
                this.spherical.radius = this.currentDistance;
            }
        }
    }
    
    // Reset camera to default position
    resetCamera() {
        this.currentDistance = 75; // Appropriate default distance for new scale
        this.spherical.radius = this.currentDistance;
        this.spherical.theta = 0;
        this.spherical.phi = Math.PI / 2;
        this.update();
    }
    
    // Set target for camera to orbit around
    setTarget(target) {
        this.target.copy(target);
        this.update();
    }
    
    // Lock-in methods for following objects
    setTargetObjects(sunInstance, earthInstance) {
        this.sunInstance = sunInstance;
        this.earthInstance = earthInstance;
    }
    
    // Set current meteor for locking (called when meteor is created/destroyed)
    setCurrentMeteor(meteorInstance) {
        // Find index in meteorsList
        const idx = this.meteorsList.indexOf(meteorInstance);
        if (idx !== -1) {
            this.currentMeteorIndex = idx;
        }
        this.currentMeteor = meteorInstance;
    }
    
    // Set meteors list for asteroid locking
    setMeteorsList(meteorsList) {
        this.meteorsList = meteorsList;
        this.currentMeteorIndex = meteorsList.length > 0 ? 0 : -1;
    }

    // Internal method to lock onto meteor if one exists
    lockOntoMeteorIfExists() {
        if (this.currentMeteor) {
            this.lockOntoMeteor(this.currentMeteor);
        } else {
            console.log('No meteor to lock onto. Press M to create one!');
        }
    }
    
    // Lock onto sun with smooth transition
    lockOntoSunWithTransition(duration = 1500) {
        if (!this.sunInstance) return;
        
        // Don't transition if already locked onto sun
        if (this.lockMode === 'sun') return;
        
        // Temporarily unlock current target to prevent interference
        const previousTarget = this.lockedTarget;
        const previousMode = this.lockMode;
        this.lockedTarget = null;
        this.lockMode = 'none';
        
        // Set dynamic minimum distance for sun (radius 15)
        const sunRadius = 15;
        const targetDistance = sunRadius * 3; // Start at 3x radius for good view (45 units)
        
        this.transitionToTarget(this.sunInstance, targetDistance, () => {
            this.lockedTarget = this.sunInstance;
            this.lockMode = 'sun';
            this.updateMinDistanceForTarget(); // Update min distance after locking
            console.log('Camera locked onto Sun');
        }, duration);
    }
    
    // Lock onto earth with smooth transition
    lockOntoEarthWithTransition(duration = 1500) {
        if (!this.earthInstance) return;
        
        // Don't transition if already locked onto earth
        if (this.lockMode === 'earth') return;
        
        // Temporarily unlock current target to prevent interference
        const previousTarget = this.lockedTarget;
        const previousMode = this.lockMode;
        this.lockedTarget = null;
        this.lockMode = 'none';
        
        // Set dynamic minimum distance for earth (radius 1)
        const earthRadius = 1;
        const targetDistance = earthRadius * 5; // Start at 5x radius for good view (5 units)
        
        this.transitionToTarget(this.earthInstance, targetDistance, () => {
            this.lockedTarget = this.earthInstance;
            this.lockMode = 'earth';
            this.updateMinDistanceForTarget(); // Update min distance after locking
            console.log('Camera locked onto Earth');
        }, duration);
    }
    
    // Lock onto meteor with smooth transition
    lockOntoMeteor(meteorInstance, duration = 1500) {
        if (!meteorInstance) return;
        // Don't transition if already locked onto this meteor
        if (this.lockMode === 'meteor' && this.lockedTarget === meteorInstance) return;
        // Instantiate mesh when locking onto meteor
        if (meteorInstance.instantiateMesh) meteorInstance.instantiateMesh();
        // Temporarily unlock current target to prevent interference
        const previousTarget = this.lockedTarget;
        const previousMode = this.lockMode;
        this.lockedTarget = null;
        this.lockMode = 'none';
        // Set dynamic minimum distance for meteor (variable radius ~0.2)
        const meteorRadius = meteorInstance.radius || 0.2;
        const targetDistance = meteorRadius * 4; // Start at 4x radius for good view
        this.transitionToTarget(meteorInstance, targetDistance, () => {
            this.lockedTarget = meteorInstance;
            this.lockMode = 'meteor';
            this.updateMinDistanceForTarget(); // Update min distance after locking
            console.log('Camera locked onto Meteor');
        }, duration);
    }

    // Lock onto meteor by index in the meteorsList
    lockOntoMeteorByIndex(index, duration = 1500) {
        if (!this.meteorsList || this.meteorsList.length === 0) return;
        if (index < 0 || index >= this.meteorsList.length) return;
        this.currentMeteorIndex = index;
        const meteor = this.meteorsList[index];
        this.setCurrentMeteor(meteor);
        this.lockOntoMeteor(meteor, duration);
    }

    // Generic smooth transition to a target
    transitionToTarget(targetObject, targetDistance, onComplete, duration = 1500) {
        this.isTransitioning = true;
        
        // Store starting values
        const startTarget = this.target.clone();
        const startTheta = this.spherical.theta;
        const startPhi = this.spherical.phi;
        const startRadius = this.spherical.radius;
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function (ease-in-out)
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Get current target position (updates with moving objects)
            const currentTargetPosition = targetObject.getPosition();
            
            // Calculate target spherical coordinates relative to current target position
            const targetVector = this.camera.position.clone().sub(currentTargetPosition);
            const targetSpherical = new THREE.Spherical();
            targetSpherical.setFromVector3(targetVector);
            
            // Adjust the distance to desired value
            targetSpherical.radius = targetDistance;
            
            // Interpolate target position (follows moving object)
            this.target.lerpVectors(startTarget, currentTargetPosition, eased);
            
            // Interpolate spherical coordinates
            this.spherical.theta = startTheta + (targetSpherical.theta - startTheta) * eased;
            this.spherical.phi = startPhi + (targetSpherical.phi - startPhi) * eased;
            this.spherical.radius = startRadius + (targetSpherical.radius - startRadius) * eased;
            this.currentDistance = this.spherical.radius;
            
            this.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Transition complete
                this.isTransitioning = false;
                if (onComplete) onComplete();
            }
        };
        
        animate();
    }
    
    // Unlock from current target
    unlockTarget() {
        // Remove mesh if unlocking from meteor
        if (this.lockedTarget && this.lockMode === 'meteor' && this.lockedTarget.removeMesh) {
            this.lockedTarget.removeMesh();
        }
        this.lockedTarget = null;
        this.lockMode = 'none';
        this.isTransitioning = false; // Allow immediate control after unlock
        console.log('Camera unlocked');
    }
    
    // Get current lock status
    getLockStatus() {
        return {
            mode: this.lockMode,
            isLocked: this.lockedTarget !== null,
            target: this.lockedTarget
        };
    }
    
    // Set zoom limits
    setZoomLimits(min, max) {
        this.minDistance = min;
        this.maxDistance = max;
        this.currentDistance = Math.max(min, Math.min(max, this.currentDistance));
        this.spherical.radius = this.currentDistance;
        this.update();
    }
    
    // Get current distance from target
    getDistance() {
        return this.currentDistance;
    }
    
    // Set auto-rotation (always matches Earth's speed)
    setAutoRotate(enabled) {
        this.autoRotate = enabled;
        // Speed is always 0.01 to match Earth's rotation
    }
    
    // Enable geostationary orbit (matches Earth's rotation)
    enableGeostationaryOrbit() {
        this.autoRotate = true;
    }
    
    // Disable geostationary orbit
    disableGeostationaryOrbit() {
        this.autoRotate = false;
    }
    
    // Animate to a specific position
    animateTo(theta, phi, distance, duration = 1000) {
        const startTheta = this.spherical.theta;
        const startPhi = this.spherical.phi;
        const startDistance = this.spherical.radius;
        
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Smooth easing function
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.spherical.theta = startTheta + (theta - startTheta) * eased;
            this.spherical.phi = startPhi + (phi - startPhi) * eased;
            this.spherical.radius = startDistance + (distance - startDistance) * eased;
            this.currentDistance = this.spherical.radius;
            
            this.update();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
}
