'use client';
import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useChat } from './ChatProvider';

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

export default function ChatManager() {
  const { user, logout } = useAuth();
  const { messages, inputValue, setInputValue, sendMessage } = useChat();
  const [settings, setSettings] = useState<ChatSettings>(defaultSettings);
  const [isEditing, setIsEditing] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

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

  const handleLogout = () => {
    logout();
  };

  const handleSettingChange = (key: keyof ChatSettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
  };

  const applyTheme = () => {
    const root = document.documentElement;
    root.style.setProperty('--chat-primary-color', settings.primaryColor);
    root.style.setProperty('--chat-secondary-color', settings.secondaryColor);
    root.style.setProperty('--chat-background-color', settings.backgroundColor);
    root.style.setProperty('--chat-text-color', settings.textColor);
    root.style.setProperty('--chat-bubble-color', settings.bubbleColor);
    root.style.setProperty('--chat-bubble-text-color', settings.bubbleTextColor);
  };

  // Apply theme whenever settings change
  useEffect(() => {
    applyTheme();
  }, [settings]);

  return (
    <div className="chat-manager-container">
      {/* Header */}
      <div className="chat-manager-header">
        <div className="header-content">
          <div className="welcome-section">
            <h1>Chat Beheren</h1>
            <p>Styling en configuratie van de chatbot</p>
            <div className="user-info">
              Ingelogd als: <strong>{user?.username}</strong> ({user?.email})
            </div>
          </div>
          <button onClick={handleLogout} className="logout-button">
            Uitloggen
          </button>
        </div>
      </div>

      <div className="chat-manager-content">
        {/* Settings Panel */}
        <div className="settings-panel">
          <div className="settings-header">
            <h2>Chat Styling</h2>
            <div className="settings-actions">
              <button 
                onClick={() => setIsEditing(!isEditing)} 
                className="edit-button"
              >
                {isEditing ? 'Opslaan' : 'Bewerken'}
              </button>
              <button onClick={resetToDefaults} className="reset-button">
                Reset
              </button>
            </div>
          </div>

          <div className="settings-form">
            <div className="setting-group">
              <label>Bot Naam</label>
              <input
                type="text"
                value={settings.botName}
                onChange={(e) => handleSettingChange('botName', e.target.value)}
                disabled={!isEditing}
                placeholder="Voer bot naam in"
              />
            </div>

            <div className="setting-group">
              <label>Welkomst Bericht</label>
              <textarea
                value={settings.welcomeMessage}
                onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                disabled={!isEditing}
                placeholder="Voer welkomst bericht in"
                rows={3}
              />
            </div>

            <div className="setting-group">
              <label>Thema</label>
              <select
                value={settings.theme}
                onChange={(e) => handleSettingChange('theme', e.target.value)}
                disabled={!isEditing}
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Primaire Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                  disabled={!isEditing}
                />
                <input
                  type="text"
                  value={settings.primaryColor}
                  onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                  disabled={!isEditing}
                  placeholder="#de3f30"
                />
              </div>
            </div>

            <div className="setting-group">
              <label>Secundaire Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                  disabled={!isEditing}
                />
                <input
                  type="text"
                  value={settings.secondaryColor}
                  onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                  disabled={!isEditing}
                  placeholder="#f4b928"
                />
              </div>
            </div>

            <div className="setting-group">
              <label>Achtergrond Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  disabled={!isEditing}
                />
                <input
                  type="text"
                  value={settings.backgroundColor}
                  onChange={(e) => handleSettingChange('backgroundColor', e.target.value)}
                  disabled={!isEditing}
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div className="setting-group">
              <label>Tekst Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => handleSettingChange('textColor', e.target.value)}
                  disabled={!isEditing}
                />
                <input
                  type="text"
                  value={settings.textColor}
                  onChange={(e) => handleSettingChange('textColor', e.target.value)}
                  disabled={!isEditing}
                  placeholder="#333333"
                />
              </div>
            </div>

            <div className="setting-group">
              <label>Chat Bubble Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={settings.bubbleColor}
                  onChange={(e) => handleSettingChange('bubbleColor', e.target.value)}
                  disabled={!isEditing}
                />
                <input
                  type="text"
                  value={settings.bubbleColor}
                  onChange={(e) => handleSettingChange('bubbleColor', e.target.value)}
                  disabled={!isEditing}
                  placeholder="#de3f30"
                />
              </div>
            </div>

            <div className="setting-group">
              <label>Chat Bubble Tekst Kleur</label>
              <div className="color-input-group">
                <input
                  type="color"
                  value={settings.bubbleTextColor}
                  onChange={(e) => handleSettingChange('bubbleTextColor', e.target.value)}
                  disabled={!isEditing}
                />
                <input
                  type="text"
                  value={settings.bubbleTextColor}
                  onChange={(e) => handleSettingChange('bubbleTextColor', e.target.value)}
                  disabled={!isEditing}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Live Chat Preview */}
        <div className="chat-preview">
          <div className="preview-header">
            <h2>Live Preview - {settings.botName}</h2>
            <p>Test de chatbot styling in real-time</p>
          </div>
          
          <div className="preview-chat-window">
            <div className="preview-chat-header">
              <div className="preview-chat-logo">
                <div className="logo-mark">
                  <div className="logo-s"></div>
                  <div className="logo-square"></div>
                </div>
                <div className="logo-text">
                  <span>ELEKTRO</span>
                  <span>SCHEPPERS</span>
                </div>
              </div>
              <div className="preview-chat-title">{settings.botName}</div>
              <div className="preview-connection-status">🟢 Verbonden</div>
            </div>
            
            <div className="preview-chat-messages">
              <div className="message bot-message">
                <div className="message-content">
                  <div className="message-text">{settings.welcomeMessage}</div>
                </div>
              </div>
              {messages.slice(1).map((message) => (
                <div 
                  key={message.id} 
                  className={`message ${message.isBot ? 'bot-message' : 'user-message'}`}
                >
                  <div className="message-content">
                    {message.text && <div className="message-text">{message.text}</div>}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="preview-chat-input">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type uw bericht hier..."
                className="preview-message-input"
              />
              <button 
                onClick={handleSendMessage} 
                className="preview-send-button"
              >
                Versturen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 