import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
// Removed Three.js Earth/Meteor render — replaced by a simple looping video
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
      body: `Thank you for experiencing our space adventure.\n\nThis project was submitted on NASA Space Apps Challenge 2025, under the challenge Meteor Madness.\n\nIt has come to reality by the skills and dreams of UNICAMP undergraduate students\n Ainaras Marão\n Bruno Jambeiro\n Matheus Veiga\n Rafael Carro\n Nicholas Pucharelli\n Yan Oliveira`,
    }
  ];

  const [index, setIndex] = useState(0);
  const [anim, setAnim] = useState('in');
  // right column will contain a video element instead of a Three.js canvas
  const videoRef = useRef(null);

  // No WebGL/Three.js setup for Credits — show a simple looping video instead.

  // Update which object is visible when index changes
  useEffect(() => {
    setAnim('in');
    const t = setTimeout(() => setAnim(''), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);


  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(pages.length - 1, i + 1));

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
        <div className="credits__right">
          <video
            ref={videoRef}
            className="credits__video"
            src="/assets/earth-loop-soundless.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Looping earth animation"
          />
        </div>
      </div>
    </div>
  );
}
