import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import musicManager from '../utils/MusicManager';
import audioContextManager from '../utils/AudioContextManager';
import MovingBalls from './lpmeteor';
import StarField from './StarField';
import '../styles/home.css';


export default function Home() {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [transitioning, setTransitioning] = React.useState(false); // panel fade phase
  const [zooming, setZooming] = React.useState(false); // stars zoom phase
  const navigate = useNavigate();

  const handleMouseMove = React.useCallback((e) => {
    const { innerWidth: w, innerHeight: h } = window;
    const x = ((e.clientX / w) - 0.5) * 2;
    const y = ((e.clientY / h) - 0.5) * 2;
    setOffset({ x, y });
  }, []);

  // Start music when component mounts
  React.useEffect(() => {
    // Initialize audio context manager
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
    
    return () => {
      // Don't fade out music when leaving - let the next component handle it
      // This prevents music interruption during navigation
    };
  }, []);

  const translate = (m) => `translate3d(${offset.x * m}px, ${offset.y * m}px, 0)`;

  // Trigger a StarTransition-like effect then navigate
  const startWarpTransition = React.useCallback((to, navState) => {
    if (transitioning) return;
    setTransitioning(true);
    // fade out current background music quickly to avoid overlap
    musicManager.fadeOut(300);
    // timings
  const FADE_MS = 700; // let panel fully fade first
  const ZOOM_MS = 1400; // faster zoom
  const NAV_AT = Math.round(FADE_MS + ZOOM_MS * 0.55); // navigate before zoom ends

    // start stars zoom after fade completes
    setTimeout(() => {
      setZooming(true);
      // play warp sound at zoom start (same used in StarTransition)
      try {
        const audio = new Audio('/resources/sounds/Warp Sound.wav');
        audio.preload = 'auto';
        audio.volume = 0.7;
        if (audioContextManager.isAudioEnabled()) {
          audio.play().catch(() => {});
        }
      } catch {}
    }, FADE_MS);

    // navigate before the zoom completes so next page loads during late zoom
    setTimeout(() => {
      navigate(to, navState ? { state: navState } : undefined);
    }, NAV_AT);
  }, [navigate, transitioning]);

  return (  
    <div className="space-home-container" onMouseMove={handleMouseMove}>
      {/* Background layers with parallax */}
  <div className="background-layer" style={{ transform: `${translate(2)} scale(${zooming ? 3.5 : 1})`, transition: 'transform 1.4s cubic-bezier(0.9, 0, 1, 1)' }}>
        <div className="stars-layer"><StarField count={140} /></div>
        <div className="dust-layer"></div>
      </div>
      
      {/* Falling meteors layer */}
      <div className="meteors-layer" style={{ transform: translate(1.5), opacity: transitioning ? 0 : 1, transition: 'opacity 0.7s ease' }}>
        <MovingBalls />
      </div>
      
      {/* Main Interface */}
  <div className="main-interface" style={{ transform: `${translate(1)} scale(${transitioning ? 1.02 : 1})`, opacity: transitioning ? 0 : 1, transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
        <div className="home-content">
          {/* Title */}
          <h1 className="main-title">BEWARE OF THE ROCKS</h1>
          <p className="main-subtitle">The ultimate training in space objects.</p>
          
          {/* Scanner-styled console wrapping buttons */}
          <div className="home-console">
              <div className="home-console__screen">
                {/* Divider before the primary recommendation */}
                <div className="home-divider"><span>Highly recommended</span></div>
                {/* Primary action on its own row */}
                <div className="primary-action">
                  <Link to="/orbital-simulation-intro" className="main-action-btn" >TRAINING COURSE</Link>
                </div>

                {/* Divider with centered label */}
                <div className="home-divider"><span>Simulations</span></div>

                {/* Trainings row: two buttons side-by-side */}
                <div className="trainings-row">
                  <Link to="/meteor-impact-simulator?from=home" className="main-action-btn">EARTH IMPACT</Link>
                  <Link to="/ThreeDemo" state={{ loadMeteors: false }} className="main-action-btn">EARTH ORBIT</Link>
                </div>
              </div>
          </div>
        </div>
        
        {/* Credits Button */}
        <Link to="/credits" className="credits-btn" onClick={(e) => { e.preventDefault(); startWarpTransition('/credits'); }}>CREDITS</Link>
      </div>

      
    </div>
  );
}