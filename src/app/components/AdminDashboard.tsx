'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Sidebar from './Sidebar';
import WebChat from './WebChat';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      
      <div className="dashboard-main-content">
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
          <WebChat />
        </div>
      </div>
    </div>
  );
}