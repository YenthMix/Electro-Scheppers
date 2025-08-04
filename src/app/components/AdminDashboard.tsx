'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleUploadDocuments = () => {
    router.push('/info');
  };

  const handleChatManager = () => {
    router.push('/chat-manager');
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welkom Admin</h1>
            <p>Beheer uw Elektro Scheppers systeem</p>
            <div className="user-info">
              Ingelogd als: <strong>{user?.username}</strong> ({user?.email})
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Uitloggen
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="admin-actions">
          <div className="action-card">
            <div className="card-icon">📄</div>
            <h3>Documenten Beheren</h3>
            <p>Upload en beheer documenten voor de knowledge base</p>
            <button onClick={handleUploadDocuments} className="action-button">
              Upload Documenten
            </button>
          </div>

          <div className="action-card">
            <div className="card-icon">💬</div>
            <h3>Chat Support</h3>
            <p>Bekijk en beheer chat conversaties</p>
            <button onClick={handleChatManager} className="action-button secondary">
              Chat Beheren
            </button>
          </div>

          <div className="action-card">
            <div className="card-icon">👥</div>
            <h3>Gebruikers</h3>
            <p>Beheer gebruikersaccounts en toegangsrechten</p>
            <button className="action-button secondary">
              Gebruikers Beheren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}