'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useChat } from '../components/ChatProvider';

export default function ChatBeherenPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { isChatOpen, toggleChat } = useChat();
  
  // Chat styling state
  const [chatSettings, setChatSettings] = useState({
    botName: 'Saar',
    primaryColor: '#de3f30',
    secondaryColor: '#f4b928',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    theme: 'light', // 'light' or 'dark'
    welcomeMessage: 'Hallo! Hoe kan ik u vandaag helpen?',
    chatPosition: 'right', // 'right' or 'left'
    chatSize: 'medium', // 'small', 'medium', 'large'
    borderRadius: '20px',
    fontFamily: 'Open Sans'
  });

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

  const handleSaveSettings = () => {
    // Save settings to localStorage for now (in real app, save to database)
    localStorage.setItem('chatSettings', JSON.stringify(chatSettings));
    alert('Chat instellingen opgeslagen!');
  };

  const handleResetSettings = () => {
    const defaultSettings = {
      botName: 'Saar',
      primaryColor: '#de3f30',
      secondaryColor: '#f4b928',
      backgroundColor: '#ffffff',
      textColor: '#333333',
      theme: 'light',
      welcomeMessage: 'Hallo! Hoe kan ik u vandaag helpen?',
      chatPosition: 'right',
      chatSize: 'medium',
      borderRadius: '20px',
      fontFamily: 'Open Sans'
    };
    setChatSettings(defaultSettings);
    localStorage.setItem('chatSettings', JSON.stringify(defaultSettings));
    alert('Chat instellingen gereset naar standaard!');
  };

  // Load saved settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      setChatSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Apply settings to chat (this would be passed to ChatProvider in real app)
  useEffect(() => {
    // Apply CSS variables for styling
    const root = document.documentElement;
    root.style.setProperty('--chat-primary-color', chatSettings.primaryColor);
    root.style.setProperty('--chat-secondary-color', chatSettings.secondaryColor);
    root.style.setProperty('--chat-background-color', chatSettings.backgroundColor);
    root.style.setProperty('--chat-text-color', chatSettings.textColor);
    root.style.setProperty('--chat-border-radius', chatSettings.borderRadius);
    root.style.setProperty('--chat-font-family', chatSettings.fontFamily);
  }, [chatSettings]);

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
            <h3>🎨 Uiterlijk</h3>
            
            <div className="setting-group">
              <label>Bot Naam:</label>
              <input
                type="text"
                value={chatSettings.botName}
                onChange={(e) => setChatSettings(prev => ({ ...prev, botName: e.target.value }))}
                placeholder="Voer bot naam in"
              />
            </div>

            <div className="setting-group">
              <label>Primaire Kleur:</label>
              <input
                type="color"
                value={chatSettings.primaryColor}
                onChange={(e) => setChatSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
              />
            </div>

            <div className="setting-group">
              <label>Secundaire Kleur:</label>
              <input
                type="color"
                value={chatSettings.secondaryColor}
                onChange={(e) => setChatSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
              />
            </div>

            <div className="setting-group">
              <label>Achtergrond Kleur:</label>
              <input
                type="color"
                value={chatSettings.backgroundColor}
                onChange={(e) => setChatSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
              />
            </div>

            <div className="setting-group">
              <label>Tekst Kleur:</label>
              <input
                type="color"
                value={chatSettings.textColor}
                onChange={(e) => setChatSettings(prev => ({ ...prev, textColor: e.target.value }))}
              />
            </div>

            <div className="setting-group">
              <label>Afgeronde Hoeken:</label>
              <select
                value={chatSettings.borderRadius}
                onChange={(e) => setChatSettings(prev => ({ ...prev, borderRadius: e.target.value }))}
              >
                <option value="0px">Geen</option>
                <option value="10px">Zacht</option>
                <option value="20px">Medium</option>
                <option value="30px">Rond</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Lettertype:</label>
              <select
                value={chatSettings.fontFamily}
                onChange={(e) => setChatSettings(prev => ({ ...prev, fontFamily: e.target.value }))}
              >
                <option value="Open Sans">Open Sans</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>🌙 Thema</h3>
            
            <div className="setting-group">
              <label>Thema:</label>
              <select
                value={chatSettings.theme}
                onChange={(e) => setChatSettings(prev => ({ ...prev, theme: e.target.value }))}
              >
                <option value="light">Licht</option>
                <option value="dark">Donker</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Chat Positie:</label>
              <select
                value={chatSettings.chatPosition}
                onChange={(e) => setChatSettings(prev => ({ ...prev, chatPosition: e.target.value }))}
              >
                <option value="right">Rechts</option>
                <option value="left">Links</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Chat Grootte:</label>
              <select
                value={chatSettings.chatSize}
                onChange={(e) => setChatSettings(prev => ({ ...prev, chatSize: e.target.value }))}
              >
                <option value="small">Klein</option>
                <option value="medium">Medium</option>
                <option value="large">Groot</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>💬 Berichten</h3>
            
            <div className="setting-group">
              <label>Welkomst Bericht:</label>
              <textarea
                value={chatSettings.welcomeMessage}
                onChange={(e) => setChatSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                placeholder="Voer het welkomst bericht in"
                rows={3}
              />
            </div>
          </div>

          <div className="settings-actions">
            <button onClick={handleSaveSettings} className="save-button">
              💾 Instellingen Opslaan
            </button>
            <button onClick={handleResetSettings} className="reset-button">
              🔄 Reset naar Standaard
            </button>
          </div>
        </div>

        <div className="preview-panel">
          <h3>👀 Voorvertoning</h3>
          <div className="preview-container">
            <div className="preview-chat" style={{
              backgroundColor: chatSettings.backgroundColor,
              color: chatSettings.textColor,
              borderRadius: chatSettings.borderRadius,
              fontFamily: chatSettings.fontFamily,
              border: `2px solid ${chatSettings.primaryColor}`
            }}>
              <div className="preview-header" style={{ backgroundColor: chatSettings.primaryColor, color: '#ffffff' }}>
                <div className="preview-bot-name">{chatSettings.botName}</div>
                <div className="preview-status">🟢 Online</div>
              </div>
              <div className="preview-messages">
                <div className="preview-message bot" style={{ backgroundColor: chatSettings.secondaryColor }}>
                  {chatSettings.welcomeMessage}
                </div>
                <div className="preview-message user" style={{ backgroundColor: chatSettings.primaryColor, color: '#ffffff' }}>
                  Hallo! Ik heb een vraag.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 