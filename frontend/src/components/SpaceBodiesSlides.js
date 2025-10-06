import React from 'react';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { Meteor } from '../render/Meteor';
import { Comet } from '../render/Comet';
import '../styles/spacebodies.css';
import musicManager from '../utils/MusicManager';
import audioContextManager from '../utils/AudioContextManager';

export default function SpaceBodiesSlides() {
  const navigate = useNavigate();
  const mountRef = React.useRef(null);
  const rendererRef = React.useRef(null);
  const sceneRef = React.useRef(null);
  const cameraRef = React.useRef(null);
  const meteorsRef = React.useRef([]);
  const rafRef = React.useRef(null);

  const SLIDES = React.useMemo(() => ([
    { key: 'asteroid', title: 'Asteroid', text: [
      'Asteroids, sometimes called minor planets, are rocky, airless remnants left over from the early formation of our solar system about 4.6 billion years ago.',
      'Most asteroids are found orbiting the Sun between Mars and Jupiter within the main asteroid belt.',
	  'Asteroids range in size from Vesta – the largest at about 329 miles (530 kilometers) in diameter – to bodies that are less than 33 feet (10 meters) across. The total mass of all the asteroids combined is less than that of Earth\'s Moon.'
    ]},
    { key: 'comet', title: 'Comet', text: [
      'Comets are cosmic snowballs of frozen gases, rock, and dust that orbit the Sun. When frozen, they are the size of a small town. When a comet\'s orbit brings it close to the Sun, it heats up and spews dust and gases into a giant glowing head larger than most planets.',
	  'The dust and gases form a tail that stretches away from the Sun for millions of miles. There are likely billions of comets orbiting our Sun in the Kuiper Belt and even more distant Oort Cloud.'
    ]},
    { key: 'meteor', title: 'Meteoroid × Meteor × Meteorite', text: [
      'Meteoroids These rocks still are in space. Meteoroids range in size from dust grains to small asteroids.',
      'Meteors When meteoroids enter Earth’s atmosphere (or that of another planet, like Mars) at high speed and burn up, the fireballs or “shooting stars” are called meteors.',
      'Meteorites When a meteoroid survives a trip through the atmosphere and hits the ground, it’s called a meteorite.'
    ]},
  ]), []);

  const [index, setIndex] = React.useState(0);
  const [overlayIndex, setOverlayIndex] = React.useState(0);
  const [baseIndex, setBaseIndex] = React.useState(0);
  const [animClass, setAnimClass] = React.useState('');
  const [animating, setAnimating] = React.useState(false);

  const pageFor = (i) => SLIDES[i] || SLIDES[0];
  const basePage = pageFor(baseIndex);
  const overlayPage = pageFor(overlayIndex);

  // Using fade animations (no directional slides)

  // Helper to parse "Title: body"; also supports leading keyword without colon
  const parseTitleBody = React.useCallback((s = '') => {
    const str = String(s).trim();
    if (!str) return { title: '', body: '' };
    const colonIdx = str.indexOf(':');
    if (colonIdx > -1) {
      return { title: str.slice(0, colonIdx).trim(), body: str.slice(colonIdx + 1).trim() };
    }

    const m = /^(meteoroid|meteoroids|meteor|meteors|meteorite|meteorites)\b[:-]?\s*(.*)$/i.exec(str);

    if (m) {
      const raw = m[1];
      const singular = raw.toLowerCase().endsWith('s') ? raw.slice(0, -1) : raw;
      const title = singular.charAt(0).toUpperCase() + singular.slice(1).toLowerCase();
      const body = m[2] ? m[2].trim() : '';
      return { title, body };
    }
    return { title: '', body: str };
  }, []);

  // Initialize Three.js scene
  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Initialize audio context manager and start music when component mounts
    audioContextManager.init();
    
    const targetTrack = '/resources/sounds/Eternal Horizon.mp3';
    
    // Only start music if it's not already playing the correct track
    if (!musicManager.isCurrentlyPlaying(targetTrack)) {
      const playResult = musicManager.playTrack(targetTrack, true);
      if (!playResult) {
        console.log('Music will play after user interaction');
      }
    } else {
      console.log('Music already playing, continuing current track');
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 4); // Move camera back a bit more
    cameraRef.current = camera;
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Transparent background
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    // Improved lighting for better visibility
    scene.add(new THREE.AmbientLight(0xffffff, 0.6)); // Increased ambient light
    const dir = new THREE.DirectionalLight(0xffffff, 1.2); // Increased directional light
    dir.position.set(2, 2, 2);
    scene.add(dir);
    
    // Add a second light from the opposite side to reduce harsh shadows
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dir2.position.set(-2, -1, 2);
    scene.add(dir2);

    // Create instances with different classes for proper representation
    // Get preloaded assets if available
    const preloadedAssets = window.preloadedAssets || {};
    const preprocessedObjects = window.preprocessedObjects || {};
    
    console.log('Creating space objects with assets:', Object.keys(preloadedAssets));
    
    const asteroid = new Meteor(scene, 0.75, 32, new THREE.Vector3(0, 0, 0), preloadedAssets, preprocessedObjects);
    const comet = new Comet(scene, 0.25, 32, new THREE.Vector3(0, 0, 0), preloadedAssets, preprocessedObjects);
    const meteor = new Meteor(scene, 0.25, 32, new THREE.Vector3(0, 0, 0), preloadedAssets, preprocessedObjects);

    // Instantiate the meshes for Meteor objects (Comet creates its mesh automatically)
    asteroid.instantiateMesh();
    meteor.instantiateMesh();

    // Debug: Check if objects were created properly
    console.log('Asteroid mesh:', asteroid.mesh);
    console.log('Comet mesh:', comet.mesh, 'tail:', comet.tail, 'coma:', comet.coma);
    console.log('Meteor mesh:', meteor.mesh);
    
    // Ensure all objects are properly added to scene and positioned correctly
    [asteroid, comet, meteor].forEach((obj, index) => {
      if (obj.mesh) {
        // Make sure the mesh is in the scene
        if (obj.mesh.parent !== scene) {
          scene.add(obj.mesh);
        }
        // Position slightly different to avoid z-fighting
        obj.mesh.position.z = index * 0.01;
        console.log(`Object ${index} position:`, obj.mesh.position);
      }
      
      // Handle comet special components
      if (obj.tail && obj.tail.parent !== scene) {
        scene.add(obj.tail);
      }
      if (obj.coma && obj.coma.parent !== scene) {
        scene.add(obj.coma);
      }
    });
    
    // Fallback: Create basic materials if objects don't have proper meshes
    [asteroid, comet, meteor].forEach((obj, index) => {
      if (!obj.mesh) {
        console.warn(`Object ${index} missing mesh, creating fallback`);
        const geometry = new THREE.SphereGeometry(index === 0 ? 0.75 : 0.25, 32, 32);
        const material = new THREE.MeshStandardMaterial({ 
          color: index === 0 ? 0x8B4513 : (index === 1 ? 0x87CEEB : 0x696969),
          roughness: 0.8,
          metalness: 0.2
        });
        obj.mesh = new THREE.Mesh(geometry, material);
        scene.add(obj.mesh);
      }
    });

    // Set sun position for proper comet tail direction (pointing left for presentation)
    comet.setSunPosition(new THREE.Vector3(2, 0, 0)); // Sun to the right, tail points left

    meteorsRef.current = [asteroid, comet, meteor];
    // Set initial visibility for all components
    meteorsRef.current.forEach((m, i) => { 
      if (m.mesh) m.mesh.visible = (i === index);
      // Handle comet components
      if (m.tail) m.tail.visible = (i === index);
      if (m.coma) m.coma.visible = (i === index);
    });

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
      // Rotate only the active object - get current index from state
      // const currentIndex = meteorsRef.current.findIndex((m, i) => {
      //   return m.mesh && m.mesh.visible;
      // });
      
      meteorsRef.current.forEach((m, i) => { 
        if (m.mesh && m.mesh.visible) { // Check if this object is currently visible
          if (i === 1) { // Comet (index 1) - rotate primarily on Y-axis
            m.mesh.rotation.y += 0.015; // Primary rotation on Y-axis
            m.mesh.rotation.x += 0.002; // Minimal wobble on X
            m.mesh.rotation.z += 0.001; // Minimal wobble on Z
          } else {
            m.rotate(0.01); // Normal rotation for asteroid and meteor
          }
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      // Don't fade out music when leaving - let the next component handle it
      // This prevents music interruption during navigation
      
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      meteorsRef.current.forEach(m => m.dispose());
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      meteorsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch visible object when index changes
  React.useEffect(() => {
    meteorsRef.current.forEach((m, i) => { 
      // Show/hide main mesh
      if (m.mesh) {
        m.mesh.visible = (i === index);
      }
      // Show/hide comet components (tail and coma)
      if (m.tail) {
        m.tail.visible = (i === index);
      }
      if (m.coma) {
        m.coma.visible = (i === index);
      }
    });
  }, [index]);

  const exitAnd = (action) => {
    if (animating) return;
    setAnimating(true);
    setAnimClass('sb-animating sb-anim-fade-out');
    setTimeout(() => {
      action?.();
      setAnimClass('');
      setAnimating(false);
    }, 240);
  };

  const onPrev = () => {
    if (animating) return;
  if (index === 0) return exitAnd(() => navigate('/types-of-space-bodies'));
    const prevIdx = Math.max(0, index - 1);
    // Immediately switch active 3D object and overlay text target
    setIndex(prevIdx); // keep rotation tied to the visible object
    setOverlayIndex(prevIdx);
    setAnimating(true);
    setAnimClass('sb-animating sb-anim-fade-in');
    setTimeout(() => {
      setBaseIndex(prevIdx);
      setAnimClass('');
      setAnimating(false);
    }, 280);
  };

  const onNext = () => {
    if (animating) return;
    if (index === SLIDES.length - 1) return exitAnd(() => navigate('/cards'));
    const nextIdx = Math.min(SLIDES.length - 1, index + 1);
    // Immediately switch active 3D object and prepare base text
    setIndex(nextIdx); // keep rotation tied to the visible object
    setBaseIndex(nextIdx);
    setAnimClass('sb-animating sb-anim-fade-out');
    setAnimating(true);
    setTimeout(() => {
      setOverlayIndex(nextIdx);
      setAnimClass('');
      setAnimating(false);
    }, 240);
  };

  return (
    <section className="sb">
      <button type="button" className="sb-nav__btn left" onClick={onPrev} aria-label="Previous">‹</button>
      <div className="sb__stage">
        {/* 3D Canvas Area */}
        <div className="sb__canvas" ref={mountRef} />

        {/* Base content: for 'meteor' show 3 separate points; otherwise side text */}
        {basePage.key === 'meteor' ? (
          <div className="sb__points base">
            {(() => {
              const a = parseTitleBody(basePage.text[0] || 'Meteoroid: small fragment in space.');
              const b = parseTitleBody(basePage.text[1] || 'Meteor: bright streak in the atmosphere.');
              const c = parseTitleBody(basePage.text[2] || 'Meteorite: fragment that reaches the ground.');
              return (
                <>
                  <div className="sb__point ul">
                    {a.title && <div className="sb__pointTitle">{a.title}</div>}
                    <div className="sb__pointBody">{a.body}</div>
                  </div>
                  <div className="sb__point ur">
                    {b.title && <div className="sb__pointTitle">{b.title}</div>}
                    <div className="sb__pointBody">{b.body}</div>
                  </div>
                  <div className="sb__point mb">
                    {c.title && <div className="sb__pointTitle">{c.title}</div>}
                    <div className="sb__pointBody">{c.body}</div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className={`sb__text ${baseIndex % 2 === 0 ? 'left' : 'right'}`}>
            <h1 className="sb__title">{basePage.title}</h1>
            <div className="sb__content">
              {basePage.text.map((p, i) => (<p key={i}>{p}</p>))}
            </div>
          </div>
        )}

        {/* Overlay content with fade animation */}
        {overlayPage.key === 'meteor' ? (
          <div className={`sb__points overlay ${animClass}`}>
            {(() => {
              const a = parseTitleBody(overlayPage.text[0] || 'Meteoroid: small fragment in space.');
              const b = parseTitleBody(overlayPage.text[1] || 'Meteor: bright streak in the atmosphere.');
              const c = parseTitleBody(overlayPage.text[2] || 'Meteorite: fragment that reaches the ground.');
              return (
                <> 
                  <div className="sb__point ul">
                    {a.title && <div className="sb__pointTitle">{a.title}</div>}
                    <div className="sb__pointBody">{a.body}</div>
                  </div>
                  <div className="sb__point ur">
                    {b.title && <div className="sb__pointTitle">{b.title}</div>}
                    <div className="sb__pointBody">{b.body}</div>
                  </div>
                  <div className="sb__point mb">
                    {c.title && <div className="sb__pointTitle">{c.title}</div>}
                    <div className="sb__pointBody">{c.body}</div>
                  </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className={`sb__text overlay ${overlayIndex % 2 === 0 ? 'left' : 'right'} ${animClass}`}>
            <h1 className="sb__title">{overlayPage.title}</h1>
            <div className="sb__content">
              {overlayPage.text.map((p, i) => (<p key={i}>{p}</p>))}
            </div>
          </div>
        )}
      </div>
      <button type="button" className="sb-nav__btn right" onClick={onNext} aria-label="Next">›</button>
    </section>
  );
}
