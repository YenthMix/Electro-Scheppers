'use client';
import { useAuth } from './AuthProvider';

export default function UserDashboard() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welkom Normal User</h1>
            <p>Chat met Saar van Elektro Scheppers</p>
            <div className="user-info">
              Ingelogd als: <strong>{user?.username}</strong> ({user?.email})
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Uitloggen
          </button>
        </div>
      </div>

      <div className="user-dashboard-content">
        <div className="chat-info">
          <div className="chat-info-card">
            <div className="card-icon">💬</div>
            <h2>Chat Support</h2>
            <p>Gebruik de chat bubble rechtsonder om vragen te stellen aan Saar, onze virtuele assistent van Elektro Scheppers.</p>
            <div className="chat-features">
              <div className="feature">✅ 24/7 beschikbaar</div>
              <div className="feature">✅ Direct antwoord op vragen</div>
              <div className="feature">✅ Expertise over elektrotechniek</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}