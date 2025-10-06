import * as THREE from 'three';
import { Orbit } from './Orbit.js';
import { AstralObject } from './AstralObject.js';

export class Meteor extends AstralObject {
    constructor(scene, radius, segments = 32, initialPosition, preloadedAssets = {}, preprocessedObjects = {}, name = 'Unknown') {
        super(scene, radius, segments, initialPosition, preprocessedObjects);
        this.preloadedAssets = preloadedAssets;
        this.mesh = null; // Mesh is not created by default
        this.name = name;

        // Add to scene (traceLine is already added by parent constructor)
        this.addToScene();
    }

    instantiateMesh() {
        if (this.mesh) return; // Already instantiated
        this.mesh = this.createMeteorMesh();
        this.setPosition(this.position.x, this.position.y, this.position.z);
        this.addToScene();
    }

    removeMesh() {
        if (this.mesh) {
            this.removeFromScene();
            this.mesh = null;
        }
    }

    createMeteorMesh() {
        let geometry, material;

        // Use preprocessed objects if available
        if (this.preprocessedObjects.meteorGeometries && this.preprocessedObjects.meteorMaterials &&
            this.preprocessedObjects.meteorGeometries.length > 0) {
            console.log('Using preprocessed meteor objects');

            // Pick a random preprocessed geometry and material
            const randomIndex = Math.floor(Math.random() * this.preprocessedObjects.meteorGeometries.length);
            geometry = this.preprocessedObjects.meteorGeometries[randomIndex].clone();
            material = this.preprocessedObjects.meteorMaterials[randomIndex].clone();

            // Scale geometry to match the desired radius
            const scaleFactor = this.radius / 0.3; // 0.3 is average radius from preprocessing
            geometry.scale(scaleFactor, scaleFactor, scaleFactor);

        } else {
            console.log('Creating meteor objects normally');
            // Create irregular geoid geometry for asteroid-like shape
            geometry = this.createGeoidGeometry(this.radius, this.segments);

            // Use preloaded texture if available, otherwise load normally
            const textureLoader = new THREE.TextureLoader();
            const meteorTexture = this.preloadedAssets['/resources/meteor/Meteor Map.jpg']
                || textureLoader.load('/resources/meteor/Meteor Map.jpg');

            // Create a rocky/metallic material for the meteor
            material = new THREE.MeshStandardMaterial({
                color: 0xDDAA77, // Brighter, more reflective color
                map: meteorTexture,
                roughness: 0.4, // Much smoother surface for better light reflection
                metalness: 0.6, // Higher metallic content for better sun reflection
                emissive: 0x442200, // Warmer, brighter emissive glow
                emissiveIntensity: 0.15, // Reduced emissive to let sun lighting dominate
            });
        }

        const mesh = new THREE.Mesh(geometry, material);
        
        // Ensure the meteor does not interact with shadows
        mesh.castShadow = false;
        mesh.receiveShadow = false;

        return mesh;
    }
    
    // Create irregular geoid geometry with random deformations
    createGeoidGeometry(radius, segments) {
        const geometry = new THREE.SphereGeometry(radius, segments, segments);
        
        // Get the position attribute
        const position = geometry.attributes.position;
        const vertex = new THREE.Vector3();
        
        // Create random variations for each meteor
        const seed = Math.random() * 1000;
        
        // Apply random deformations to create irregular asteroid shape
        for (let i = 0; i < position.count; i++) {
            vertex.fromBufferAttribute(position, i);
            
            // Normalize to get direction
            const direction = vertex.clone().normalize();
            
            // Create multiple noise layers for complex surface
            const noise1 = this.simpleNoise(direction.x * 3 + seed, direction.y * 3 + seed, direction.z * 3 + seed);
            const noise2 = this.simpleNoise(direction.x * 8 + seed, direction.y * 8 + seed, direction.z * 8 + seed);
            const noise3 = this.simpleNoise(direction.x * 15 + seed, direction.y * 15 + seed, direction.z * 15 + seed);
            
            // Combine noise layers with different amplitudes
            const deformation = 
                noise1 * 0.3 +      // Large features
                noise2 * 0.15 +     // Medium features  
                noise3 * 0.08;      // Small details
            
            // Apply deformation (scale between 0.7 and 1.3 of original radius)
            const newRadius = radius * (0.85 + deformation * 0.3);
            vertex.multiplyScalar(newRadius / vertex.length());
            
            // Update the position
            position.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        // Recalculate normals for proper lighting
        geometry.computeVertexNormals();
        
        return geometry;
    }
    
    // Simple noise function for procedural generation
    simpleNoise(x, y, z) {
        // Simple 3D noise approximation using sine functions
        return (
            Math.sin(x * 2.1 + y * 1.3 + z * 0.7) * 0.5 +
            Math.sin(x * 1.7 + y * 2.9 + z * 1.1) * 0.3 +
            Math.sin(x * 3.3 + y * 0.9 + z * 2.3) * 0.2
        ) / 3;
    }

    // Add all Meteor components to scene
    addToScene() {
        if (this.mesh) {
            this.scene.add(this.mesh);
        }
    }
    
    // Remove all Meteor components from scene
    removeFromScene() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    }

