import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { Earth } from './render/Earth';
import { Galaxy } from './render/Galaxy';
import { CameraController } from './controller/CameraController';
import { Sun } from './render/Sun';
import { Meteor } from './render/Meteor';
import { ThreeInitializer } from './utils/ThreeInitializer';
import Stats from 'stats.js';
import musicManager from './utils/MusicManager';
import audioContextManager from './utils/AudioContextManager';
import { createOrbitFromJPLData, parseOrbitFile} from './utils/NasaJsonParser.js';

function ThreeDemo({ loadMeteors: propLoadMeteors = true }) {
    const location = useLocation();
    const mountRef = useRef(null);
    const statsContainerRef = useRef(null);
    const meteorsListRef = useRef([]); // Use ref for meteors list to access in animation loops

    // Check for loadMeteors flag from navigation state, fallback to prop, then default true
    const loadMeteors = location.state?.loadMeteors ?? propLoadMeteors;

    // Get preloaded assets and preprocessed objects from global window object
    const preloadedAssets = window.preloadedAssets || {};
    const preprocessedObjects = window.preprocessedObjects || {};
    const assetsPreloaded = sessionStorage.getItem('assetsPreloaded') === 'true';

    const [meteorsList, setMeteorsList] = useState([]);
    const [asteroidOrbits, setAsteroidOrbits] = useState([]);
    const [sceneReady, setSceneReady] = useState(false);
    const [currentScene, setCurrentScene] = useState(null);
    const [sunInstance, setSunInstance] = useState(null);
    const [currentCamera, setCurrentCamera] = useState(null); // Add camera state to store camera reference

    // Configurable options for meteor creation
    const METEOR_BATCH_SIZE = 10; // Number of meteors created per frame
    const METEOR_SEGMENTS = 12;   // Geometry segments for each meteor
    const MAX_METEORS = 200;      // Maximum number of meteors to create

    // Function to create meteors from asteroid orbits progressively
    const createMeteorsFromOrbitsProgressive = (orbits, scene, sun, assets, preprocessed, camera, batchSize = METEOR_BATCH_SIZE, onBatchCreated) => {
        if (!orbits.length || !scene || !sun) return [];
        const meteors = [];
        let index = 0;
        const total = Math.min(orbits.length, MAX_METEORS);
        console.log(`Progressively creating up to ${total} meteors from asteroid orbits`);

        function createBatch() {
            const end = Math.min(index + batchSize, total);
            for (; index < end; index++) {
                try {
                    // Lower geometry detail: use METEOR_SEGMENTS
                    const position = new THREE.Vector3(
                        orbits[index].semiMajorAxis * Math.cos(orbits[index].omega),
                        0,
                        orbits[index].semiMajorAxis * Math.sin(orbits[index].omega)
                    );
                    const meteor = new Meteor(
                        scene,
                        0.05 + Math.random() * 0.1,
                        METEOR_SEGMENTS,
                        position,
                        assets,
                        preprocessed
                    );
                    meteor.setCamera(camera);
                    meteor.startOrbit(sun.getPosition(), 0.001 + Math.random() * 0.002);
                    meteors.push(meteor);
                } catch (error) {
                    console.error(`Failed to create meteor ${index + 1}:`, error);
                }
            }
            if (onBatchCreated) onBatchCreated(meteors);
            if (index < total) {
                setTimeout(createBatch, 16); // Next batch in next frame
            } else {
                console.log(`Successfully created ${meteors.length} meteors progressively`);
            }
        }
        createBatch();
        return meteors;
    };

    // Function to create meteors from asteroid orbits



    useEffect(() => {
        console.log("ThreeDemo useEffect running...");
        // let data = require('./Near-Earth.json');
        // console.log("data read");
        // let AsteroidOrbits = parseOrbitFile(data);
        // AsteroidOrbits is an array of orbit parameter objects
        // let meteorsList = [];


        const stats = new Stats();
        stats.showPanel(0);
        if (statsContainerRef.current) {
            statsContainerRef.current.appendChild(stats.dom);
        }

        if (!mountRef.current) return;

        console.log('ThreeDemo starting...');

        // Initialize audio context manager
        audioContextManager.init();

        // Start playing the space music - use correct path with error handling
        try {
            const playResult = musicManager.playTrack('/resources/sounds/Drifting Through the Void.mp3', true);
            if (!playResult) {
                console.log('Music will play after user interaction');
            }
        } catch (error) {
            console.warn('Failed to load music:', error.message);
            // Continue without music
        }

        // Check if we have a background scene ready
        if (ThreeInitializer.isSceneReady()) {
            console.log('Background scene is ready! Taking it over...');
            //takeOverBackgroundScene();
            initializeFromScratch();
        } else {
            console.log('No background scene ready, initializing from scratch...');
            initializeFromScratch();
        }


        function initializeFromScratch() {
            // Fallback to original initialization
            console.log('ThreeDemo starting from scratch', assetsPreloaded ? 'Yes' : 'No');
            console.log('Available assets:', Object.keys(preloadedAssets));
            console.log('Available preprocessed objects:', Object.keys(preprocessedObjects));

            // Clear any existing content first
            mountRef.current.innerHTML = '';

            // Create scene, camera, and renderer
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
            const renderer = new THREE.WebGLRenderer({
                antialias: true,
                powerPreference: "high-performance",
                stencil: false
            });

            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            // Append to the ref div
            mountRef.current.appendChild(renderer.domElement);

            // Create scene objects
            const sunInstance = new Sun(scene, 15, preloadedAssets, preprocessedObjects);
            sunInstance.setPosition(0, 0, 0);

            const earthInstance = new Earth(scene, 1, 16, new THREE.Vector3(150, 0, 0), preloadedAssets, preprocessedObjects);
            earthInstance.startOrbit();

            // Set scene and sun for meteor creation
            setCurrentScene(scene);
            setSunInstance(sunInstance);
            setCurrentCamera(camera); // Set camera reference for meteor creation
            setSceneReady(true);

            // Add galaxy
            let galaxy;
            if (preprocessedObjects.galaxyGeometry && preprocessedObjects.galaxyMaterial) {
                console.log('Using preprocessed galaxy geometry and material');
                galaxy = new THREE.Mesh(preprocessedObjects.galaxyGeometry, preprocessedObjects.galaxyMaterial);
            } else {
                console.log('Creating galaxy from scratch');
                const galaxyInstance = new Galaxy(10000, 64, preloadedAssets);
                galaxy = galaxyInstance.mesh;
            }

            // Ensure galaxy is positioned correctly and visible
            galaxy.position.set(0, 0, 0);
            galaxy.renderOrder = -1000;
            scene.add(galaxy);
            console.log('Galaxy added to scene, position:', galaxy.position, 'scale:', galaxy.scale);

            // Add lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
            scene.add(ambientLight);
            sunInstance.addCorona();

            // Initialize camera controller
            const cameraController = new CameraController(camera, new THREE.Vector3(0, 0, 0), 80, 500);
            cameraController.enableControls(renderer.domElement);
            cameraController.setZoomLimits(80, 500);
            cameraController.setTargetObjects(sunInstance, earthInstance);

            // Store camera controller globally for meteor list access
            window.currentCameraController = cameraController;

            // Set initial camera position to look at Earth
            const earthPos = earthInstance.getPosition();
            const direction = new THREE.Vector3(0, 0, 1).normalize();
            const cameraDistance = 8;

            camera.position.copy(earthPos).add(direction.multiplyScalar(cameraDistance));
            camera.lookAt(earthPos);

            // Set camera far plane to ensure galaxy is visible
            camera.far = 20000;
            camera.updateProjectionMatrix();

            cameraController.target.copy(earthPos);
            cameraController.spherical.setFromVector3(camera.position.clone().sub(earthPos));
            cameraController.currentDistance = cameraDistance;

            console.log('Camera setup - position:', camera.position, 'far plane:', camera.far);

            // Lock onto Earth immediately (no transition needed since we're already positioned correctly)

            cameraController.lockedTarget = earthInstance;
            cameraController.lockMode = 'earth';
            cameraController.updateMinDistanceForTarget();
            console.log('Camera locked onto Earth from start');
            // Variables for this component
            let animationId;

            // Start animation
            const startTimestamp = performance.now();
            let lastTimestamp = startTimestamp;

            if (loadMeteors) {
                // Load Near-Earth.json using fetch
                fetch('/Near-Earth.json')
                    .then(response => response.json())
                    .then(data => {
                        console.log('Loaded Near-Earth.json data:', data.length, 'asteroids');
                        const AsteroidOrbits = parseOrbitFile(data);
                        setAsteroidOrbits(AsteroidOrbits);
                        let initialPos = new THREE.Vector3(0, 0, 0);
                        AsteroidOrbits.forEach((orbitparams) => {
                            const meteor = new Meteor(scene, 0.2, 32, initialPos,preloadedAssets, preprocessedObjects);
                            meteorsListRef.current.push(meteor);
                        })
                        meteorsListRef.current.forEach((meteor, index) => {
                            meteor.startOrbit(AsteroidOrbits[index]);
                        })

                    })
                    .catch(err => {
                        console.error('Failed to load Near-Earth.json:', err);
                        setAsteroidOrbits([]);
                        meteorsListRef.current = []
                    });
            } else {
                console.log('Skipping asteroid data loading - meteors disabled');
                setAsteroidOrbits([]);
                meteorsListRef.current = []
            }

            const animate = (currentTimestamp) => {
                stats.begin();
                const deltaTime = (currentTimestamp - lastTimestamp) / 1000;
                lastTimestamp = currentTimestamp;
                const absoluteTime = (currentTimestamp - startTimestamp) / 1000;

                cameraController.update();

                earthInstance.updateOrbit(absoluteTime);
                earthInstance.rotate(0.5 * deltaTime);
                earthInstance.updateMatrixWorld();

                const sunDirection = sunInstance.getPosition().clone().sub(earthInstance.getPosition()).normalize();
                earthInstance.updateSunDirection(sunDirection);

                sunInstance.update();

                // Update all meteors from asteroid data (only if meteors are enabled)
                if (loadMeteors) {
                    meteorsListRef.current.forEach((meteor) => {
                        meteor.updateOrbit(absoluteTime);
                        meteor.rotate(0.01);
                    });
                }


                renderer.render(scene, camera);
                stats.end();
                animationId = requestAnimationFrame(animate);
            };

            animationId = requestAnimationFrame(animate);

            const handleResize = () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            };

            window.addEventListener('resize', handleResize);

            // Store cleanup function
            window.threeCleanup = () => {
                if (animationId) cancelAnimationFrame(animationId);
                cameraController.disableControls(renderer.domElement);
                window.removeEventListener('resize', handleResize);
                if (sunInstance) sunInstance.dispose();
                if (earthInstance) earthInstance.dispose();
                renderer.dispose();
                // Remove stats panel from container
                if (statsContainerRef.current && stats.dom.parentNode === statsContainerRef.current) {
                    statsContainerRef.current.removeChild(stats.dom);
                }
                if (mountRef.current) mountRef.current.innerHTML = '';
            };
        }

        // Cleanup function
        return () => {
            // Stop music when leaving ThreeDemo
            musicManager.fadeOut(500);

            if (window.threeCleanup) {
                window.threeCleanup();
                window.threeCleanup = null;
            }
            // Remove stats panel from container (fallback cleanup)
            if (statsContainerRef.current && stats.dom.parentNode === statsContainerRef.current) {
                statsContainerRef.current.removeChild(stats.dom);
            }
        };
    }, []);

    // Effect to create meteors when we have both orbits and scene ready
    useEffect(() => {
        if (loadMeteors && asteroidOrbits.length > 0 && sceneReady && currentScene && sunInstance && currentCamera) {
            // Use progressive creation to reduce GPU spike
            createMeteorsFromOrbitsProgressive(
                asteroidOrbits,
                currentScene,
                sunInstance,
                preloadedAssets,
                preprocessedObjects,
                currentCamera,
                METEOR_BATCH_SIZE,
                (createdMeteors) => {
                    setMeteorsList([...createdMeteors]);
                    meteorsListRef.current = createdMeteors;
                    if (createdMeteors.length > 0 && window.currentCameraController) {
                        window.currentCameraController.setMeteorsList(createdMeteors);
                    }
                }
            );
        } else if (!loadMeteors) {
            setMeteorsList([]);
            meteorsListRef.current = [];
        }
    }, [loadMeteors, asteroidOrbits, sceneReady, currentScene, sunInstance, currentCamera]);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                color: 'white',
                zIndex: 100,
                background: 'rgba(0, 0, 0, 0.7)',
                padding: '15px',
                borderRadius: '8px',
                fontFamily: 'Arial, sans-serif'
            }}>
                <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
                    Earth Explorer {!loadMeteors && '(Meteors Disabled)'}
                </h2>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>🖱️ Mouse: Rotate camera</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>🖱️ Scroll: Zoom in/out</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>⌨️ R: Reset camera</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>⌨️ G: Geostationary orbit</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>⌨️ 0: Lock onto Sun</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>⌨️ 1: Lock onto Earth</p>
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>⌨️ 2: Lock onto Meteor</p>
                {loadMeteors ? (
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>⌨️ A: Lock onto first Asteroid</p>
                ) : (
                    <p style={{ margin: '0 0 5px 0', fontSize: '12px', opacity: 0.5 }}>⌨️ A: Lock onto first Asteroid (disabled)</p>
                )}
                <p style={{ margin: '0 0 5px 0', fontSize: '12px' }}>⌨️ ESC: Unlock camera</p>
                <p style={{ margin: '0 0 10px 0', fontSize: '12px' }}>⌨️ ↑↓: Zoom</p>
                <a href="/" style={{
                    color: '#61dafb',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    border: '1px solid #61dafb',
                    padding: '5px 10px',
                    borderRadius: '4px'
                }}>← Back to Home</a>
            </div>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            <div ref={statsContainerRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 200 }} />
        </div>
    );
}

export default ThreeDemo;
