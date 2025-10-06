import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/moredata.css';
import musicManager from '../utils/MusicManager';
import audioContextManager from '../utils/AudioContextManager';

export default function MoreData() {
  const navigate = useNavigate();

  // Define your numeric slides here
  const SLIDES = React.useMemo(() => ([
    { title: 'Near‑Earth Objects Tracked', value: 39123, suffix: '', desc: 'And many more that are too small to track.' },
    { title: 'Near-Earth Asteroids bigger than 1 kilometer', value: 873, suffix: '', desc: 'And 50 more are estimated to be found.' },
    { title: 'Near-Earth Asteroids bigger than 140 meters', value: 11343, suffix: '', desc: 'And 14000 more are estimated to be found.' },
    { title: 'Tons of dust and sand-sized particles that bombard Earth daily', value: 100, suffix: '', desc: 'Most of them burn up in the atmosphere.' },
    { title: 'Known near-Earth asteroids passed closer to Earth than the Moon', value: 12, suffix: '', desc: '9.Aug.25 - 8.Sep.25' },
    { title: 'Known near-Earth asteroids passed closer to Earth than the Moon', value: 176, suffix: '', desc: '9.Sep.24 - 8.Sep.25' },
  ]), []);

  const [index, setIndex] = React.useState(0);
  const [displayValue, setDisplayValue] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);
  const rafRef = React.useRef(null);

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const startCount = React.useCallback((from, to, duration = 1200) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    setAnimating(true);
    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const val = Math.round(from + (to - from) * eased);
      setDisplayValue(val);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setAnimating(false);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  // Start/Restart counter whenever slide changes
  React.useEffect(() => {
    const to = SLIDES[index]?.value ?? 0;
    startCount(0, to);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [index, SLIDES, startCount]);

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

  const onPrev = () => {
    if (index === 0) return navigate('/cards');
    setIndex((i) => Math.max(0, i - 1));
  };
  const onNext = () => {
    if (index === SLIDES.length - 1) return navigate('/meteor-impact-intro');
    setIndex((i) => Math.min(SLIDES.length - 1, i + 1));
  };

  const slide = SLIDES[index];
  const formatted = new Intl.NumberFormat().format(displayValue);

  return (
    <section className="md">
      <button type="button" className="md-nav__btn left" onClick={onPrev} aria-label="Previous">‹</button>
      <div className="md__stage">
        <div className="md__title">{slide.title}</div>
        <div className={`md__value ${animating ? 'md__value--animating' : ''}`}>
          {formatted}<span className="md__suffix">{slide.suffix}</span>
        </div>
        <div className="md__desc">{slide.desc}</div>
        <div className="md__steps">{index + 1} / {SLIDES.length}</div>
      </div>
      <button type="button" className="md-nav__btn right" onClick={onNext} aria-label="Next">›</button>
    </section>
  );
}
