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
          Here you write your title
        </h1>
        <p style={{
          margin: 0,
          fontSize: 'clamp(16px, 2.2vw, 22px)',
          color: 'rgba(255,255,255,0.9)',
          lineHeight: 1.6,
          textShadow: '0 0 10px rgba(0,0,0,0.35)'
        }}>
          É um fato conhecido de todos que um leitor se distrairá com o conteúdo de texto legível de uma página quando estiver examinando sua diagramação. A vantagem de usar Lorem Ipsum é que ele tem uma distribuição normal de letras, ao contrário de "Conteúdo aqui, conteúdo aqui", fazendo com que ele tenha uma aparência similar a de um texto legível. Muitos softwares de publicação e editores de páginas na internet agora usam Lorem Ipsum como texto-modelo padrão, e uma rápida busca por 'lorem ipsum' mostra vários websites ainda em sua fase de construção. Várias versões novas surgiram ao longo dos anos, eventualmente por acidente, e às vezes de propósito (injetando humor, e coisas do gênero).
        </p>
      </div>

      {/* Nav arrows consistent with other slides */}
      <Link to="/home" className="sb-nav__btn left" aria-label="Back">‹</Link>
      <Link to="/intro" className="sb-nav__btn right" aria-label="Next">›</Link>
    </div>
  );
}
