/**
 * backend.js
 * Backend server for Botpress Chat API integration (Direct - No N8N)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();

// Load environment variables
const API_ID = process.env.API_ID;
const BOTPRESS_API_TOKEN = process.env.BOTPRESS_BEARER_TOKEN;
const BOT_ID = process.env.BOTPRESS_BOT_ID;
const WORKSPACE_ID = process.env.BOTPRESS_WORKSPACE_ID;
const KNOWLEDGE_BASE_ID = process.env.BOTPRESS_KNOWLEDGE_BASE_ID;
const BASE_URL = `https://chat.botpress.cloud/${API_ID}`;

console.log('🚀 Backend starting with Botpress Chat API integration...');
console.log('📋 Configuration:');
console.log(`   API_ID: ${API_ID ? 'Set' : 'Missing'}`);
console.log(`   BOT_ID: ${BOT_ID ? 'Set' : 'Missing'}`);
console.log(`   WORKSPACE_ID: ${WORKSPACE_ID ? 'Set' : 'Missing'}`);
console.log(`   BASE_URL: ${BASE_URL}`);

// Configure CORS
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (
      origin.includes('vercel.app') || 
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin === process.env.VERCEL_LINK ||
      origin === process.env.VERCEL_LINK_2
    ) {
      return callback(null, true);
    }
    
    return callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-key']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Message storage for polling logic (adapted from reference.js)
const botMessages = new Map(); // conversationId -> { messages: [...], lastDelivered: timestamp }
const globalMessages = {}; // conversationId -> messages array
const userMessages = new Map(); // conversationId -> user message data

// ============================================================================
// BOTPRESS CHAT API ENDPOINTS
// ============================================================================

/**
 * POST /api/user
 * Creates a new user in Botpress and returns the user object and userKey (JWT).
 */
