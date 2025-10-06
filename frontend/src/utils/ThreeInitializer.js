import * as THREE from 'three';
import { Earth } from '../render/Earth';
import { Galaxy } from '../render/Galaxy';
import { CameraController } from '../controller/CameraController';
import { Sun } from '../render/Sun';
import { Meteor } from '../render/Meteor';
import { createOrbitFromJPLData, parseOrbitFile } from './NasaJsonParser.js';

// Shared Three.js initialization that can be called from anywhere
export class ThreeInitializer {
    static backgroundScene = null;
    static isInitializing = false;
    static isReady = false;
    static asteroidOrbits = [];
    static meteorsCreated = false;

    // Function to create meteors from asteroid orbits
    static createMeteorsFromOrbits(orbits, scene, sun, assets, preprocessed, camera) {
        console.log('ThreeInitializer.createMeteorsFromOrbits called');
        if (!orbits.length || !scene || !sun) return [];

        console.log(`Creating ${orbits.length} meteors from asteroid orbits`);
        const meteors = [];

        orbits.forEach((orbitParams, index) => {
            try {
                // Calculate initial position based on orbit parameters
                const position = new THREE.Vector3(
                    orbitParams.semiMajorAxis * Math.cos(orbitParams.omega),
                    0,
                    orbitParams.semiMajorAxis * Math.sin(orbitParams.omega)
                );

                const meteor = new Meteor(
                    scene,
                    0.05 + Math.random() * 0.1, // Random size between 0.05 and 0.15
                    32,
                    position,
                    assets,
                    preprocessed
                );

                // Set camera reference for trace fading
                meteor.setCamera(camera);

                // Start the meteor's orbit
                meteor.startOrbit(sun.getPosition(), 0.001 + Math.random() * 0.002);
                meteors.push(meteor);

                if (index < 5) { // Log first 5 for debugging
                    console.log(`Created meteor ${index + 1}: ${orbitParams.name}`);
                }
            } catch (error) {
                console.error(`Failed to create meteor ${index + 1}:`, error);
            }
        });

        console.log(`Successfully created ${meteors.length} meteors`);
        return meteors;
    }

    // Load asteroid orbits data
    static async loadAsteroidOrbits() {
        console.log('ThreeInitializer.loadAsteroidOrbits called');
        if (this.asteroidOrbits.length > 0) {
            return this.asteroidOrbits; // Already loaded
        }

        try {
            const response = await fetch('/Near-Earth.json');
            const data = await response.json();
            console.log('Loaded Near-Earth.json data:', data.length, 'asteroids');
            this.asteroidOrbits = parseOrbitFile(data);
            return this.asteroidOrbits;
        } catch (err) {
            console.error('Failed to load Near-Earth.json:', err);
            this.asteroidOrbits = [];
            return [];
        }
    }

