'use client';
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (usernameOrEmail: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isConnecting: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user database
const USERS = [
  {
    username: process.env.NEXT_PUBLIC_USERNAME,
    password: process.env.NEXT_PUBLIC_PASSWORD,
    email: process.env.NEXT_PUBLIC_EMAIL,
    role: 'admin' as const
  },
  {
    username: process.env.NEXT_PUBLIC_USERNAME2,
    password: process.env.NEXT_PUBLIC_PASSWORD2,
    email: process.env.NEXT_PUBLIC_EMAIL2,
    role: 'user' as const
  }
];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Don't restore user session on page refresh - always require fresh login
    // This ensures users are logged out when they close and reopen the website
  }, []);

  const checkBackendConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (response.ok) {
        console.log('✅ Backend connection successful');
        return true;
      } else {
        console.error('❌ Backend responded with error:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      return false;
    }
  };

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    setIsConnecting(true);
    
    try {
      // First check backend connection
      const backendConnected = await checkBackendConnection();
      
      if (!backendConnected) {
        console.log('🔄 Backend not connected, retrying...');
        
        // Retry connection up to 3 times with delays
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`🔄 Backend connection attempt ${attempt}/3`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Increasing delays: 2s, 4s, 6s
          
          const retryConnected = await checkBackendConnection();
          if (retryConnected) {
            console.log('✅ Backend connected on retry');
            break;
          }
          
          if (attempt === 3) {
            console.error('❌ Backend connection failed after 3 attempts');
            setIsConnecting(false);
            return false;
          }
        }
      }
      
      // Now check user credentials
      const foundUser = USERS.find(
        u => (u.username === usernameOrEmail || u.email === usernameOrEmail) && u.password === password
      );
      
      if (foundUser && foundUser.username && foundUser.email && foundUser.password) {
        const userWithoutPassword = {
          username: foundUser.username,
          password: foundUser.password,
          email: foundUser.email,
          role: foundUser.role
        };
        setUser(userWithoutPassword);
        setIsConnecting(false);
        return true;
      }
      
      setIsConnecting(false);
      return false;
      
    } catch (error) {
      console.error('Login error:', error);
      setIsConnecting(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    // No need to remove from localStorage since we don't save there
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isConnecting
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}