'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isConnecting } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(usernameOrEmail, password);
      
      if (!success) {
        setError('Ongeldige gebruikersnaam/email of wachtwoord of backend niet bereikbaar');
      }
    } catch (error) {
      setError('Er is een probleem opgetreden bij het inloggen. Probeer het opnieuw.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {isConnecting && (
        <div className="connecting-overlay">
          <div className="connecting-content">
            <div className="connecting-spinner">
              <div className="spinner"></div>
            </div>
            <h2>Verbinden met Backend</h2>
            <p>Bezig met het controleren van de serververbinding...</p>
            <div className="connecting-steps">
              <div className="step">🔍 Controleren van backend verbinding</div>
              <div className="step">🔄 Retry pogingen indien nodig</div>
              <div className="step">✅ Verbinding tot stand gebracht</div>
            </div>
          </div>
        </div>
      )}
      
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
            disabled={isLoading || isConnecting}
          >
            {isConnecting ? 'Verbinden met Backend...' : isLoading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  );
}