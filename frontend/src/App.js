import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ThreeDemo from './ThreeDemo';
import Home from './components/Home';
import TerminalLanding from './components/TerminalLanding';
import StarTransition from './components/StarTransition';
import BlueprintPage from './components/BlueprintPage';
import SpaceBodiesSlides from './components/SpaceBodiesSlides';
import MoreData from './components/MoreData';
import WarningScreen from './components/WarningScreen';
import MeteorImpactSimulator from './components/MeteorImpactSimulator';
import Credits from './components/Credits';
import IntroSlide from './components/IntroSlide';
import DraggableCards from './components/DraggableCards';
import TypesOfSpaceBodiesSlide from './components/TypesOfSpaceBodiesSlide';
import MitigationIntroSlide from './components/MitigationIntroSlide';
import MeteorImpactSimulationIntroSlide from './components/MeteorImpactSimulationIntroSlide';
import OrbitalSimulationIntroSlide from './components/OrbitalSimulationIntroSlide';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WarningScreen />} />
        <Route path="/terminal" element={<TerminalLanding />} />
        <Route path="/home" element={<Home />} />
        <Route path="/star-transition" element={<StarTransition />} />
        <Route path="/ThreeDemo" element={<ThreeDemo />} />
        <Route path="/blueprint" element={<BlueprintPage />} />
        <Route path="/space-bodies" element={<SpaceBodiesSlides />} />
        <Route path="/more-data" element={<MoreData />} />
        <Route path="/mitigation" element={<MitigationIntroSlide />} />
        <Route path="/warning" element={<WarningScreen />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/intro" element={<IntroSlide />} />
        <Route path="/types-of-space-bodies" element={<TypesOfSpaceBodiesSlide />} />
        <Route path="/cards" element={<DraggableCards />} />
        <Route path="/meteor-impact-simulator" element={<MeteorImpactSimulator />} />
        <Route path="/ending" element={<TerminalLanding texts={['End of training. You are now fully prepared to protect planet Earth. Congratulations.\n\nClick to finish routine.']} path={'/credits'} />} />
        <Route path="/meteor-impact-intro" element={<MeteorImpactSimulationIntroSlide />} />
        <Route path="/orbital-simulation-intro" element={<OrbitalSimulationIntroSlide />} />

      </Routes>
    </BrowserRouter>
  );
}
