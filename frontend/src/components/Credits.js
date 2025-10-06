import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Earth } from '../render/Earth';
import { Meteor } from '../render/Meteor';
import musicManager from '../utils/MusicManager';
import audioContextManager from '../utils/AudioContextManager';
import '../styles/credits.css';

export default function Credits() {
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

  const pages = [
    {
      key: 'thanks',
      title: 'Thank you!',
      body: `Thank you for experiencing our space adventure.\n\nThis project was submitted on NASA Space Apps Challenge 2025, under the challenge Meteor Madness.\n\nIt has come to reality by the skills and dreams of UNICAMP undergraduate students\n Ainaras Marão\n Bruno Jambeiro\n Matheus Veiga\n Nicholas Pucharelli\n Rafael Carro\n Yan Oliveira`,
    }
  ];

  const [index, setIndex] = useState(0);
  const [anim, setAnim] = useState('in');
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const earthRef = useRef(null);
  const meteorRef = useRef(null);
  const rafRef = useRef(0);

  // 3D setup
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

  // Lights — light from screen-left, keep right side darker
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const dir = new THREE.DirectionalLight(0xffffff, 0.95);
  dir.position.set(-2.2, 0.5, 1.2); // from left toward center
    scene.add(dir);

    // Preloaded assets if available
    const preloadedAssets = typeof window !== 'undefined' ? (window.preloadedAssets || {}) : {};
    const preprocessedObjects = typeof window !== 'undefined' ? (window.preprocessedObjects || {}) : {};

  // Create Earth (reduced quality: half the segments, and bypass preprocessed high-res geometry)
    const earth = new Earth(scene, 1.0, 32, new THREE.Vector3(0, 0, 0), preloadedAssets, {});
    // Sun from screen-left so only a small strip on the right remains dark
    earth.updateSunDirection(new THREE.Vector3(-2, 2, 2));
    earthRef.current = earth;

      // Lower surface-layer quality just for this instance
      try {
        const mat = earth.mesh && earth.mesh.userData && earth.mesh.userData.material;
        if (mat && mat.uniforms) {
          // Reduce bump intensity
          if (mat.uniforms.bumpScale) mat.uniforms.bumpScale.value = 0.15; // was 0.5

          // Downgrade sampling on textures (less GPU cost, softer look)
          const downgradeTex = (tex) => {
            if (!tex) return;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = false;
            tex.anisotropy = 1;
            tex.needsUpdate = true;
          };
          downgradeTex(mat.uniforms.dayTexture && mat.uniforms.dayTexture.value);
          downgradeTex(mat.uniforms.nightTexture && mat.uniforms.nightTexture.value);
          downgradeTex(mat.uniforms.bumpTexture && mat.uniforms.bumpTexture.value);
          // Ensure shader sees updated textures
          mat.needsUpdate = true;

          // Remove night overlay but keep the original day shader look:
          // Clone the shader and force finalColor to use only dayColor.
          if (earth.mesh && mat.fragmentShader && mat.vertexShader) {
            const uniforms = THREE.UniformsUtils && THREE.UniformsUtils.clone
              ? THREE.UniformsUtils.clone(mat.uniforms)
              : { ...mat.uniforms };
            const frag = String(mat.fragmentShader)
              .replace(
                /vec4\s+finalColor\s*=\s*dayColor\s*\*\s*dayFactor\s*\+\s*nightColor\s*\*\s*nightFactor\s*;/,
                'vec4 finalColor = dayColor;'
              );
            const dayOnly = new THREE.ShaderMaterial({
              uniforms,
              vertexShader: mat.vertexShader,
              fragmentShader: frag,
            });
            earth.mesh.material = dayOnly;
            if (earth.mesh.userData) earth.mesh.userData.material = dayOnly;
          }
        }

        // Atmosphere: slightly lower opacity and texture quality
        if (earth.atmosphere && earth.atmosphere.material) {
          earth.atmosphere.material.opacity = 0.25;
          const alphaMap = earth.atmosphere.material.alphaMap;
          if (alphaMap) {
            alphaMap.minFilter = THREE.LinearFilter;
            alphaMap.magFilter = THREE.LinearFilter;
            alphaMap.generateMipmaps = false;
            alphaMap.anisotropy = 1;
            alphaMap.needsUpdate = true;
          }
        }
      } catch (e) {
        // Non-fatal; keep going with defaults
        console.warn('Credits Earth quality tweak failed:', e);
      }
    const meteor = new Meteor(scene, 0.6, 32, new THREE.Vector3(0, 0, 0), preloadedAssets, preprocessedObjects);
    meteorRef.current = meteor;

    // Initial visibility
    setActiveObject(0);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      // rotate whatever is visible (avoids stale index captures)
      if (earthRef.current && earthRef.current.mesh && earthRef.current.mesh.visible) {
        earthRef.current.rotate(0.005);
        earthRef.current.updateMatrixWorld();
      }
      if (meteorRef.current && meteorRef.current.mesh && meteorRef.current.mesh.visible) {
        meteorRef.current.rotate(0.01);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
          rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
        }
      }
      if (earthRef.current && earthRef.current.dispose) earthRef.current.dispose();
      if (meteorRef.current && meteorRef.current.dispose) meteorRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update which object is visible when index changes
  useEffect(() => {
    setAnim('in');
    const t = setTimeout(() => setAnim(''), 400);
    setActiveObject(index);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const setActiveObject = (i) => {
    const earth = earthRef.current;
    const meteor = meteorRef.current;
    if (!earth || !meteor) return;
    const showEarth = i === 0;
    if (earth.mesh) earth.mesh.visible = showEarth;
    if (earth.atmosphere) earth.atmosphere.visible = showEarth;
    if (meteor.mesh) meteor.mesh.visible = !showEarth;
  };

  return (
    <div className="credits__root">
      <div className="credits__grid">
        <div className={`credits__left ${anim ? 'fade-in' : ''}`}>
          <h2 className="credits__title">{pages[index].title}</h2>
          <pre className="credits__body">{pages[index].body}</pre>
          <div className="credits__nav">
            <Link to="/home" className="btn btn--outline">Home</Link>
          </div>
        </div>
        <div className="credits__right" ref={mountRef} />
      </div>
    </div>
  );
}