app.post('/api/user', async (req, res) => {
  try {
    console.log('🔵 Creating new Botpress user...');
    
    const response = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error(`Botpress user creation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ User created successfully:', data);
    
    if (!data.user || !data.key) {
      return res.status(500).json({ error: 'User or user key missing in Botpress response', data });
    }
    
    res.json({ user: data.user, userKey: data.key });
  } catch (err) {
    console.error('❌ Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/conversation
 * Creates a new conversation for a user.
 */
app.post('/api/conversation', async (req, res) => {
  const { userKey } = req.body;
  
  try {
    console.log('🔵 Creating new conversation...');
    
    const response = await fetch(`${BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'x-user-key': userKey
      },
      body: JSON.stringify({ body: {} })
    });

    if (!response.ok) {
      throw new Error(`Conversation creation failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Conversation created successfully:', data);
    
    if (!data.conversation || !data.conversation.id) {
      return res.status(500).json({ error: 'Conversation missing in Botpress response', data });
    }
    
    res.json({ conversation: data.conversation });
  } catch (err) {
    console.error('❌ Error creating conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/track-user-message
 * Track user messages before sending to Botpress (adapted from reference.js)
 */
app.post('/api/track-user-message', async (req, res) => {
  const { conversationId, text } = req.body;
  const userTrackingTimestamp = new Date().toISOString();
  console.log(`🔵 TRACKING USER MESSAGE at ${userTrackingTimestamp}: "${text}" for conversation ${conversationId}`);
  
  if (!conversationId || !text) {
    console.log('❌ TRACKING FAILED: Missing conversationId or text');
    return res.status(400).json({ error: 'Missing conversationId or text' });
  }
  
  // Clean up any previous state for this conversation
  console.log(`🧹 CLEANING UP PREVIOUS STATE for conversation ${conversationId}`);
  
  if (botMessages.has(conversationId)) {
    const oldConversationData = botMessages.get(conversationId);
    if (oldConversationData && oldConversationData.deliveryTimeoutId) {
      clearTimeout(oldConversationData.deliveryTimeoutId);
      console.log(`   ✅ Cleared old delivery timeout`);
    }
    botMessages.delete(conversationId);
    console.log(`   ✅ Removed old bot messages`);
  }
  
  if (globalMessages[conversationId]) {
    delete globalMessages[conversationId];
    console.log(`   ✅ Cleared global message storage`);
  }
  
  // Store user message with timestamp
  userMessages.set(conversationId, {
    text: text,
    timestamp: Date.now(),
    trackedAt: userTrackingTimestamp
  });
  
  console.log(`✅ USER MESSAGE TRACKED SUCCESSFULLY at ${userTrackingTimestamp}. Total tracked: ${userMessages.size}`);
  console.log(`   Stored: "${text}" for conversation ${conversationId}`);
  console.log(`   State cleaned and ready for new message cycle`);
  
  res.json({ success: true });
});

/**
 * POST /api/message
 * Sends a message to Botpress and starts monitoring for responses.
 */
app.post('/api/message', async (req, res) => {
  const { conversationId, text, userKey } = req.body;
  
  try {
    console.log(`🔵 Sending message to Botpress: "${text}"`);
    
    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'x-user-key': userKey
      },
      body: JSON.stringify({
        payload: { type: 'text', text },
        conversationId
      })
    });

    if (!response.ok) {
      throw new Error(`Message sending failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Message sent successfully:', data);
    
    // Start monitoring for bot responses with timeout
    startBotResponseMonitoring(conversationId, userKey);
    
    res.json(data);
  } catch (err) {
    console.error('❌ Error sending message:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Function to start monitoring Botpress for bot responses
 */
function startBotResponseMonitoring(conversationId, userKey) {
  console.log(`🔍 Starting bot response monitoring for conversation: ${conversationId}`);
  
  // Check for new messages every 2 seconds
  const monitorInterval = setInterval(async () => {
    try {
      const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
        headers: {
          'accept': 'application/json',
          'x-user-key': userKey
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          // Get the tracked user message for this conversation
          const trackedUserMessage = userMessages.get(conversationId);
          
          // Filter for new bot messages (messages that are not from the user)
          const newBotMessages = data.messages
            .filter(msg => {
              // Skip user messages and messages already processed
              return msg.userId !== msg.conversationId && // Not a user message
                     (!trackedUserMessage || msg.payload?.text !== trackedUserMessage.text) && // Not the tracked user message
                     msg.payload?.text && // Has text content
                     !globalMessages[conversationId]?.some(stored => stored.id === msg.id); // Not already stored
            })
            .map(msg => ({
              id: msg.id,
              text: msg.payload?.text || null,
              image: msg.payload?.image || null,
              timestamp: new Date(msg.createdAt).getTime(),
              receivedAt: new Date().toISOString(),
              delivered: false
            }));

          if (newBotMessages.length > 0) {
            console.log(`📝 Found ${newBotMessages.length} new bot messages for conversation: ${conversationId}`);
            
            // Store messages in global storage
            if (!globalMessages[conversationId]) {
              globalMessages[conversationId] = [];
            }
            globalMessages[conversationId].push(...newBotMessages);
            
            // Set timeout to finalize message collection (5 seconds)
            if (global.conversationTimeouts && global.conversationTimeouts[conversationId]) {
              clearTimeout(global.conversationTimeouts[conversationId]);
            }
            
            if (!global.conversationTimeouts) {
              global.conversationTimeouts = {};
            }
            
            global.conversationTimeouts[conversationId] = setTimeout(() => {
              finalizeMessages(conversationId);
              clearInterval(monitorInterval);
            }, 5000);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error monitoring bot responses for ${conversationId}:`, error);
    }
  }, 2000);

  // Stop monitoring after 30 seconds to prevent infinite polling
  setTimeout(() => {
    clearInterval(monitorInterval);
    console.log(`⏰ Stopped monitoring for conversation ${conversationId} after 30 seconds`);
  }, 30000);
}

/**
 * Function to finalize collected messages and prepare for delivery
 */
function finalizeMessages(conversationId) {
  console.log(`🎯 Finalizing messages for conversation: ${conversationId}`);
  
  const finalMessages = globalMessages[conversationId] || [];
  console.log(`📋 Final message count: ${finalMessages.length} messages`);
  
  if (finalMessages.length > 0) {
    // Sort messages by timestamp
    finalMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Store in botMessages for delivery
    let conversationData = botMessages.get(conversationId);
    if (!conversationData) {
      conversationData = {
        messages: [],
        lastDelivered: 0,
        allMessagesReceived: false,
        deliveryTimeoutId: null
      };
      botMessages.set(conversationId, conversationData);
    }
    
    conversationData.messages = finalMessages;
    conversationData.allMessagesReceived = true;
    conversationData.deliveryTimeoutId = null;
    
    console.log(`✅ ${finalMessages.length} messages ready for delivery in timestamp order`);
  }
  
  // Clean up tracking
  userMessages.delete(conversationId);
  if (global.conversationTimeouts && global.conversationTimeouts[conversationId]) {
    delete global.conversationTimeouts[conversationId];
  }
}

/**
 * GET /api/bot-response/:conversationId
 * Get bot messages for frontend (adapted from reference.js)
 */
app.get('/api/bot-response/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    let conversationData = botMessages.get(conversationId);
    
    // Fallback to global storage if Map data is missing
    if (!conversationData && globalMessages[conversationId]) {
      console.log(`📤 FALLBACK: Found global storage for conversation: ${conversationId}`);
      
      const stillCollecting = global.conversationTimeouts && global.conversationTimeouts[conversationId];
      
      conversationData = {
        messages: globalMessages[conversationId],
        allMessagesReceived: !stillCollecting,
        lastDelivered: 0,
        deliveryTimeoutId: null
      };
      
      console.log(`📤 FALLBACK: Using global storage with ${conversationData.messages.length} messages, stillCollecting: ${stillCollecting}`);
    }
    
    if (conversationData && conversationData.messages.length > 0) {
      if (conversationData.allMessagesReceived) {
        const undeliveredMessages = conversationData.messages
          .filter(msg => !msg.delivered)
          .sort((a, b) => a.timestamp - b.timestamp);
        
        if (undeliveredMessages.length > 0) {
          const deliveryTimestamp = new Date().toISOString();
          console.log(`📤 Sending ALL ${undeliveredMessages.length} bot messages to frontend at ${deliveryTimestamp}:`);
          
          // Mark messages as delivered
          undeliveredMessages.forEach(msg => {
            msg.delivered = true;
          });
      
          res.json({ 
            success: true, 
            messages: undeliveredMessages
          });
        } else {
          console.log(`❌ ALL MESSAGES ALREADY DELIVERED for conversation: ${conversationId}`);
          res.json({ 
            success: false, 
            message: 'All messages already delivered' 
          });
        }
      } else {
        const timeoutExists = global.conversationTimeouts && global.conversationTimeouts[conversationId];
        console.log(`⏳ Still collecting messages for conversation: ${conversationId}`);
        res.json({ 
          success: false, 
          message: 'Still collecting messages',
          messagesReceived: conversationData.messages.length,
          timeoutActive: !!timeoutExists
        });
      }
    } else {
      console.log(`❌ NO BOT MESSAGES FOUND for conversation: ${conversationId}`);
      res.json({ 
        success: false, 
        message: 'No bot messages available' 
      });
    }
  } catch (error) {
    console.error('❌ Error getting bot messages:', error);
    res.status(500).json({ error: 'Failed to get bot messages' });
  }
});

/**
 * GET /api/messages
 * Fetches all messages for a conversation (legacy endpoint, keeping for compatibility).
 */
app.get('/api/messages', async (req, res) => {
  const { conversationId, userKey } = req.query;
  
  try {
    console.log(`🔍 Fetching messages for conversation: ${conversationId}`);
    
    const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
      headers: {
        'accept': 'application/json',
        'x-user-key': userKey
      }
    });

    if (!response.ok) {
      throw new Error(`Messages fetch failed: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.messages?.length || 0} messages`);
    
    res.json(data);
  } catch (err) {
    console.error('❌ Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// FILE UPLOAD ENDPOINTS (Keep existing functionality)
// ============================================================================

// File upload configuration
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.originalname}`;
    cb(null, fileName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Document upload endpoint - Upload to Botpress Knowledge Base
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📁 File upload received: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`📁 File type: ${req.file.mimetype}`);
    
    // Register file with Botpress using correct format
    const timestamp = Date.now();
    const filename = req.file.originalname;
    // Handle KB ID format - add "kb-" prefix only if not already present
    const kbIdForKey = KNOWLEDGE_BASE_ID.startsWith('kb-') ? KNOWLEDGE_BASE_ID : `kb-${KNOWLEDGE_BASE_ID}`;
    const fileKey = `${kbIdForKey}/${timestamp}-${filename}`; // Correct format from documentation
    const title = req.body.title || filename;
    
    console.log(`📝 Registering file with key: ${fileKey}`);
    
    const registerRes = await fetch('https://api.botpress.cloud/v1/files', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
        'x-bot-id': BOT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: fileKey,
        contentType: req.file.mimetype,
        size: req.file.size,
        index: true, // REQUIRED for indexing
        accessPolicies: ['public_content'],
        tags: {
          source: 'knowledge-base',    // REQUIRED
          kbId: KNOWLEDGE_BASE_ID.replace(/^kb-/, ''),     // REQUIRED - use just the ID part
          title: title,                // Recommended
          category: 'support',
          uploadedVia: 'api'
        }
      })
    });

    if (!registerRes.ok) {
      const errorText = await registerRes.text();
      console.error(`❌ File registration failed: ${registerRes.status}`);
      console.error(`   Error details: ${errorText}`);
      throw new Error(`File registration failed: ${registerRes.status} - ${errorText}`);
    }

    const registerData = await registerRes.json();
    const fileObj = registerData.file || registerData;
    const uploadUrl = fileObj.uploadUrl;
    const fileId = fileObj.id;
    
    if (!uploadUrl || !fileId) {
      throw new Error('No uploadUrl or fileId in Botpress response');
    }
    console.log(`✅ File metadata registered. File ID: ${fileId}`);

    // Upload file content to the provided URL
    const fileBuffer = fs.readFileSync(req.file.path);
    const uploadContentRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': req.file.mimetype
      },
      body: fileBuffer
    });

    if (!uploadContentRes.ok) {
      throw new Error(`File content upload failed: ${uploadContentRes.status}`);
    }
    
    console.log(`✅ File content uploaded to storage.`);

    // Clean up temporary file
    fs.unlinkSync(req.file.path);
    console.log(`🧹 Temporary file cleaned up: ${req.file.path}`);

    res.json({ 
      success: true, 
      message: 'File uploaded to knowledge base successfully',
      fileId: fileId,
      fileName: filename,
      fileKey: fileKey,
      title: title
    });
    
  } catch (error) {
    console.error('❌ File upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log(`🧹 Cleaned up temporary file after error: ${req.file.path}`);
    }
    res.status(500).json({ 
      error: error.message || 'Failed to upload file to knowledge base' 
    });
  }
});

// List documents in knowledge base (using reference.js approach)
app.get('/api/documents', async (req, res) => {
  try {
    console.log('📄 Fetching documents from Botpress Knowledge Base...');
    console.log(`   Using exact reference.js approach with tags filtering`);
    
    // Use the exact same approach as reference.js - filter by tags in API call
    const url = new URL('https://api.botpress.cloud/v1/files');
    url.searchParams.append('tags[category]', 'support');
    url.searchParams.append('tags[source]', 'knowledge-base');
    url.searchParams.append('limit', '100');
    
    console.log(`📄 Fetching from: ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
        'x-bot-id': BOT_ID,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`❌ Botpress API error: ${response.status}`);
      const errorText = await response.text();
      console.error(`   Error details: ${errorText}`);
      return res.status(500).json({ 
        success: false, 
        error: `Botpress API error: ${response.status}`, 
        details: errorText 
      });
    }

    const data = await response.json();
    const files = data.files || data;
    console.log('📋 Botpress KB files response:', files);
    
    // Return files in the same format as reference.js
    res.json({ success: true, files });
    
  } catch (error) {
    console.error('❌ Botpress API error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message, 
      details: error.response?.data 
    });
  }
});

// Delete document endpoint - Delete from Botpress Knowledge Base
app.delete('/api/documents/:id', async (req, res) => {
  try {
    const fileId = req.params.id;
    console.log(`🗑️ Deleting file from Botpress: ${fileId}`);
    
    const deleteRes = await fetch(`https://api.botpress.cloud/v1/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
        'x-bot-id': BOT_ID,
        'Content-Type': 'application/json'
      }
    });

    if (!deleteRes.ok) {
      const errorText = await deleteRes.text();
      console.error(`❌ Botpress delete error: ${deleteRes.status}`);
      console.error(`   Error details: ${errorText}`);
      
      return res.status(deleteRes.status).json({ 
        success: false, 
        error: `Failed to delete file: ${deleteRes.status}`,
        details: errorText
      });
    }

    console.log(`✅ File deleted successfully: ${fileId}`);
    res.json({ success: true });

  } catch (error) {
    console.error('❌ Error deleting document from Botpress:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Health check with message storage info
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Elektro Scheppers Backend',
    version: '2.0.0 - Direct Botpress Integration with Message Polling',
    activeConversations: {
      botMessages: botMessages.size,
      userMessages: userMessages.size,
      totalBotMessages: Array.from(botMessages.values()).reduce((total, conv) => total + conv.messages.length, 0)
    }
  });
});

