'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../components/AuthProvider';
import Sidebar from '../components/Sidebar';

interface ChatSettings {
  bubbleColor: string;
  bubbleTextColor: string;
  chatBackgroundColor: string;
  chatTextColor: string;
  botName: string;
  theme: 'light' | 'dark';
  welcomeMessage: string;
  chatWindowWidth: number;
  chatWindowHeight: number;
  fontFamily: string;
}

const defaultSettings: ChatSettings = {
  bubbleColor: '#de3f30',
  bubbleTextColor: '#ffffff',
  chatBackgroundColor: '#ffffff',
  chatTextColor: '#333333',
  botName: 'Saar',
  theme: 'light',
  welcomeMessage: 'Hallo! Hoe kan ik u vandaag helpen?',
  chatWindowWidth: 480,
  chatWindowHeight: 600,
  fontFamily: 'Open Sans'
};

export default function ChatBeherenPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Check if user is admin
  if (!isAuthenticated || user?.role !== 'admin') {
    router.push('/');
    return (
      <div className="dashboard-container">
        <Sidebar />
        <div className="dashboard-main-content">
          <div className="dashboard-header">
            <div className="header-content">
              <div className="welcome-section">
                <h1>Toegang Geweigerd</h1>
                <p>U heeft geen toestemming om deze pagina te bekijken</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Apply settings to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--chat-bubble-color', settings.bubbleColor);
    root.style.setProperty('--chat-bubble-text-color', settings.bubbleTextColor);
    root.style.setProperty('--chat-background-color', settings.chatBackgroundColor);
    root.style.setProperty('--chat-text-color', settings.chatTextColor);
    root.style.setProperty('--chat-window-width', `${settings.chatWindowWidth}px`);
    root.style.setProperty('--chat-window-height', `${settings.chatWindowHeight}px`);
    root.style.setProperty('--chat-font-family', settings.fontFamily);
    
    // Apply theme
    if (settings.theme === 'dark') {
      root.style.setProperty('--chat-background-color', '#1a1a1a');
      root.style.setProperty('--chat-text-color', '#ffffff');
    } else {
      root.style.setProperty('--chat-background-color', '#ffffff');
      root.style.setProperty('--chat-text-color', '#333333');
    }
  }, [settings]);

  const handleSettingChange = (key: keyof ChatSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // Save to localStorage
      localStorage.setItem('chatSettings', JSON.stringify(settings));
      
      // Trigger custom event for real-time updates
      window.dispatchEvent(new CustomEvent('chatSettingsChanged', {
        detail: { settings }
      }));
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveMessage('Instellingen opgeslagen!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Fout bij opslaan van instellingen');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('chatSettings');
    
    // Trigger custom event for real-time updates
    window.dispatchEvent(new CustomEvent('chatSettingsChanged', {
      detail: { settings: defaultSettings }
    }));
    
    setSaveMessage('Instellingen gereset naar standaardwaarden');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleBackToDashboard = () => {
    router.push('/');
  };

  return (
    <div className="dashboard-container">
      <Sidebar activeSection="chat" />
      
      <div className="dashboard-main-content">
        <div className="dashboard-header">
          <div className="header-content">
            <div className="welcome-section">
              <h1>Chat Beheren</h1>
              <p>Pas de stijl en instellingen van de chatbot aan</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="chat-beheren-content">
        <div className="settings-panel">
          <div className="settings-section">
            <h3>Chat Bubble Styling</h3>
            
            <div className="setting-group">
              <label>Bubble Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={settings.bubbleColor}
                  onChange={(e) => handleSettingChange('bubbleColor', e.target.value)}
                />
                <input
                  type="text"
                  value={settings.bubbleColor}
                  onChange={(e) => handleSettingChange('bubbleColor', e.target.value)}
                  placeholder="#de3f30"
                />
              </div>
            </div>

            <div className="setting-group">
              <label>Bubble Tekst Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={settings.bubbleTextColor}
                  onChange={(e) => handleSettingChange('bubbleTextColor', e.target.value)}
                />
                <input
                  type="text"
                  value={settings.bubbleTextColor}
                  onChange={(e) => handleSettingChange('bubbleTextColor', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>Chat Window Styling</h3>
            
            <div className="setting-group">
              <label>Bot Naam</label>
              <input
                type="text"
                value={settings.botName}
                onChange={(e) => handleSettingChange('botName', e.target.value)}
                placeholder="Saar"
              />
            </div>

            <div className="setting-group">
              <label>Welkomst Bericht</label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                placeholder="Hallo! Hoe kan ik u vandaag helpen?"
                rows={3}
              />
            </div>

            <div className="setting-group">
              <label>Thema</label>
              <select
                value={settings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
              >
                <option value="light">Licht</option>
                <option value="dark">Donker</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Lettertype</label>
              <select
                value={settings.fontFamily}
                onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
              >
                <option value="Open Sans">Open Sans (Standaard)</option>
                <option value="Roboto">Roboto</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Poppins">Poppins</option>
                <option value="Inter">Inter</option>
                <option value="Source Sans Pro">Source Sans Pro</option>
                <option value="Nunito">Nunito</option>
                <option value="Ubuntu">Ubuntu</option>
                <option value="Noto Sans">Noto Sans</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Chat Window Breedte (px)</label>
              <input
                type="number"
                value={settings.chatWindowWidth}
                onChange={(e) => handleSettingChange('chatWindowWidth', parseInt(e.target.value))}
                min="300"
                max="800"
                step="10"
              />
            </div>

            <div className="setting-group">
              <label>Chat Window Hoogte (px)</label>
              <input
                type="number"
                value={settings.chatWindowHeight}
                onChange={(e) => handleSettingChange('chatWindowHeight', parseInt(e.target.value))}
                min="400"
                max="800"
                step="10"
              />
            </div>
          </div>

          <div className="settings-actions">
            <button 
              onClick={handleSave} 
              className="save-button"
              disabled={isSaving}
            >
              {isSaving ? 'Opslaan...' : 'Instellingen Opslaan'}
            </button>
            
            <button 
              onClick={handleReset} 
              className="reset-button"
            >
              Reset naar Standaard
            </button>

            {saveMessage && (
              <div className={`save-message ${saveMessage.includes('Fout') ? 'error' : 'success'}`}>
                {saveMessage}
              </div>
            )}
          </div>
        </div>

        <div className="chat-preview">
          <h3>Voorvertoning</h3>
          <div className="preview-chat-window" style={{
            width: `${settings.chatWindowWidth}px`,
            height: `${settings.chatWindowHeight}px`,
            backgroundColor: settings.theme === 'dark' ? '#1a1a1a' : '#ffffff',
            color: settings.theme === 'dark' ? '#ffffff' : '#333333'
          }}>
            <div className="preview-chat-header" style={{
              backgroundColor: settings.bubbleColor,
              color: settings.bubbleTextColor
            }}>
              <div className="preview-chat-title">{settings.botName}</div>
              <div className="preview-connection-status">🟢 Verbonden</div>
            </div>
            
                         <div className="preview-chat-messages" style={{
               backgroundColor: settings.theme === 'dark' ? '#2a2a2a' : '#f8f8f8'
             }}>
               <div className="preview-message">
                 <div className="preview-message-content bot-message" style={{
                   backgroundColor: settings.theme === 'dark' ? '#3a3a3a' : '#ffffff',
                   color: settings.theme === 'dark' ? '#ffffff' : '#333333',
                   fontFamily: settings.fontFamily
                 }}>
                   {settings.welcomeMessage}
                 </div>
               </div>
             </div>
            
            <div className="preview-chat-input" style={{
              backgroundColor: settings.theme === 'dark' ? '#1a1a1a' : '#ffffff',
              borderTop: `1px solid ${settings.theme === 'dark' ? '#333333' : '#e0e0e0'}`
            }}>
              <input
                type="text"
                placeholder="Type uw bericht hier..."
                style={{
                  backgroundColor: settings.theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                  color: settings.theme === 'dark' ? '#ffffff' : '#333333',
                  border: `1px solid ${settings.theme === 'dark' ? '#444444' : '#e0e0e0'}`
                }}
              />
              <button style={{
                backgroundColor: settings.bubbleColor,
                color: settings.bubbleTextColor
              }}>
                Versturen
              </button>
            </div>
          </div>

                     <div className="preview-chat-bubble" style={{
             backgroundColor: settings.bubbleColor,
             color: settings.bubbleTextColor
           }}>
             <div className="preview-bubble-icon">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill={settings.theme === 'dark' ? '#333333' : 'currentColor'}/>
                 <path d="M7 9H17V11H7V9ZM7 12H14V14H7V12Z" fill={settings.theme === 'dark' ? '#333333' : 'currentColor'}/>
               </svg>
             </div>
             <div className="preview-bubble-badge" style={{
               backgroundColor: settings.bubbleTextColor,
               color: settings.bubbleColor
             }}>
               1
             </div>
           </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
} 