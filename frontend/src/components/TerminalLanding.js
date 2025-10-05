import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from 'three';
import { ThreeInitializer } from '../utils/ThreeInitializer';

export default function TerminalLanding() {
  // Multi-page texts; advance through each, then navigate
  const texts = [
    `Attention, citizens! A colossal meteor is on a collision course with Earth!\nEveryone must immediately seek shelter in bunkers or underground safe locations!\nThe government is mobilizing unprecedented technology to try to stop the catastrophe,\nbut every second counts — the survival of all depends on your action now!\n\nClick to continue...`,
    `Before taking action, you must endure a serious training on space objects.\nCan you help us?\n\nClick to start experience!`
  ];

  const [page, setPage] = useState(0);
  const currentText = texts[page] ?? "";
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [canClick, setCanClick] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [preloadedAssets, setPreloadedAssets] = useState({});
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const navigate = useNavigate();

  const fullText = currentText;

  // Preload Three.js assets, preprocessed objects, and initialize scene
  useEffect(() => {
    const loadingManager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(loadingManager);
    
    const texturePaths = [
      '/resources/earth/Earth Map.jpg',
      '/resources/earth/Earth Night Map.jpg',
      '/resources/earth/Earth Topographic Map.png',
      '/resources/earth/Earth Clouds.jpg',
      '/resources/sun/Sun Map.png',
      '/resources/meteor/Meteor Map.jpg',
      '/resources/galaxy/Galaxy Map.jpg'
    ];

    // Object to hold loaded assets and preprocessed objects
    const loadedAssets = {};
    const preprocessedObjects = {};
    let totalItems = texturePaths.length + 4 + 1; // textures + 4 preprocessing steps + scene initialization
    let loadedItems = 0;

    const updateProgress = () => {
      loadedItems++;
      const progress = (loadedItems / totalItems) * 100;
      console.log(`Loading progress: ${progress}% (${loadedItems}/${totalItems})`);
      setLoadingProgress(progress);
    };

    loadingManager.onLoad = () => {
      console.log('All textures loaded, starting preprocessing...');
      
      // Preprocess complex geometries and materials
      setTimeout(() => {
        try {
          // 1. Pregenerate Earth geometries
          console.log('Preprocessing Earth geometries...');
          preprocessedObjects.earthGeometry = new THREE.SphereGeometry(1, 64, 64);
          preprocessedObjects.atmosphereGeometry = new THREE.SphereGeometry(1.015, 64, 64);
          updateProgress();

          // 2. Pregenerate Sun geometry and materials
          console.log('Preprocessing Sun objects...');
          preprocessedObjects.sunGeometry = new THREE.SphereGeometry(1, 64, 64);
          preprocessedObjects.sunMaterial = new THREE.MeshBasicMaterial({ 
            map: loadedAssets['/resources/sun/Sun Map.png'],
            color: 0xffff88
          });
          updateProgress();

          // 3. Pregenerate Galaxy geometry
          console.log('Preprocessing Galaxy geometry...');
          preprocessedObjects.galaxyGeometry = new THREE.SphereGeometry(500, 64, 64);
          preprocessedObjects.galaxyMaterial = new THREE.MeshBasicMaterial({
            map: loadedAssets['/resources/galaxy/Galaxy Map.jpg'],
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.8
          });
          updateProgress();

          // 4. Pregenerate multiple meteor geometries for variety
          console.log('Preprocessing Meteor geometries...');
          preprocessedObjects.meteorGeometries = [];
          preprocessedObjects.meteorMaterials = [];
          
          // Create 10 different meteor shapes for variety
          for (let i = 0; i < 10; i++) {
            const geometry = createMeteorGeometry(0.1 + Math.random() * 0.4, 16 + Math.floor(Math.random() * 16));
            const material = new THREE.MeshStandardMaterial({
              color: 0xDDAA77,
              map: loadedAssets['/resources/meteor/Meteor Map.jpg'],
              roughness: 0.4,
              metalness: 0.6,
              emissive: 0x442200,
              emissiveIntensity: 0.15,
            });
            preprocessedObjects.meteorGeometries.push(geometry);
            preprocessedObjects.meteorMaterials.push(material);
          }
          updateProgress();

          console.log('All preprocessing completed!');
          
          // Now initialize the Three.js scene in background using the shared initializer
          console.log('Starting background Three.js scene initialization...');
          ThreeInitializer.initializeInBackground(loadedAssets, preprocessedObjects)
            .then(() => {
              console.log('Background scene initialization complete!');
              updateProgress();
            })
            .catch((error) => {
              console.error('Error initializing background scene:', error);
              updateProgress(); // Continue even if background init fails
            });
          
          setPreloadedAssets(loadedAssets);
          setAssetsLoaded(true);
          
          // Store everything globally
          window.preloadedAssets = loadedAssets;
          window.preprocessedObjects = preprocessedObjects;
          
        } catch (error) {
          console.error('Error during preprocessing:', error);
          setAssetsLoaded(true); // Allow continuation even if preprocessing fails
        }
      }, 100); // Small delay to allow UI update
    };

    loadingManager.onError = (url) => {
      console.error(`Failed to load asset: ${url}`);
    };

    // Start loading all textures with the managed loader
    texturePaths.forEach((path) => {
      textureLoader.load(
        path,
        (texture) => {
          console.log(`Loaded texture: ${path}`);
          loadedAssets[path] = texture;
          updateProgress();
        },
        undefined,
        (error) => {
          console.error(`Failed to load texture: ${path}`, error);
          updateProgress(); // Continue even if texture fails
        }
      );
    });

    return () => {
      // Stop and cleanup background scene if running
      ThreeInitializer.cleanup();
      
      // Cleanup if component unmounts
      Object.values(loadedAssets).forEach(texture => {
        if (texture.dispose) texture.dispose();
      });
      Object.values(preprocessedObjects.meteorGeometries || []).forEach(geometry => {
        if (geometry.dispose) geometry.dispose();
      });
      Object.values(preprocessedObjects.meteorMaterials || []).forEach(material => {
        if (material.dispose) material.dispose();
      });
    };
  }, []);

  // Terminal typing effect
  useEffect(() => {
    setDisplayedText("");
    setIsTyping(true);
    setCanClick(false);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayedText(currentText.slice(0, i));
      if (i >= currentText.length) {
        clearInterval(interval);
        setIsTyping(false);
        setCanClick(true);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [currentText]);

  // Enable click when both text is done and assets are loaded
  useEffect(() => {
    let t;
    if (!isTyping && assetsLoaded) {
      // Small debounce so a fast double-click that ends typing doesn't also advance
      t = setTimeout(() => setCanClick(true), 350);
    } else {
      setCanClick(false);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [isTyping, assetsLoaded]);

   const containerStyle = {
    width: "100%",
    height: "100%",
    backgroundColor: "#000000",
    display: "flex",
    justifyContent: "flex-start",
    alignItems: "center",
    fontFamily: "'Courier New', monospace",
    boxSizing: "border-box",
  };

  const textWrapperStyle = {
    marginLeft: "15%",
    marginTop: "10%",
    height: "60%", // ocupa altura total
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start", // mantém o texto verticalmente centralizado
    // overflow: "hidden", // evita scroll ou movimento    
  };

  const textStyle = {
    color: "#00ff00",
    fontSize: "1.5rem",
    whiteSpace: "pre-wrap",
    textAlign: "left",
    lineHeight: "1.5",
  };

  const cursorStyle = {
    display: "inline-block",
    width: "10px",
    backgroundColor: "#00ff00",
    marginLeft: "2px",
    animation: "blink 0.7s infinite",
  };

  const styleSheet = `
    @keyframes blink {
      0%, 50%, 100% { opacity: 1; }
      25%, 75% { opacity: 0; }
    }
  `;

  const handleClick = () => {
    // If still typing, ignore clicks entirely
    if (isTyping) return;
    // Only accept clicks when fully ready
    if (!canClick) return;
    // Advance to next page, or navigate when done
    if (page < texts.length - 1) {
      setPage((p) => p + 1);
    } else if (assetsLoaded) {
      navigate("/star-transition");
    }
  };

  const getDisplayText = () => {
    return displayedText;
  };

  // Helper function to create meteor geometry with procedural deformation
  const createMeteorGeometry = (radius, segments) => {
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    const position = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const seed = Math.random() * 1000;
    
    for (let i = 0; i < position.count; i++) {
      vertex.fromBufferAttribute(position, i);
      const direction = vertex.clone().normalize();
      
      const noise1 = simpleNoise(direction.x * 3 + seed, direction.y * 3 + seed, direction.z * 3 + seed);
      const noise2 = simpleNoise(direction.x * 8 + seed, direction.y * 8 + seed, direction.z * 8 + seed);
      const noise3 = simpleNoise(direction.x * 15 + seed, direction.y * 15 + seed, direction.z * 15 + seed);
      
      const deformation = noise1 * 0.3 + noise2 * 0.15 + noise3 * 0.08;
      const newRadius = radius * (0.85 + deformation * 0.3);
      vertex.multiplyScalar(newRadius / vertex.length());
      
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geometry.computeVertexNormals();
    return geometry;
  };

  // Simple noise function
  const simpleNoise = (x, y, z) => {
    return (
      Math.sin(x * 2.1 + y * 1.3 + z * 0.7) * 0.5 +
      Math.sin(x * 1.7 + y * 2.9 + z * 1.1) * 0.3 +
      Math.sin(x * 3.3 + y * 0.9 + z * 2.3) * 0.2
    ) / 3;
  };

  return (
    <div style={containerStyle} onClick={handleClick}>
        <style>{styleSheet}</style>
        <div style={textWrapperStyle}>
          <pre style={textStyle}>
            {getDisplayText()}
            <span style={cursorStyle}>|</span>
          </pre>
        </div>
      </div>
  );
}