// Debug endpoint to clear all state
app.post('/api/debug/clear-all', async (req, res) => {
  console.log('🧹 FORCE CLEARING ALL STATE');
  
  const beforeCounts = {
    botMessages: botMessages.size,
    userMessages: userMessages.size,
    totalBotMessages: Array.from(botMessages.values()).reduce((total, conv) => total + conv.messages.length, 0)
  };
  
  botMessages.clear();
  userMessages.clear();
  
  // Clear global storage
  for (const key in globalMessages) {
    delete globalMessages[key];
  }
  
  // Clear timeouts
  if (global.conversationTimeouts) {
    for (const timeoutId of Object.values(global.conversationTimeouts)) {
      if (timeoutId) clearTimeout(timeoutId);
    }
    global.conversationTimeouts = {};
  }
  
  console.log(`✅ Cleared all state. Before: ${JSON.stringify(beforeCounts)}, After: all 0`);
  
  res.json({ 
    success: true,
    message: 'All state cleared',
    clearedCounts: beforeCounts,
    timestamp: Date.now()
  });
});

// Debug endpoint to see stored responses
app.get('/api/debug/stored-responses', async (req, res) => {
  const allBotMessages = {};
  const allUserMessages = {};
  
  for (const [key, value] of botMessages.entries()) {
    allBotMessages[key] = {
      messageCount: value.messages.length,
      lastDelivered: value.lastDelivered,
      allMessagesReceived: value.allMessagesReceived,
      hasDeliveryTimeout: !!value.deliveryTimeoutId,
      messages: value.messages.map(msg => ({ 
        text: msg.text ? msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '') : null,
        hasImage: !!msg.image,
        imageType: msg.image ? typeof msg.image : null,
        timestamp: msg.timestamp,
        receivedAt: msg.receivedAt,
        id: msg.id,
        delivered: msg.delivered
      }))
    };
  }
  
  for (const [key, value] of userMessages.entries()) {
    allUserMessages[key] = value;
  }
  
  const totalBotMessages = Array.from(botMessages.values()).reduce((total, conv) => total + conv.messages.length, 0);
  
  console.log('🔍 DEBUG ENDPOINT CALLED - Current storage state:');
  console.log(`   Bot message conversations: ${botMessages.size} stored`);
  console.log(`   Total bot messages: ${totalBotMessages}`);
  console.log(`   User messages: ${userMessages.size} tracked`);
  
  res.json({ 
    totalBotMessageConversations: botMessages.size,
    totalBotMessages: totalBotMessages,
    totalUserMessages: userMessages.size,
    botMessages: allBotMessages,
    userMessages: allUserMessages,
    globalMessages: Object.keys(globalMessages).reduce((acc, key) => {
      acc[key] = globalMessages[key].length;
      return acc;
    }, {}),
    activeTimeouts: global.conversationTimeouts ? Object.keys(global.conversationTimeouts).length : 0,
    timestamp: Date.now()
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log('✅ Direct Botpress Chat API integration active');
  console.log('❌ N8N integration removed');
});