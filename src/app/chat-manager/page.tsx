'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import ChatManager from '../components/ChatManager';

export default function ChatManagerPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  // Check if user is admin
  if (!isAuthenticated || user?.role !== 'admin') {
    router.push('/');
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="header-content">
            <div className="welcome-section">
              <h1>Toegang Geweigerd</h1>
              <p>U heeft geen toestemming om deze pagina te bekijken</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ChatManager />;
} 