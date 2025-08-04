'use client';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const { login } = useAuth();

  // Check backend status on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('disconnected');
        }
      } catch (error) {
        setBackendStatus('disconnected');
      }
    };

    checkBackendStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // First check backend connectivity
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!backendResponse.ok) {
        throw new Error('Backend connection failed');
      }

      // Backend is connected, now try to authenticate
      const success = login(usernameOrEmail, password);
      
      if (!success) {
        setError('Ongeldige gebruikersnaam/email of wachtwoord');
      }
      // If successful, user will be redirected automatically by the AuthProvider
      
    } catch (error) {
      console.error('Login error:', error);
      setError('Kan geen verbinding maken met de server. Controleer uw internetverbinding en probeer het opnieuw.');
    } finally {
      setIsLoading(false);
    }
  };

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
            disabled={isLoading || backendStatus === 'disconnected'}
          >
            {isLoading ? (
              <div className="loading-content">
                <div className="loading-spinner"></div>
                <span>Verbinden met server...</span>
              </div>
            ) : (
              'Inloggen'
            )}
          </button>

          {/* Backend Status Indicator */}
          <div className="backend-status">
            <div className={`status-indicator ${backendStatus}`}>
              {backendStatus === 'checking' && '🟡 Server status controleren...'}
              {backendStatus === 'connected' && '🟢 Server verbonden'}
              {backendStatus === 'disconnected' && '🔴 Server niet bereikbaar'}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}