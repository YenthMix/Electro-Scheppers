'use client';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const { login } = useAuth();

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    setBackendStatus('checking');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        setBackendStatus('connected');
        setIsCheckingBackend(false);
      } else {
        throw new Error('Backend not responding');
      }
    } catch (error) {
      setBackendStatus('disconnected');
      // Retry after 3 seconds
      setTimeout(checkBackendConnection, 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = login(usernameOrEmail, password);
    
    if (!success) {
      setError('Ongeldige gebruikersnaam/email of wachtwoord');
    }
    
    setIsLoading(false);
  };

  // Show loading screen while checking backend
  if (isCheckingBackend) {
    return (
      <div className="login-container">
        <div className="login-content">
          <div className="login-header">
            <div className="login-logo">
              <div className="logo-mark">
                <div className="logo-s"></div>
                <div className="logo-square"></div>
              </div>
              <div className="logo-text">
                <span>ELEKTRO</span>
                <span>SCHEPPERS</span>
              </div>
            </div>
            <h1>Verbinden...</h1>
            <p>Bezig met verbinden met de server</p>
          </div>

          <div className="backend-status-container">
            <div className={`backend-status ${backendStatus}`}>
              {backendStatus === 'checking' && (
                <>
                  <div className="loading-spinner"></div>
                  <p>Controleren van serververbinding...</p>
                </>
              )}
              {backendStatus === 'disconnected' && (
                <>
                  <div className="error-icon">⚠️</div>
                  <p>Server niet bereikbaar. Opnieuw proberen...</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-header">
          <div className="login-logo">
            <div className="logo-mark">
              <div className="logo-s"></div>
              <div className="logo-square"></div>
            </div>
            <div className="logo-text">
              <span>ELEKTRO</span>
              <span>SCHEPPERS</span>
            </div>
          </div>
          <h1>Welkom</h1>
          <p>Log in om door te gaan</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="usernameOrEmail">Gebruikersnaam of Email</label>
            <input
              type="text"
              id="usernameOrEmail"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="Voer uw gebruikersnaam of email in"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Wachtwoord</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Voer uw wachtwoord in"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}