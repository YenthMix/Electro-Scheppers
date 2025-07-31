/**
 * backend.js
 * Backend server for Botpress Chat API integration
 */

require('dotenv').config();
const express = require('express');
const axios = require('axios');
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
const BASE_URL = `https://chat.botpress.cloud/${API_ID}`;

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

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 
      'text/plain', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
      'application/msword',
      'text/html',
      'text/markdown'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, TXT, DOCX, DOC, HTML, and MD files are allowed.'), false);
    }
  }
});

// Request timeout middleware
app.use((req, res, next) => {
  const timeout = req.url.includes('/webhook') ? 5000 : 30000;
  res.setTimeout(timeout, () => {
    console.log(`⚠️ Request timeout (${timeout}ms) for`, req.url);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Data storage
const botMessages = new Map(); // conversationId -> { messages: [...], lastDelivered: timestamp }
const globalMessages = {}; // conversationId -> messages array
const userMessages = new Map(); // conversationId -> user message data
const webhookQueue = new Map(); // conversationId -> processing status

// ============================================================================
// CHAT API ENDPOINTS
// ============================================================================

// Create user
app.post('/api/user', async (req, res) => {
  try {
    const response = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    
    if (!data.user || !data.key) {
      return res.status(500).json({ error: 'User or user key missing in Botpress response' });
    }
    
    res.json({ user: data.user, userKey: data.key });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create conversation
app.post('/api/conversation', async (req, res) => {
  const { userKey } = req.body;
  try {
    const response = await fetch(`${BASE_URL}/conversations`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'x-user-key': userKey
      },
      body: JSON.stringify({ body: {} })
    });
    
    const data = await response.json();
    
    if (!data.conversation || !data.conversation.id) {
      return res.status(500).json({ error: 'Conversation missing in Botpress response' });
    }
    
    res.json({ conversation: data.conversation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track user messages before sending to N8N
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

// Get bot messages for frontend
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
        console.log(`⏳ N8N still sending messages for conversation: ${conversationId}`);
        res.json({ 
          success: false, 
          message: 'Still collecting messages from n8n',
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

// ============================================================================
// WEBHOOK ENDPOINTS
// ============================================================================

// N8N webhook endpoint
app.post('/api/botpress-webhook', async (req, res) => {
  const timestamp = new Date().toISOString();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Send immediate response to N8N
  res.status(200).json({ 
    success: true,
    requestId: requestId,
    timestamp: timestamp,
    message: 'Webhook received and processing'
  });
  
  // Process webhook asynchronously
  setImmediate(async () => {
    try {
      console.log(`🔄 WEBHOOK RECEIVED FROM N8N at ${timestamp} (ID: ${requestId}):`);
      console.log('📋 Full request body:', JSON.stringify(req.body, null, 2));
      
      const body = req.body;
      let conversationId, botText, isBot, botImage;
      
      // Extract data from webhook
      if (body.body && body.body.data) {
        conversationId = body.body.data.conversationId;
        botText = body.body.data.payload?.text || body.body.data.text;
        botImage = body.body.data.payload?.image || body.body.data.payload?.imageUrl || body.body.data.image || body.body.data.imageUrl;
        isBot = body.body.data.isBot;
        console.log('📍 Using body.body.data pattern');
      } else if (body.conversationId) {
        conversationId = body.conversationId;
        botText = body.payload?.text || body.text;
        botImage = body.payload?.image || body.payload?.imageUrl || body.image || body.imageUrl;
        isBot = body.isBot;
        console.log('📍 Using body.conversationId pattern');
      } else if (body.text || body.image || body.imageUrl) {
        botText = body.text;
        botImage = body.image || body.imageUrl;
        isBot = body.isBot;
        console.log('📍 Using body.text/image/imageUrl pattern');
      }
      
      console.log(`🔍 Extracted: conversationId="${conversationId}", text="${botText}", image="${botImage ? 'present' : 'none'}", isBot="${isBot}"`);
      
      // Check if this matches a tracked user message
      const trackedUserMessage = userMessages.get(conversationId);
      if (trackedUserMessage) {
        console.log(`🔍 Tracked user message: "${trackedUserMessage.text}"`);
        console.log(`🔍 Incoming message: "${botText}"`);
        console.log(`🔍 Messages match: ${trackedUserMessage.text === botText}`);
      } else {
        console.log(`🔍 No tracked user message found for this conversation`);
      }
      
      // Process bot messages
      const isBotMessage = isBot === true || isBot === "true";
      const isUserMessage = isBot === false || isBot === "false";
      
      if (isBotMessage) {
        const botMessageTimestamp = new Date().toISOString();
        console.log(`🤖 IDENTIFIED AS BOT MESSAGE (isBot: true) at ${botMessageTimestamp} - will store and display separately`);
        
        if (conversationId && (botText || botImage) && (!botText || !botText.includes('{{ $json'))) {
          console.log(`💾 STORING INDIVIDUAL BOT MESSAGE at ${botMessageTimestamp}: "${botText || '[IMAGE]'}"`);
          
          if (!globalMessages[conversationId]) {
            globalMessages[conversationId] = [];
            console.log(`📦 Created new global storage for: ${conversationId}`);
          }
          
          const messageTimestamp = Date.now();
          const newMessage = {
            text: botText || null,
            image: botImage || null,
            timestamp: messageTimestamp,
            receivedAt: botMessageTimestamp,
            id: `bot-msg-${messageTimestamp}-${Math.random().toString(36).substr(2, 6)}`,
            delivered: false
          };
          
          globalMessages[conversationId].push(newMessage);
          console.log(`📝 STORED MESSAGE ${globalMessages[conversationId].length}: "${botText || '[IMAGE]'}" ${botImage ? '[+IMAGE]' : ''}`);
          
          // Clear any existing timeout
          if (global.conversationTimeouts && global.conversationTimeouts[conversationId]) {
            clearTimeout(global.conversationTimeouts[conversationId]);
            console.log(`🧹 Cleared previous GLOBAL timeout for conversation: ${conversationId}`);
          }
          
          if (!global.conversationTimeouts) {
            global.conversationTimeouts = {};
          }
          
          // Set timeout to deliver all messages
          console.log(`⏰ Setting 6-second timeout to deliver ALL messages after n8n finishes...`);
          global.conversationTimeouts[conversationId] = setTimeout(() => {
            console.log(`⏰ TIMEOUT: N8N finished sending messages for ${conversationId}`);
            
            const finalMessages = globalMessages[conversationId] || [];
            console.log(`🎯 Final message count from global storage: ${finalMessages.length} messages`);
            
            finalMessages.sort((a, b) => a.timestamp - b.timestamp);
            
            console.log(`📋 Final message order (sorted by timestamp):`);
            finalMessages.forEach((msg, index) => {
              const displayText = msg.text ? msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '') : '[IMAGE]';
              console.log(`   Position ${index + 1}: "${displayText}" ${msg.image ? '[+IMAGE]' : ''} (${msg.receivedAt})`);
            });
            
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
            
            console.log(`✅ All ${finalMessages.length} messages ready for delivery in correct timestamp order`);
            
            userMessages.delete(conversationId);
            console.log(`🧹 Cleaned up tracked user message for conversation: ${conversationId}`);
            
            delete global.conversationTimeouts[conversationId];
            
          }, 6000);
          
          console.log(`⏱️ Waiting 6 seconds for additional messages from n8n...`);
        }
      } else if (isUserMessage) {
        console.log('👤 IDENTIFIED AS USER MESSAGE (isBot: false) - will NOT store or display');
      } else {
        console.log('⚠️ NO isBot FIELD FOUND - falling back to old behavior');
        // Fallback logic for backwards compatibility
        const trackedUserMessage = userMessages.get(conversationId);
        const looksLikeBotResponse = 
          botText && (
            botText.length > 20 ||                                    
            botText.includes('!') ||                                  
            botText.includes('?') ||                                  
            botText.includes('helpen') || botText.includes('kan ik') || 
            /[A-Z].*[a-z].*[.!?]/.test(botText)
          );
          
        if (!trackedUserMessage || (trackedUserMessage && botText !== trackedUserMessage.text)) {
          if ((looksLikeBotResponse || botImage) && conversationId && (botText || botImage) && (!botText || !botText.includes('{{ $json'))) {
            console.log(`💾 FALLBACK: STORING BOT MESSAGE: "${botText || '[IMAGE]'}"`);
            
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
            
            const messageTimestamp = Date.now();
            conversationData.messages.push({
              text: botText || null,
              image: botImage || null,
              timestamp: messageTimestamp,
              receivedAt: new Date().toISOString(),
              id: `bot-fallback-${messageTimestamp}`,
              delivered: false
            });
            
            conversationData.messages.sort((a, b) => a.timestamp - b.timestamp);
            
            if (conversationData.deliveryTimeoutId) {
              clearTimeout(conversationData.deliveryTimeoutId);
            }
            
            conversationData.deliveryTimeoutId = setTimeout(() => {
              conversationData.allMessagesReceived = true;
              conversationData.deliveryTimeoutId = null;
              console.log(`✅ FALLBACK: Messages ready for delivery`);
            }, 6000);
            
            userMessages.delete(conversationId);
          }
        }
      }
      
      // Clean up old messages (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      console.log(`🧹 CLEANUP: Starting cleanup of messages older than 5 minutes`);
      
      for (const [key, value] of botMessages.entries()) {
        if (!value.allMessagesReceived && value.deliveryTimeoutId) {
          console.log(`🧹 SKIPPING cleanup for conversation ${key} - still receiving messages`);
          continue;
        }
        
        const filteredMessages = value.messages.filter(msg => msg.timestamp >= fiveMinutesAgo);
        if (filteredMessages.length !== value.messages.length) {
          value.messages = filteredMessages;
          console.log(`🧹 Cleaned up old messages for conversation: ${key}`);
        }
        
        if (value.messages.length === 0) {
          if (value.deliveryTimeoutId) {
            clearTimeout(value.deliveryTimeoutId);
            console.log(`🧹 Cleared delivery timeout for conversation: ${key}`);
          }
          botMessages.delete(key);
          console.log(`🧹 Deleted empty conversation: ${key}`);
        }
      }
      
      for (const [key, value] of userMessages.entries()) {
        if (value.timestamp < fiveMinutesAgo) {
          userMessages.delete(key);
        }
      }
      
      for (const [key, value] of webhookQueue.entries()) {
        if (value.lastUpdate < fiveMinutesAgo) {
          webhookQueue.delete(key);
          console.log(`🧹 Cleaned up old webhook queue entry for conversation: ${key}`);
        }
      }
      
      console.log(`✅ Webhook processing completed for request ${requestId}`);
      
    } catch (error) {
      console.error(`❌ WEBHOOK ERROR for request ${requestId}:`, error);
    }
  });
});

// ============================================================================
// FILE UPLOAD ENDPOINTS
// ============================================================================

// Upload file to knowledge base
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📁 File upload received: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`📁 File type: ${req.file.mimetype}`);
    
    // Get or create knowledge base
    let knowledgeBaseId = null;
    try {
      const kbListResponse = await axios.get('https://api.botpress.cloud/v1/knowledge-bases', {
        headers: {
          'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      if (kbListResponse.data && kbListResponse.data.length > 0) {
        knowledgeBaseId = kbListResponse.data[0].id;
        console.log(`✅ Found knowledge base: ${knowledgeBaseId}`);
      } else {
        console.log(`⚠️ No knowledge bases found, trying to create one...`);
        const createKbResponse = await axios.post('https://api.botpress.cloud/v1/knowledge-bases', {
          name: 'Documents',
          description: 'Knowledge base for uploaded documents'
        }, {
          headers: {
            'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        knowledgeBaseId = createKbResponse.data.id;
        console.log(`✅ Created new knowledge base: ${knowledgeBaseId}`);
      }
    } catch (error) {
      console.log(`❌ Failed to get/create knowledge base:`, error.response?.status || error.message);
      knowledgeBaseId = process.env.BOTPRESS_KNOWLEDGE_BASE_ID;
      console.log(`🔄 Falling back to environment knowledge base ID: ${knowledgeBaseId}`);
    }

    // Register file and get upload URL
    const timestamp = Date.now();
    const filename = req.file.originalname;
    const fileKey = `${knowledgeBaseId}/${timestamp}-${filename}`;
    const title = req.body.title || filename;
    
    const registerRes = await axios.put('https://api.botpress.cloud/v1/files', {
      key: fileKey,
      contentType: req.file.mimetype,
      size: req.file.size,
      index: true,
      accessPolicies: ['public_content'],
      tags: {
        source: 'knowledge-base',
        kbId: knowledgeBaseId,
        title: title,
        category: 'support',
        uploadedVia: 'api'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
        'x-bot-id': BOT_ID,
        'Content-Type': 'application/json'
      }
    });

    const registerData = registerRes.data;
    const fileObj = registerData.file || registerData;
    const uploadUrl = fileObj.uploadUrl;
    const fileId = fileObj.id;
    if (!uploadUrl || !fileId) {
      throw new Error('No uploadUrl or fileId in Botpress response');
    }
    console.log(`✅ File metadata registered. File ID: ${fileId}, Upload URL: ${uploadUrl}`);

    // Upload file content
    await axios.put(uploadUrl, fs.readFileSync(req.file.path), {
      headers: {
        'Content-Type': req.file.mimetype
      }
    });
    console.log(`✅ File content uploaded to storage.`);

    // Add file to knowledge base
    const knowledgeBaseResponse = await axios.post(`https://api.botpress.cloud/v3/knowledge-bases/${knowledgeBaseId}/documents`, {
      name: filename,
      type: 'file',
      fileId: fileId,
      workspaceId: WORKSPACE_ID
    }, {
      headers: {
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
        'x-bot-id': BOT_ID,
        'Content-Type': 'application/json'
      }
    });
    const kbData = knowledgeBaseResponse.data;
    console.log(`✅ File added to knowledge base successfully! Document ID: ${kbData.id || 'N/A'}`);

    // Clean up temporary file
    fs.unlinkSync(req.file.path);
    console.log(`🧹 Temporary file cleaned up: ${req.file.path}`);

    res.json({ 
      success: true, 
      message: 'File uploaded to knowledge base successfully',
      fileId: fileId,
      documentId: kbData.id,
      fileName: filename
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

// List documents in knowledge base
app.get('/api/documents', async (req, res) => {
  try {
    const filesRes = await axios.get('https://api.botpress.cloud/v1/files', {
      headers: {
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
        'x-bot-id': BOT_ID,
        'Content-Type': 'application/json'
      },
      params: {
        'tags[category]': 'support',
        'tags[source]': 'knowledge-base',
        'tags[kbId]': process.env.BOTPRESS_KNOWLEDGE_BASE_ID,
        limit: 100
      }
    });
    const files = filesRes.data.files || filesRes.data;
    console.log('Botpress KB files response:', files);
    res.json({ success: true, files });
  } catch (error) {
    if (error.response) {
      console.error('Botpress API error:', error.response.status, error.response.data, error.response.headers);
    } else {
      console.error('Botpress API error:', error.message);
    }
    res.status(500).json({ success: false, error: error.message, details: error.response?.data });
  }
});

// Delete document from knowledge base
app.delete('/api/documents/:fileId', async (req, res) => {
  const { fileId } = req.params;
  try {
    const deleteRes = await axios.delete(`https://api.botpress.cloud/v1/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
        'x-bot-id': BOT_ID,
        'Content-Type': 'application/json'
      }
    });
    res.json({ success: true, result: deleteRes.data });
  } catch (error) {
    if (error.response) {
      console.error('Botpress API delete error:', error.response.status, error.response.data, error.response.headers);
    } else {
      console.error('Botpress API delete error:', error.message);
    }
    res.status(500).json({ success: false, error: error.message, details: error.response?.data });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: Date.now(),
    knowledgeBaseId: process.env.BOTPRESS_KNOWLEDGE_BASE_ID,
    activeConversations: {
      botMessages: botMessages.size,
      userMessages: userMessages.size,
      totalBotMessages: Array.from(botMessages.values()).reduce((total, conv) => total + conv.messages.length, 0)
    }
  });
});

// Knowledge base status check
app.get('/api/kb-status', async (req, res) => {
  try {
    const kbId = process.env.BOTPRESS_KNOWLEDGE_BASE_ID;
    console.log(`🔍 Checking knowledge base status for: ${kbId}`);
    
    const kbResponse = await axios.get(`https://api.botpress.cloud/v1/knowledge-bases/${kbId}`, {
      headers: {
        'Authorization': `Bearer ${BOTPRESS_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.json({ 
      success: true, 
      knowledgeBase: kbResponse.data,
      environmentId: kbId
    });
  } catch (error) {
    console.error('Knowledge base status check failed:', error.response?.status || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      environmentId: process.env.BOTPRESS_KNOWLEDGE_BASE_ID
    });
  }
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
  webhookQueue.clear();
  
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
  console.log(`   Webhook queue: ${webhookQueue.size} processing`);
  
  res.json({ 
    totalBotMessageConversations: botMessages.size,
    totalBotMessages: totalBotMessages,
    totalUserMessages: userMessages.size,
    totalWebhookQueue: webhookQueue.size,
    botMessages: allBotMessages,
    userMessages: allUserMessages,
    webhookQueue: Object.fromEntries(webhookQueue),
    timestamp: Date.now()
  });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// Multer error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('❌ MULTER ERROR:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ GLOBAL ERROR HANDLER:', err);
  if (!res.headersSent) {
    res.status(500).json({ 
      error: 'Server error', 
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Debug endpoint: http://localhost:${PORT}/api/debug/stored-responses`);
});