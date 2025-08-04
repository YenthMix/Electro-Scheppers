'use client';
import { useState, useEffect } from 'react';

interface BackendStatus {
  isConnected: boolean;
  isLoading: boolean;
  lastCheck: Date | null;
  error: string | null;
}

export default function BackendStatusChecker() {
  const [status, setStatus] = useState<BackendStatus>({
    isConnected: false,
    isLoading: true,
    lastCheck: null,
    error: null
  });

  const checkBackendStatus = async () => {
    setStatus(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setStatus({
          isConnected: true,
          isLoading: false,
          lastCheck: new Date(),
          error: null
        });
      } else {
        throw new Error(`Backend responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Backend status check failed:', error);
      setStatus({
        isConnected: false,
        isLoading: false,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkBackendStatus();

    // Check every 30 seconds
    const interval = setInterval(checkBackendStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  // Only show warning if backend is disconnected and we've checked at least once
  if (status.isLoading || status.isConnected || !status.lastCheck) {
    return null;
  }

  return (
    <div className="backend-status-warning">
      <div className="warning-content">
        <div className="warning-icon">⚠️</div>
        <div className="warning-text">
          <strong>Server Verbinding Probleem</strong>
          <p>Kan geen verbinding maken met de backend server. Sommige functies werken mogelijk niet correct.</p>
          <button onClick={checkBackendStatus} className="retry-button">
            Opnieuw Proberen
          </button>
        </div>
      </div>
    </div>
  );
} 