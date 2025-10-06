import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Earth } from '../render/Earth';
import { Galaxy } from '../render/Galaxy';
import { CameraController } from '../controller/CameraController';
import { Sun } from '../render/Sun';
import { Meteor } from '../render/Meteor';
import { parseOrbitFile } from '../utils/NasaJsonParser.js';
import musicManager from '../utils/MusicManager';
import audioContextManager from '../utils/AudioContextManager';
import '../styles/nav.css';

export default function IntroSlide({ topLeft = 'First, calm down. There\'s no need to worry! For now, at least. Every year, several PHAs (Potentially Hazardous Asteroids) and NEOs (Near-Earth Objects) are detected by state-of-the-art technology.',
   bottomRight = 'In this simulation you can visualize the real meteors that are travelling around Earth. These meteors you see were provided by Nasa telescopes, you can also see in perspective the size of the meteors and their trajectories.' }) {
  const backgroundRef = useRef(null);
  const [lockedMeteorName, setLockedMeteorName] = useState('');
  const cameraControllerRef = useRef(null);

  // Start music when component mounts
  useEffect(() => {
    // Initialize audio context manager
    audioContextManager.init();
    
    const playResult = musicManager.playTrack('/resources/sounds/Eternal Horizon.mp3', true);
    if (!playResult) {
      console.log('Music will play after user interaction');
    }
    
    return () => {
      // Fade out music when leaving the component
      musicManager.fadeOut(500);
    };
  }, []);

  useEffect(() => {
    if (!backgroundRef.current) return;
    const backgroundElement = backgroundRef.current;
    const preloadedAssets = window.preloadedAssets || {};
    const preprocessedObjects = window.preprocessedObjects || {};
    let scene, camera, renderer, animationId;
    let meteors = [];
    let earth, sun;
    let asteroidOrbits = [];
    let sceneReady = false;
    let currentCamera = null;
    let currentScene = null;
    let sunInstance = null;
    let meteorsListRef = { current: [] };

    // Configurable options for meteor creation
    const METEOR_BATCH_SIZE = 10;
    const METEOR_SEGMENTS = 12;
    const MAX_METEORS = 200;

    // Progressive meteor creation logic
    const createMeteorsFromOrbitsProgressive = (orbits, scene, sun, assets, preprocessed, camera, batchSize = METEOR_BATCH_SIZE, onBatchCreated) => {
      if (!orbits.length || !scene || !sun) return [];
      const meteors = [];
      let index = 0;
      const total = Math.min(orbits.length, MAX_METEORS);
      function createBatch() {
        const end = Math.min(index + batchSize, total);
        for (; index < end; index++) {
          try {
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
              preprocessed,
              orbits[index].name // Pass asteroid name
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
          setTimeout(createBatch, 16);
        }
      }
      createBatch();
      return meteors;
    };

    // Asteroid orbit preloading logic (mirroring ThreeInitializer)
    let cachedAsteroidOrbits = null;
    async function loadAsteroidOrbits() {
      if (cachedAsteroidOrbits && cachedAsteroidOrbits.length > 0) {
        return cachedAsteroidOrbits;
      }
      try {
        const data = window.preloadedAsteroidData || await fetch('/Near-Earth.json').then(r => r.json());
        cachedAsteroidOrbits = parseOrbitFile(data);
        return cachedAsteroidOrbits;
      } catch (err) {
        console.error('Failed to load Near-Earth.json:', err);
        cachedAsteroidOrbits = [];
        return [];
      }
    }

    const initBackground = async () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      backgroundElement.appendChild(renderer.domElement);

      sun = new Sun(scene, 15, preloadedAssets, preprocessedObjects);
      sun.setPosition(0, 0, 0);
      earth = new Earth(scene, 1, 16, new THREE.Vector3(150, 0, 0), preloadedAssets, preprocessedObjects);
      earth.startOrbit();
      let galaxy;
      if (preprocessedObjects.galaxyGeometry && preprocessedObjects.galaxyMaterial) {
        galaxy = new THREE.Mesh(preprocessedObjects.galaxyGeometry, preprocessedObjects.galaxyMaterial);
      } else {
        const galaxyInstance = new Galaxy(64, preloadedAssets);
        galaxy = galaxyInstance.mesh;
      }
      galaxy.position.set(0, 0, 0);
      galaxy.renderOrder = -1000;
      scene.add(galaxy);
      const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
      scene.add(ambientLight);
      sun.addCorona();

      // Load asteroid orbits (preloaded and cached)
      asteroidOrbits = await loadAsteroidOrbits();

      // Set up camera controller
      const earthPos = earth.getPosition();
      const cameraDistance = 3;
      camera.position.set(earthPos.x, earthPos.y, earthPos.z + cameraDistance);
      camera.lookAt(earthPos);
      let cameraController; // Local variable for setup
      cameraController = new CameraController(camera, earthPos, 2, 20);
      cameraControllerRef.current = cameraController; // Store in ref for global access
      cameraController.enableControls(renderer.domElement);
      cameraController.setZoomLimits(2, 20);
      cameraController.setTargetObjects(sun, earth);
      cameraController.target.copy(earthPos);
      cameraController.spherical.setFromVector3(camera.position.clone().sub(earthPos));
      cameraController.currentDistance = cameraDistance;
      cameraController.lockedTarget = earth;
      cameraController.lockMode = 'earth';
      cameraController.updateMinDistanceForTarget();
      currentCamera = camera;
      currentScene = scene;
      sunInstance = sun;
      sceneReady = true;

      // Progressive meteor creation
      createMeteorsFromOrbitsProgressive(
        asteroidOrbits,
        scene,
        sun,
        preloadedAssets,
        preprocessedObjects,
        camera,
        METEOR_BATCH_SIZE,
        (createdMeteors) => {
          meteors = createdMeteors;
          meteorsListRef.current = createdMeteors;
          if (createdMeteors.length > 0 && cameraController) {
            cameraController.setMeteorsList(createdMeteors);
          }
        }
      );

      // Animation loop
      const startTime = performance.now();
      const animate = (currentTime) => {
        const deltaTime = (currentTime - startTime) / 1000;
        cameraController.update();
        earth.updateOrbit(deltaTime);
        earth.rotate(0.5 * deltaTime / 1000);
        earth.updateMatrixWorld();
        const sunDirection = sun.getPosition().clone().sub(earth.getPosition()).normalize();
        earth.updateSunDirection(sunDirection);
        sun.update();
        meteorsListRef.current.forEach(meteor => {
          meteor.updateOrbit(deltaTime);
          meteor.rotate(0.01);
        });
        renderer.render(scene, camera);
        animationId = requestAnimationFrame(animate);
      };
      animate(performance.now());
    };
    initBackground();

    // Handle resize
    const handleResize = () => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
      const cameraController = cameraControllerRef.current;
      if (cameraController) {
        cameraController.disableControls(renderer.domElement);
      }
      if (renderer) {
        renderer.dispose();
      }
      if (backgroundElement && renderer && renderer.domElement.parentNode === backgroundElement) {
        backgroundElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    let lastLockedMeteor = null;
    function pollLockedMeteor() {
      const cameraController = cameraControllerRef.current;
      if (cameraController) {
        // Debug: print lockMode and lockedTarget
        // eslint-disable-next-line
        console.log('LockMode:', cameraController.lockMode, 'LockedTarget:', cameraController.lockedTarget);
      }
      if (cameraController && cameraController.lockMode === 'meteor' && cameraController.lockedTarget) {
        let meteorName = '';
        if (cameraController.lockedTarget.getName) {
          meteorName = cameraController.lockedTarget.getName();
        } else if (cameraController.lockedTarget.name) {
          meteorName = cameraController.lockedTarget.name;
        } else {
          meteorName = 'Unknown';
        }
        // Debug: print meteor name
        // eslint-disable-next-line
        console.log('Locked Meteor Name:', meteorName);
        if (meteorName !== lastLockedMeteor) {
          setLockedMeteorName(meteorName);
          lastLockedMeteor = meteorName;
        }
      } else if (lockedMeteorName !== '') {
        setLockedMeteorName('');
        lastLockedMeteor = null;
      }
      requestAnimationFrame(pollLockedMeteor);
    }
    pollLockedMeteor();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, sans-serif',
    }}>
      {/* 3D Background */}
      <div 
        ref={backgroundRef} 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          // Enable pointer events for camera interaction
        }}
      />

      {/* Content overlay */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 24,
        fontSize: 'clamp(16px, 2.4vw, 24px)',
        opacity: 0.95,
        maxWidth: 'min(70ch, 46vw)',
        padding: '12px 16px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 0 10px rgba(255,255,255,0.08)',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.45,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
      }}>
        {topLeft}
      </div>

      <div style={{
        position: 'absolute',
        right: 24,
        bottom: 20,
        fontSize: 'clamp(16px, 2.4vw, 24px)',
        opacity: 0.95,
        textAlign: 'right',
        maxWidth: 'min(70ch, 46vw)',
        padding: '12px 16px',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 0 10px rgba(255,255,255,0.08)',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.45,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)',
        zIndex: 10,
      }}>
        {bottomRight}
      </div>

      {/* Meteor name overlay */}
      {lockedMeteorName && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -120px)',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '16px 32px',
          borderRadius: '12px',
          fontSize: '2rem',
          fontWeight: 'bold',
          zIndex: 100,
          boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
        }}>
          {lockedMeteorName}
        </div>
      )}

      {/* SpaceBodies-like nav arrows */}
      <Link to="/orbital-simulation-intro" className="sb-nav__btn left" aria-label="Back">‹</Link>
      <Link to="/types-of-space-bodies" className="sb-nav__btn right" aria-label="Next">›</Link>
    </div>
  );
}
