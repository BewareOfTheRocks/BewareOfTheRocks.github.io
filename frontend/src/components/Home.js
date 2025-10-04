import React from 'react';
import LPMeteor from './lpmeteor';
import { Link } from 'react-router-dom';


export default function Home() {
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = React.useCallback((e) => {
    const { innerWidth: w, innerHeight: h } = window;
    const x = ((e.clientX / w) - 0.5) * 2;
    const y = ((e.clientY / h) - 0.5) * 2;
    setOffset({ x, y });
  }, []);

  const translate = (m) => `translate3d(${offset.x * m}px, ${offset.y * m}px, 0)`;

  return (  
    <div className="scene" style={{
    }} onMouseMove={handleMouseMove}>
      {/* Parallax layers */}
      <div className="" style={{ transform: translate(5) }} />
      <div className="layer layer-far" style={{ 
      backgroundImage: "url('/earth_landing_page.jpg')",
        backgroundSize: "cover",      // cobre toda a área
        backgroundPosition: "center", // centraliza a imagem
        backgroundRepeat: "no-repeat", transform: translate(10) }} />

      {/* Content */}
      <LPMeteor />
      <div className="content">
        <h1>Welcome to the space experience</h1>
        <Link to="/ThreeDemo" className="cta">Open 3D Model</Link>
        <Link to="/BlueprintPage" className="cta">View Blueprints</Link>
      </div>
    </div>
  );
}