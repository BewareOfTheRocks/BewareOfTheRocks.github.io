import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/nav.css';

export default function OrbitalSimulationIntroSlide() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '0 24px',
      fontFamily: "'Share Tech Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    }}>
      <div style={{
        width: 'min(90vw, 900px)',
        margin: '0 auto',
        display: 'grid',
        gap: '20px',
      }}>
        <h1 style={{
          fontSize: 'clamp(28px, 6vw, 72px)',
          letterSpacing: '0.5px',
          lineHeight: 1.15,
          margin: 0,
          textShadow: '0 0 24px rgba(0, 255, 200, 0.15), 0 0 8px rgba(255,255,255,0.15)'
        }}>
          The Meteor Problem in Human Perspective
        </h1>
        <p style={{
          margin: 0,
          fontSize: 'clamp(16px, 2.2vw, 22px)',
          color: 'rgba(255,255,255,0.9)',
          lineHeight: 1.6,
          textShadow: '0 0 10px rgba(0,0,0,0.35)'
        }}>
          Here on Earth, we like to be overly cautious. An asteroid or comet is considered "near" when it approaches our planet less than 1.3 times the distance from Earth to Sun. Thus, most of them aren\'t really a danger.
          </p>
      </div>

      {/* Nav arrows consistent with other slides */}
      <Link to="/home" className="sb-nav__btn left" aria-label="Back">‹</Link>
      <Link to="/intro" className="sb-nav__btn right" aria-label="Next">›</Link>
    </div>
  );
}