    static async initializeInBackground(preloadedAssets, preprocessedObjects) {
        console.log('ThreeInitializer.initializeInBackground called');
        if (this.isInitializing || this.isReady) {
            console.log('Background scene already initializing or ready');
            return;
        }

        this.isInitializing = true;
        console.log('Starting background Three.js initialization...');

        try {
            // Load asteroid orbits first
            await this.loadAsteroidOrbits();

            // Create scene, camera, and renderer (but don't attach to DOM yet)
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            const renderer = new THREE.WebGLRenderer({
                antialias: false, // Will be upgraded when attached to DOM
                powerPreference: "high-performance",
                stencil: false
            });

            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000);
            renderer.shadowMap.enabled = false;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // Progressive initialization to prevent blocking
            const sunInstance = new Sun(scene, 15, preloadedAssets, preprocessedObjects);
            sunInstance.setPosition(0, 0, 0);

            // Small delay to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 16));

            const earthInstance = new Earth(scene, 1, 16, new THREE.Vector3(150, 0, 0), preloadedAssets, preprocessedObjects);
            earthInstance.startOrbit();

            // Another small delay
            await new Promise(resolve => setTimeout(resolve, 16));

            // Add galaxy
            let galaxy;
            if (preprocessedObjects.galaxyGeometry && preprocessedObjects.galaxyMaterial) {
                galaxy = new THREE.Mesh(preprocessedObjects.galaxyGeometry, preprocessedObjects.galaxyMaterial);
            } else {
                galaxy = new Galaxy(500, 64, preloadedAssets).mesh;
            }
            scene.add(galaxy);

            // Another small delay
            await new Promise(resolve => setTimeout(resolve, 16));

            // Add lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
            scene.add(ambientLight);
            sunInstance.addCorona();

            // Initialize camera controller
            const cameraController = new CameraController(camera, new THREE.Vector3(0, 0, 0), 20, 500);
            cameraController.setZoomLimits(20, 500);
            cameraController.setTargetObjects(sunInstance, earthInstance);

            // Set initial camera position to look at Earth
            const earthPos = earthInstance.getPosition();
            const direction = new THREE.Vector3(0, 0, 1).normalize();
            const cameraDistance = 8;

            camera.position.copy(earthPos).add(direction.multiplyScalar(cameraDistance));
            camera.lookAt(earthPos);

            cameraController.target.copy(earthPos);
            cameraController.spherical.setFromVector3(camera.position.clone().sub(earthPos));
            cameraController.currentDistance = cameraDistance;

            // Create meteors from asteroid orbits
            let meteors = [];
            if (this.asteroidOrbits.length > 0) {
                console.log('Creating meteors from asteroid orbits in background...');
                meteors = this.createMeteorsFromOrbits(
                    this.asteroidOrbits,
                    scene,
                    sunInstance,
                    preloadedAssets,
                    preprocessedObjects,
                    camera
                );
                this.meteorsCreated = true;
            }

            // Lock onto Earth immediately (no transition needed since we're already positioned correctly)
            setTimeout(() => {
                cameraController.lockedTarget = earthInstance;
                cameraController.lockMode = 'earth';
                cameraController.updateMinDistanceForTarget();
                console.log('Camera locked onto Earth from start');
            }, 100);

            // Store the initialization timestamp for animation continuity
            const startTimestamp = performance.now();

            // Store the initialized scene
            this.backgroundScene = {
                scene,
                camera,
                renderer,
                sunInstance,
                earthInstance,
                galaxy,
                meteors,
                cameraController,
                ambientLight,
                startTimestamp,
                updateMeteors: (absoluteTime) => {
                    meteors.forEach((meteor) => {
                        meteor.updateOrbit(absoluteTime);
                        meteor.rotate(0.01);
                    });
                },
                setMeteorTarget: (index = 0) => {
                    if (meteors.length > index) {
                        cameraController.setCurrentMeteor(meteors[index]);
                        cameraController.lockMode = 'meteor';
                        console.log(`Camera locked onto meteor ${index}`);
                        return meteors[index];
                    }
                    return null;
                },
                getMeteors: () => meteors,
                getMeteorCount: () => meteors.length,
                attachToDOM: (mountElement) => {
                    // Attach renderer to DOM and enable controls
                    if (mountElement) {
                        console.log('Attaching background scene to DOM...');
                        mountElement.appendChild(renderer.domElement);
                        cameraController.enableControls(renderer.domElement);

                        // Initial render to show something immediately
                        renderer.render(scene, camera);

                        // Upgrade to smooth renderer after a short delay
                        setTimeout(() => {
                            const smoothRenderer = new THREE.WebGLRenderer({
                                antialias: true,
                                powerPreference: "high-performance"
                            });
                            smoothRenderer.setSize(window.innerWidth, window.innerHeight);
                            smoothRenderer.setClearColor(0x000000);
                            smoothRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

                            // Replace in DOM
                            mountElement.removeChild(renderer.domElement);
                            mountElement.appendChild(smoothRenderer.domElement);

                            // Update controls
                            cameraController.enableControls(smoothRenderer.domElement);

                            // Update renderer reference
                            Object.assign(renderer, smoothRenderer);

                            // Render once with new renderer
                            renderer.render(scene, camera);
                        }, 100);
                    }
                }
            };

            this.isReady = true;
            this.isInitializing = false;
            console.log('Background Three.js scene ready!');

        } catch (error) {
            console.error('Error initializing background scene:', error);
            this.isInitializing = false;
        }
    }

    static getBackgroundScene() {
        console.log('ThreeInitializer.getBackgroundScene called');
        return this.backgroundScene;
    }

    static isSceneReady() {
        console.log('ThreeInitializer.isSceneReady called');
        return this.isReady && this.backgroundScene !== null;
    }

    static getAsteroidOrbits() {
        console.log('ThreeInitializer.getAsteroidOrbits called');
        return this.asteroidOrbits;
    }

    static areMeteorsCreated() {
        console.log('ThreeInitializer.areMeteorsCreated called');
        return this.meteorsCreated;
    }

    static cleanup() {
        console.log('ThreeInitializer.cleanup called');
        if (this.backgroundScene) {
            // Dispose of meteors
            if (this.backgroundScene.meteors) {
                this.backgroundScene.meteors.forEach(meteor => {
                    if (meteor.dispose) meteor.dispose();
                });
            }
            // Dispose of other objects
            if (this.backgroundScene.sunInstance) this.backgroundScene.sunInstance.dispose();
            if (this.backgroundScene.earthInstance) this.backgroundScene.earthInstance.dispose();
            if (this.backgroundScene.renderer) this.backgroundScene.renderer.dispose();
            this.backgroundScene = null;
        }
        this.isReady = false;
        this.isInitializing = false;
        this.meteorsCreated = false;
        this.asteroidOrbits = [];
    }
}
