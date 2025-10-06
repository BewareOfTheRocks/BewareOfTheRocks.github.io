import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import musicManager from '../utils/MusicManager';
import audioContextManager from '../utils/AudioContextManager';
import '../styles/cards.css';
import '../styles/nav.css';

export default function DraggableCards() {
  const containerRef = useRef(null);
  const glassRef = useRef(null);
  const initializedRef = useRef(false);
  const CARD_W = 330;
  const CARD_H = 210;
  const [cards, setCards] = useState(() => (
    [
      { id: 1, title: 'Catalina Sky Survey', img: '/assets/catalina.jpg', description: 'The Catalina Sky Survey (CSS) is a NASA funded project based at the University of Arizona\'s Lunar and Planetary Lab in Tucson, Arizona.  The mission of CSS is fully dedicated to discover and track near-Earth objects (NEOs). The project counts on comprehensive sky coverage, continued development and application of innovative software, with immediate human attention to the NEO discovery and follow-up.', x: 20, y: 160, z: 1, rot: -3 },
      { id: 2, title: 'Asteroid Terrestrial-impact Last Alert System (ATLAS)', img: '/assets/atlas.jpg', description: 'ATLAS is an asteroid impact early warning system developed by the University of Hawaii and funded by NASA. It consists of four telescopes (Hawaii ×2, Chile, South Africa), which automatically scan the whole sky several times every night looking for moving objects.', x: 240, y: 220, z: 2, rot: 2 },
      { id: 3, title: 'Infrared Telescope Facility (IRTF)', img: '/assets/irtf.jpg', description: 'The NASA Infrared Telescope Facility (IRTF) is one of the telescopes comprising the Maunakea Observatories on the Big Island of Hawai’i. The IRTF is a 3.2 meter telescope optimized for infrared observations. The observatory is operated and managed for NASA by the University of Hawai`i Institute for Astronomy, located in Honolulu. Observing time is open to the entire astronomical community, and 50% of the it is reserved for studies of solar system objects.', x: 460, y: 160, z: 3, rot: -1 },
      { id: 4, title: 'NEOWISE', img: '/assets/neowise.jpg', description: 'The NEOWISE project was the asteroid-hunting portion of the Wide-field Infrared Survey Explorer (WISE) mission. Funded by NASA\'s Planetary Science Division, NEOWISE harvested measurements of asteroids and comets from the WISE images and provided a rich archive for searching WISE data for solar system objects.', x: 140, y: 340, z: 4, rot: 4 },
      { id: 5, title: 'Goldstone Solar System Radar (GSSR)', img: '/assets/gssr.jpg', description: 'The GSSR, implemented on the DSS-14 antenna, is the only fully steerable planetary radar system in the world. The GSSR may receive and analyze signals from several antennas.', x: 140, y: 340, z: 4, rot: -1 },
      { id: 6, title: 'SPACEWATCH', img: '/assets/spacewatch.jpg', description: 'The original goal of SPACEWATCH® was to explore the various populations of small objects in the solar system in order to investigate the dynamical evolution of the solar system. Studies included the Main-Belt, Centaur, Trojan, Comet, Trans-Neptunian, and Earth-approaching asteroid populations. Since 1998, SPACEWATCH® has focused primarily on follow-up astrometry of such targets, monitoring positions of potentially dangerous objects.', x: 140, y: 340, z: -1, rot: 3 },
      { id: 7, title: 'Astronomical Research Institute', img: '/assets/ari.jpg', description: 'The institute is a not for profit research organization. It was founded in June 2002 with an emphasis on science education programs. In 2006 the organization started focusing on NEO observations, and in 2007 ARI began working with NASA. From February 2006 through October 2016, ARI has produced more than 136,943 measures of NEOs for the program, placing the research facility 1st in the world out of 1864 observatories.', x: 140, y: 340, z: -1, rot: 3 },
    ]
  ));
  const dragRef = useRef({ activeId: null, dx: 0, dy: 0, baseX: 0, baseY: 0 });

  const [insideCards, setInsideCards] = useState([]);

  const computeInside = (list) => {
    const stage = containerRef.current;
    const glass = glassRef.current;
    if (!stage || !glass) return [];
    const stageRect = stage.getBoundingClientRect();
    const glassRect = glass.getBoundingClientRect();
    const gx = glassRect.left - stageRect.left;
    const gy = glassRect.top - stageRect.top;
    const gw = glassRect.width;
    const gh = glassRect.height;
    const res = list.filter((c) => {
      const cx = c.x + CARD_W / 2;
      const cy = c.y + CARD_H / 2;
      return cx >= gx && cx <= gx + gw && cy >= gy && cy <= gy + gh;
    });
    return res;
  };

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
    const onMove = (e) => {
      const { activeId } = dragRef.current;
      if (!activeId) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX ?? (e.touches && e.touches[0]?.clientX)) - rect.left;
      const y = (e.clientY ?? (e.touches && e.touches[0]?.clientY)) - rect.top;
      if (x == null || y == null) return;
      const { dx, dy } = dragRef.current;
      setCards(prev => {
        const next = prev.map(c => c.id === activeId ? { ...c, x: x - dx, y: y - dy } : c);
        setInsideCards(computeInside(next));
        return next;
      });
    };
    const onUp = () => { dragRef.current.activeId = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const onPointerDown = (e, card) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragRef.current.activeId = card.id;
    dragRef.current.dx = x - card.x;
    dragRef.current.dy = y - card.y;
    // Bring to front
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, z: (Math.max(...prev.map(p => p.z || 1)) + 1) } : c));
    // Capture pointer for smoother drag
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  // Initialize positions: place one random card on glass, others on left side
  useLayoutEffect(() => {
    if (initializedRef.current) return;
    const stage = containerRef.current;
    const glass = glassRef.current;
    if (!stage || !glass) return;
    const stageRect = stage.getBoundingClientRect();
    const glassRect = glass.getBoundingClientRect();
    if (stageRect.width === 0 || glassRect.width === 0) return;
    initializedRef.current = true;
    setCards((prev) => {
      const pickIndex = Math.floor(Math.random() * prev.length);

      // Spawn settings for left side
      const padding = 24;
      const usableW = Math.max(0, stageRect.width * 0.7 - CARD_W - padding); // a bit wider area
      const usableH = Math.max(0, stageRect.height - CARD_H - padding * 2);
      const minDist = Math.max(80, Math.min(CARD_W, CARD_H) * 0.7); // keep cards apart a bit
      const minDist2 = minDist * minDist;
      const placed = [];

      const samplePos = () => {
        const x = padding + Math.random() * (usableW);
        const y = padding + Math.random() * (usableH);
        return { x, y };
      };
      const farEnough = (x, y) => placed.every(p => {
        const dx = (p.x + CARD_W / 2) - (x + CARD_W / 2);
        const dy = (p.y + CARD_H / 2) - (y + CARD_H / 2);
        return (dx * dx + dy * dy) >= minDist2;
      });

      const next = prev.map((c, i) => {
        if (i === pickIndex) {
          const gx = glassRect.left - stageRect.left + glassRect.width / 2 - CARD_W / 2;
          const gy = glassRect.top - stageRect.top + glassRect.height / 2 - CARD_H / 2;
          return { ...c, x: gx, y: gy, z: (prev.length + 1) };
        }
        // Try multiple times to place with minimal overlap
        let pos = samplePos();
        for (let attempt = 0; attempt < 24; attempt++) {
          if (farEnough(pos.x, pos.y)) break;
          pos = samplePos();
        }
        placed.push(pos);
        return { ...c, x: pos.x, y: pos.y };
      });

      // Compute inside after placement
      setInsideCards(computeInside(next));
      return next;
    });
  }, []);

  // Recompute inside on resize
  useEffect(() => {
    const onResize = () => setInsideCards(computeInside(cards));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [cards]);

  return (
    <div className="cards__root">
      <div className="cards__wrap">
        <header className="cards__header">
          <h1 className="cards__title">COSMIC GALLERY</h1>
          <p className="cards__subtitle">Drag each card to the scanner to explore how NEOs are found and tracked!</p>
        </header>
        <div className="cards__stage" ref={containerRef}>
          {/* Navigation arrows (centered vertically) */}
          <Link to="/intro" className="sb-nav__btn left" aria-label="Back">‹</Link>
          <Link to="/more-data" className="sb-nav__btn right" aria-label="Next">›</Link>
          {/* Scanner area on the right third */}
          <div className="scanner">
            <div className="scanner__title">Scanner</div>
            <div className="scanner__glass" ref={glassRef} />
            <div className="scanner__screen">
              {insideCards.length === 0 && (
                <div key="hint" className="scanner__content">
                  <div className="scanner__hint">Place a card on the glass</div>
                </div>
              )}
              {insideCards.length === 1 && (
                <div key={`card-${insideCards[0].id}`} className="scanner__content">
                  <div className="scanner__label">Title</div>
                  <div className="scanner__value">{insideCards[0].title}</div>
                  <div className="scanner__label">Description</div>
                  <div className="scanner__value scanner__value--desc">{insideCards[0].description}</div>
                </div>
              )}
              {insideCards.length > 1 && (
                <div key="warning" className="scanner__content">
                  <div className="scanner__warning">Too many cards inside!</div>
                </div>
              )}
            </div>
          </div>
          {cards.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{
                zIndex: c.z,
                transform: `translate3d(${c.x}px, ${c.y}px, 0) rotate(${c.rot}deg)`,
                touchAction: 'none',
              }}
              onPointerDown={(e) => onPointerDown(e, c)}
            >
              <img src={c.img || '/assets/nebula.jpg'} alt={c.title || 'Card'} draggable={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
