import React from 'react';
import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';
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

export default function IntroSlide({ topLeft = 'First, calm down. There\'s no need to worry! For now, at least. Every year, several PHAs (Potentially Hazardous Asteroids) and NEOs (Near-Earth Objects) are detected by state-of-the-art technology.', bottomRight = 'Here on Earth, we like to be overly cautious. An asteroid or comet is considered "near" when it approaches our planet less than 1.3 times the distance from Earth to Sun. Thus, most of them aren\'t really a danger.' }) {
  const backgroundRef = useRef(null);

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

    // Get preloaded assets
    const preloadedAssets = window.preloadedAssets || {};
    const preprocessedObjects = window.preprocessedObjects || {};

    let scene, camera, renderer, animationId;
    let meteors = [];
    let earth, sun, cameraController;

    const initBackground = async () => {
      // Create scene
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
      renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
      });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      backgroundRef.current.appendChild(renderer.domElement);

      // Create scene objects
      sun = new Sun(scene, 15, preloadedAssets, preprocessedObjects);
      sun.setPosition(0, 0, 0);

      earth = new Earth(scene, 1, 16, new THREE.Vector3(150, 0, 0), preloadedAssets, preprocessedObjects);
      earth.startOrbit();

      // Add galaxy
      let galaxy;
      if (preprocessedObjects.galaxyGeometry && preprocessedObjects.galaxyMaterial) {
        galaxy = new THREE.Mesh(preprocessedObjects.galaxyGeometry, preprocessedObjects.galaxyMaterial);
      } else {
        const galaxyInstance = new Galaxy(10000, 64, preloadedAssets);
        galaxy = galaxyInstance.mesh;
      }
      galaxy.position.set(0, 0, 0);
      galaxy.renderOrder = -1000;
      scene.add(galaxy);

      // Add lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.1);
      scene.add(ambientLight);
      sun.addCorona();

      // Load meteors
      try {
        const response = await fetch('/Near-Earth.json');
        const data = await response.json();
        const asteroidOrbits = parseOrbitFile(data);
        
        // Create meteors from first 7 asteroids
        asteroidOrbits.slice(0, 7).forEach((orbitParams, index) => {
          try {
            const position = new THREE.Vector3(
              orbitParams.semiMajorAxis * Math.cos(orbitParams.omega),
              0,
              orbitParams.semiMajorAxis * Math.sin(orbitParams.omega)
            );

            const meteor = new Meteor(
              scene,
              0.05 + Math.random() * 0.1,
              32,
              position,
              preloadedAssets,
              preprocessedObjects
            );

            meteor.setCamera(camera);
            meteor.startOrbit(sun.getPosition(), 0.001 + Math.random() * 0.002);
            meteors.push(meteor);
          } catch (error) {
            console.error(`Failed to create meteor ${index}:`, error);
          }
        });
      } catch (error) {
        console.error('Failed to load asteroid data:', error);
      }

      // Set camera position for nice view and setup camera controller
      const earthPos = earth.getPosition();
      const cameraDistance = 3;

      // Position camera relative to Earth
      camera.position.set(earthPos.x, earthPos.y, earthPos.z + cameraDistance);
      camera.lookAt(earthPos);

      // Initialize camera controller with Earth's position as center
      cameraController = new CameraController(camera, earthPos, 2, 20);
      cameraController.enableControls(renderer.domElement);
      cameraController.setZoomLimits(2, 20);
      cameraController.setTargetObjects(sun, earth);

      // Lock onto Earth immediately
      cameraController.target.copy(earthPos);
      cameraController.spherical.setFromVector3(camera.position.clone().sub(earthPos));
      cameraController.currentDistance = cameraDistance;
      cameraController.lockedTarget = earth;
      cameraController.lockMode = 'earth';
      cameraController.updateMinDistanceForTarget();

      console.log('Earth position:', earthPos);
      console.log('Camera position:', camera.position);
      console.log('Camera distance:', cameraDistance);

      // Animation loop
      const startTime = performance.now();

      const animate = (currentTime) => {
        const deltaTime = (currentTime - startTime) / 1000;

        // Update camera controller
        cameraController.update();

        // Update objects
        earth.updateOrbit(deltaTime);
        earth.rotate(0.5 * deltaTime / 1000);
        earth.updateMatrixWorld();

        // Update sun direction based on current Earth position
        const sunDirection = sun.getPosition().clone().sub(earth.getPosition()).normalize();
        earth.updateSunDirection(sunDirection);

        sun.update();

        // Update meteors
        meteors.forEach(meteor => {
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
      if (cameraController) {
        cameraController.disableControls(renderer.domElement);
      }
      if (renderer) {
        renderer.dispose();
      }
      if (backgroundRef.current && renderer && renderer.domElement.parentNode === backgroundRef.current) {
        backgroundRef.current.removeChild(renderer.domElement);
      }
    };
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

      {/* SpaceBodies-like nav arrows */}
      <Link to="/orbital-simulation-intro" className="sb-nav__btn left" aria-label="Back">‹</Link>
      <Link to="/types-of-space-bodies" className="sb-nav__btn right" aria-label="Next">›</Link>
    </div>
  );
}