    // Set position for Meteor
    setPosition(x, y, z) {
        this.position.set(x, y, z);

        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    // Get current position
    getPosition() {
        return this.position.clone();
    }

    // Rotate Meteor with random tumbling motion
    rotate(deltaY = 0.01) {
        if (this.mesh) {
            // Add some random tumbling motion for realism
            this.mesh.rotation.x += deltaY * 0.7;
            this.mesh.rotation.y += deltaY;
            this.mesh.rotation.z += deltaY * 0.3;
        }
    }
    
    // Start orbiting around a center point (usually the sun)
    startOrbit(center = new THREE.Vector3(0, 0, 0), speed = 0.005) {
        const distance = this.position.distanceTo(center);
        super.startOrbit({
            semiMajorAxis: distance,
            eccentricity: 0.1 + Math.random() * 0.3,
            period: 180.0 + Math.random() * 360.0,
            inclination: (Math.random() - 0.5) * Math.PI / 3,
            omega: Math.random() * Math.PI * 2,
            raan: Math.random() * Math.PI * 2
        });
    }
    
    // Stop orbiting
    stopOrbit() {
        super.stopOrbit();
    }
    
    // Update orbit position
    updateOrbit(time) {
        if (!this.isOrbiting || !this.orbit) return;
        super.updateOrbit(time);
    }
    
    // Set orbit parameters (legacy method for compatibility)
    setOrbitParameters(radius, speed) {
        if (this.orbit) {
            this.orbit = new Orbit({
                semiMajorAxis: radius,
                eccentricity: 0.1,
                period: 60.0 / speed, // Convert speed to period
                inclination: 0,
                omega: 0,
                raan: 0
            });
        }
    }
    
    // Get orbit status
    getOrbitStatus() {
        if (!this.orbit) {
            return {
                isOrbiting: this.isOrbiting,
                orbit: null
            };
        }
        return {
            isOrbiting: this.isOrbiting,
            semiMajorAxis: this.orbit.a,
            eccentricity: this.orbit.e,
            period: this.orbit.T,
            inclination: this.orbit.inclination,
            omega: this.orbit.omega,
            raan: this.orbit.raan
        };
    }
    
    // Cleanup method
    dispose() {
        // Only call super.dispose, do not remove trace again
        super.dispose();
    }
    
    // Static method to create random meteors with different properties
    static createRandomMeteor(scene, minRadius = 0.1, maxRadius = 0.5, position, preloadedAssets = {}, preprocessedObjects = {}) {
        const randomRadius = minRadius + Math.random() * (maxRadius - minRadius);
        const randomSegments = 16 + Math.floor(Math.random() * 16); // 16-32 segments
        
        return new Meteor(scene, randomRadius, randomSegments, position, preloadedAssets, preprocessedObjects);
    }
    
    // Static method to create a meteor field
    static createMeteorField(scene, count = 10, centerPosition = new THREE.Vector3(0, 0, 0), fieldRadius = 20, preloadedAssets = {}, preprocessedObjects = {}) {
        const meteors = [];
        
        for (let i = 0; i < count; i++) {
            // Random position within the field
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * fieldRadius;
            const height = (Math.random() - 0.5) * fieldRadius * 0.3; // Some vertical spread
            
            const position = new THREE.Vector3(
                centerPosition.x + Math.cos(angle) * distance,
                centerPosition.y + height,
                centerPosition.z + Math.sin(angle) * distance
            );
            
            const meteor = Meteor.createRandomMeteor(scene, 0.05, 0.3, position, preloadedAssets, preprocessedObjects);
            
            // Add random orbit if desired
            if (Math.random() > 0.5) {
                meteor.startOrbit(centerPosition, 0.001 + Math.random() * 0.002);
            }
            
            meteors.push(meteor);
        }
        
        return meteors;
    }
}
