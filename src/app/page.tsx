'use client';
import { useAuth } from './components/AuthProvider';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import WebChat from './components/WebChat';

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  // For regular users, show the webchat directly (same as admin landing page)
  return (
    <div className="user-landing-page">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Welkom bij Elektro Scheppers</h1>
            <p>Chat met Saar, onze virtuele assistent</p>
            <div className="user-info">
              Ingelogd als: <strong>{user?.username}</strong> ({user?.email})
            </div>
          </div>
          <button onClick={logout} className="logout-button">
            Uitloggen
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <WebChat />
      </div>
    </div>
  );
}
