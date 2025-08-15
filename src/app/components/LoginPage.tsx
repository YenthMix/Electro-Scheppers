'use client';
import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

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