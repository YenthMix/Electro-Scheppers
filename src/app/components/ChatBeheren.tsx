'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';

interface ChatSettings {
  botName: string;
  welcomeMessage: string;
  theme: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  bubbleColor: string;
  bubbleTextColor: string;
}

export default function ChatBeheren() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<ChatSettings>({
    botName: 'Saar',
    welcomeMessage: 'Hallo! Hoe kan ik u vandaag helpen?',
    theme: 'light',
    primaryColor: '#de3f30',
    secondaryColor: '#f4b928',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    bubbleColor: '#de3f30',
    bubbleTextColor: '#ffffff'
  });

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatSettings', JSON.stringify(settings));
  }, [settings]);

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

  const handleBackToDashboard = () => {
    router.push('/');
  };

  const handleSettingChange = (key: keyof ChatSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    const defaultSettings: ChatSettings = {
      botName: 'Saar',
      welcomeMessage: 'Hallo! Hoe kan ik u vandaag helpen?',
      theme: 'light',
      primaryColor: '#de3f30',
      secondaryColor: '#f4b928',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      bubbleColor: '#de3f30',
      bubbleTextColor: '#ffffff'
    };
    setSettings(defaultSettings);
  };

  return (
    <div className="chat-beheren-container">
      <div className="chat-beheren-header">
        <button onClick={handleBackToDashboard} className="back-button">
          ← Terug naar Dashboard
        </button>
        <h1>Chat Beheren</h1>
        <p>Pas de stijl en instellingen van de chatbot aan</p>
      </div>

      <div className="chat-beheren-content">
        <div className="settings-panel">
          <div className="settings-section">
            <h3>🤖 Bot Instellingen</h3>
            
            <div className="setting-group">
              <label htmlFor="botName">Bot Naam</label>
              <input
                type="text"
                id="botName"
                value={settings.botName}
                onChange={(e) => handleSettingChange('botName', e.target.value)}
                placeholder="Voer bot naam in"
              />
            </div>

            <div className="setting-group">
              <label htmlFor="welcomeMessage">Welkomstbericht</label>
              <textarea
                id="welcomeMessage"
                value={settings.welcomeMessage}
                onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                placeholder="Voer welkomstbericht in"
                rows={3}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>🎨 Thema & Kleuren</h3>
            
            <div className="setting-group">
              <label htmlFor="theme">Thema</label>
              <select
                id="theme"
                value={settings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
              >
                <option value="light">Licht</option>
                <option value="dark">Donker</option>
              </select>
            </div>

            <div className="setting-group">
              <label htmlFor="primaryColor">Primaire Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  id="primaryColor"
                  value={settings.primaryColor}
                  onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                  placeholder="#de3f30"
                />
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="secondaryColor">Secundaire Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  id="secondaryColor"
                  value={settings.secondaryColor}
                  onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                  placeholder="#f4b928"
                />
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="backgroundColor">Achtergrondkleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  id="backgroundColor"
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                />
                <input
                  type="text"
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="setting-group">
              <label htmlFor="textColor">Tekstkleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  id="textColor"
                  value={settings.textColor}
                  onChange={(e) => handleSettingChange('textColor', e.target.value)}
                />
                <input
                  type="text"
                  value={settings.textColor}
                  onChange={(e) => handleSettingChange('textColor', e.target.value)}
                  placeholder="#333333"
                />
              </div>
            </div>
          </div>

          <div className="settings-section">
            <h3>💬 Chat Bubble</h3>
            
            <div className="setting-group">
              <label htmlFor="bubbleColor">Bubble Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  id="bubbleColor"
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
              <label htmlFor="bubbleTextColor">Bubble Tekstkleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  id="bubbleTextColor"
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

          <div className="settings-actions">
            <button onClick={resetToDefaults} className="reset-button">
              🔄 Reset naar Standaard
            </button>
          </div>
        </div>

        <div className="chat-preview">
          <h3>👁️ Voorvertoning</h3>
          <div 
            className="preview-chat-window"
            style={{
              backgroundColor: settings.backgroundColor,
              color: settings.textColor,
              borderColor: settings.primaryColor
            }}
          >
            <div 
              className="preview-chat-header"
              style={{ backgroundColor: settings.primaryColor, color: settings.bubbleTextColor }}
            >
              <div className="preview-chat-title">{settings.botName}</div>
              <div className="preview-connection-status">🟢 Verbonden</div>
            </div>
            
            <div className="preview-chat-messages">
              <div className="preview-message bot-message">
                <div 
                  className="preview-message-content"
                  style={{ 
                    backgroundColor: settings.theme === 'dark' ? '#2a2a2a' : '#ffffff',
                    color: settings.textColor,
                    borderColor: settings.secondaryColor
                  }}
                >
                  {settings.welcomeMessage}
                </div>
              </div>
            </div>
            
            <div 
              className="preview-chat-input"
              style={{ borderColor: settings.primaryColor }}
            >
              <input
                type="text"
                placeholder="Type uw bericht hier..."
                disabled
                style={{ 
                  backgroundColor: settings.theme === 'dark' ? '#2a2a2a' : '#ffffff',
                  color: settings.textColor
                }}
              />
              <button 
                style={{ 
                  backgroundColor: settings.primaryColor,
                  color: settings.bubbleTextColor
                }}
                disabled
              >
                Versturen
              </button>
            </div>
          </div>

          <div 
            className="preview-chat-bubble"
            style={{
              backgroundColor: settings.bubbleColor,
              color: settings.bubbleTextColor
            }}
          >
            <div className="preview-bubble-icon">💬</div>
            <div 
              className="preview-bubble-badge"
              style={{
                backgroundColor: settings.secondaryColor,
                color: settings.textColor
              }}
            >
              1
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 