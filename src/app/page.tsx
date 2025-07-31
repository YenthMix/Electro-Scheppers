'use client';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleNavigateToInfo = () => {
    router.push('/info');
  };

  return (
    <div className="elektro-scheppers-home">
      <div className="home-content">
        <div className="welcome-section">
          <h1>Welkom bij Elektro Scheppers</h1>
          <p>Uw partner voor professionele elektrotechnische oplossingen</p>
        </div>
        
        <div className="action-buttons">
          <button 
            onClick={handleNavigateToInfo}
            className="info-button-home"
          >
            Upload Documenten
          </button>
        </div>
      </div>
    </div>
  );
}
