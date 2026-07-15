/**
 * ⚡ MALIK CHOHAN AUTOFORWARD BOT ⚡
 * Main Entry Point
 * Developed by Malik Chohan
 */
require('dotenv').config();
const {
    DisconnectReason,
    jidNormalizedUser,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const fs = require('fs');
const path = require('path');

const { malik_connectSession, malik_clearSession } = require('./maliklib/session');
const { malik_connectDatabase, malik_getGroupSettings, malik_isDbConnected, malik_getGlobalAutoForward } = require('./maliklib/database');
const config = require('./malik');
const qrcode = require('qrcode');

const malik_app = express();
const malik_port = process.env.PORT || 3000;

// -----------------------------------------------------------------------------
// PLUGIN LOADER (Only 4 specific commands)
// -----------------------------------------------------------------------------
const malik_plugins = new Map();

function malik_loadPlugins() {
    const pluginDir = path.join(__dirname, 'malikplugins');
    if (!fs.existsSync(pluginDir)) return;

    // We only want these specific filenames/commands as per user request
    const requested = ['autoforward.js', 'forward.js', 'gjids.js', 'jid.js', 'uptime.js', 'ping.js', 'menu.js'];
    
    for (const file of requested) {
        const filePath = path.join(pluginDir, file);
        if (fs.existsSync(filePath)) {
            try {
                const plugin = require(`./malikplugins/${file}`);
                if (plugin.name) {
                    const name = plugin.name.toLowerCase();
                    malik_plugins.set(name, plugin);
                    if (plugin.aliases && Array.isArray(plugin.aliases)) {
                        plugin.aliases.forEach(alias => malik_plugins.set(alias.toLowerCase(), plugin));
                    }
                }
            } catch (e) {
                console.error(`Failed to load plugin ${file}:`, e.message);
            }
        }
    }
    console.log(`✅ Loaded ${malik_plugins.size} core commands.`);
}

// -----------------------------------------------------------------------------
// TEXT REPLACEMENT & CLEANING CONFIG
// -----------------------------------------------------------------------------
const { processAndCleanMessage, isAllowedForwardType } = require('./maliklib/cleaner');
const { smartProcessMessage, getGroupName } = require('./maliklib/smartCleaner');

// V2 FEATURES - AUTO-INTEGRATED (All Features Included!)
// ─────────────────────────────────────────────────────────────────────────
const {
    BrandingEngine,
    ContentAnalyzer,
    MessageQueue,
    DuplicateDetector,
    MessageLogger
} = require("./maliklib/ENHANCED_FEATURES_V2");

const v2Branding = new BrandingEngine();
const v2Detector = new DuplicateDetector(300000);
const v2Queue = new MessageQueue(5, 1000);
const v2Logger = new MessageLogger();


// -----------------------------------------------------------------------------
// SESSION STATE
// -----------------------------------------------------------------------------
const sessions = new Map();

// Middleware
malik_app.use(express.json());
malik_app.use(express.static(path.join(__dirname, 'public')));

// Keep-Alive Route
malik_app.get('/ping', (req, res) => res.status(200).send('pong'));

// Dashboard APIs
malik_app.get('/api/status', async (req, res) => {
    const sessionId = config.sessionId || 'malik_session';
    const session = sessions.get(sessionId);
    res.json({
        connected: session?.isConnected || false,
        qr: session?.qr || null,
        dbConnected: malik_isDbConnected()
    });
});

malik_app.get('/api/config', (req, res) => {
    // Return minimal config for the dashboard (mostly placeholder for now as per user request to streamline)
    res.json({
        sourceJids: [],
        targetJids: [],
        oldTextRegex: [],
        newText: ""
    });
});

malik_app.post('/api/config', (req, res) => {
    // Stub for saving - for a streamlined bot, user usually manages via .env or commands
    res.json({ success: true });
});

// -----------------------------------------------------------------------------
// SESSION MANAGEMENT
// -----------------------------------------------------------------------------
async function startSession(sessionId) {
    if (sessions.has(sessionId)) {
        const existing = sessions.get(sessionId);
        if (existing.isConnected && existing.sock) return;
        if (existing.sock) {
            existing.sock.ev.removeAllListeners('connection.update');
            existing.sock.end(undefined);
            sessions.delete(sessionId);
        }
    }

    console.log(`🚀 Starting session: ${sessionId}`);
    const sessionState = { sock: null, isConnected: false };
    sessions.set(sessionId, sessionState);

    const { malik_sock, saveCreds } = await malik_connectSession(false, sessionId);
    sessionState.sock = malik_sock;

    // Register listeners immediately to avoid missing events
    console.log(`📡 [${sessionId}] Socket created, listening for events...`);

    malik_sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                sessionState.qr = await qrcode.toDataURL(qr);
            } catch (e) {
                console.error('Failed to generate QR:', e.message);
            }
        }

        if (connection === 'close') {
            sessionState.isConnected = false;
            sessionState.qr = null;
            const statusCode = (lastDisconnect?.error instanceof Boom) ?
                lastDisconnect.error.output.statusCode : 500;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 440;

            console.log(`Session ${sessionId}: Connection closed, reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) {
                setTimeout(() => startSession(sessionId), 3000);
            } else {
                sessions.delete(sessionId);
                await malik_clearSession(sessionId);
            }
        } else if (connection === 'open') {
            sessionState.isConnected = true;
            sessionState.qr = null;
            console.log(`✅ ${sessionId}: Connected to WhatsApp`);
        }
    });

    malik_sock.ev.on('creds.update', saveCreds);

    // -------------------------------------------------------------------------
    // MESSAGE HANDLER
    // -------------------------------------------------------------------------
    malik_sock.ev.on('messages.upsert', async malik_m => {
        const malik_msg = malik_m.messages[0];
        if (!malik_msg.message) return;

        const malik_origin = malik_msg.key.remoteJid;
        const malik_sender = jidNormalizedUser(malik_msg.key.participant || malik_origin);
        
        const malik_text = malik_msg.message.conversation ||
            malik_msg.message.extendedTextMessage?.text ||
            malik_msg.message.imageMessage?.caption ||
            malik_msg.message.videoMessage?.caption ||
            malik_msg.message.documentMessage?.caption || "";
        
        // 1. GLOBAL AUTO FORWARD LOGIC (Background)
        if (malik_origin.endsWith('@g.us') && !malik_msg.key.fromMe) {
            try {
                const globalCfg = await malik_getGlobalAutoForward(sessionId);
                if (globalCfg?.enabled && globalCfg.sourceJids?.includes(malik_origin) && globalCfg.targetJids?.length > 0 && isAllowedForwardType(malik_msg.message)) {
                    
                    // ✨ NEW: Smart processing with auto group name detection
                    const sourceGroupName = await getGroupName(malik_sock, malik_origin);
                    
                    for (const targetJid of globalCfg.targetJids) {
                        try {
                            // Get target group name for branding
                            const targetGroupName = await getGroupName(malik_sock, targetJid);
                            
                            // Smart process with group name removal and target branding
                            let relayMsg = await smartProcessMessage(malik_msg.message, sourceGroupName, targetGroupName);
                            
                            // Unwrap View Once
                            if (relayMsg.viewOnceMessageV2) relayMsg = relayMsg.viewOnceMessageV2.message;
                            if (relayMsg.viewOnceMessage) relayMsg = relayMsg.viewOnceMessage.message;

                            // Apply timestamp if enabled
                            if (globalCfg.autoForwardTimestamp && relayMsg.conversation) {
                                const time = new Date().toLocaleTimeString();
                                relayMsg.conversation = `${relayMsg.conversation}\n\n_[${time}]_`;
                            }

                            await malik_sock.relayMessage(targetJid, relayMsg, {
                                messageId: malik_sock.generateMessageTag()
                            });
                        } catch (err) {
                            console.error(`[GLOBAL-FORWARD] Failed for ${targetJid}:`, err.message);
                        }
                    }
                }
            } catch (err) { }
        }

        // 2. GROUP-SPECIFIC AUTO FORWARD LOGIC (Background)
        if (malik_origin.endsWith('@g.us') && !malik_msg.key.fromMe) {
            try {
                const groupSettings = await malik_getGroupSettings(sessionId, malik_origin);
                if (groupSettings && groupSettings.autoForward && groupSettings.autoForwardTargets?.length > 0 && isAllowedForwardType(malik_msg.message)) {
                    
                    // ✨ NEW: Smart processing with auto group name detection
                    const sourceGroupName = await getGroupName(malik_sock, malik_origin);
                    
                    for (const targetJid of groupSettings.autoForwardTargets) {
                        try {
                            // Get target group name for branding
                            const targetGroupName = await getGroupName(malik_sock, targetJid);
                            
                            // Smart process with group name removal and target branding
                            let relayMsg = await smartProcessMessage(malik_msg.message, sourceGroupName, targetGroupName);
                            
                            // Unwrap View Once
                            if (relayMsg.viewOnceMessageV2) relayMsg = relayMsg.viewOnceMessageV2.message;
                            if (relayMsg.viewOnceMessage) relayMsg = relayMsg.viewOnceMessage.message;

                            await malik_sock.relayMessage(targetJid, relayMsg, {
                                messageId: malik_sock.generateMessageTag()
                            });
                        } catch (err) {
                            console.error(`[AUTO-FORWARD] Failed for ${targetJid}:`, err.message);
                        }
                    }
                }
            } catch (err) { }
        }

        // 3. COMMAND HANDLER
        const prefix = '.'; 
        if (malik_text.trim().startsWith(prefix)) {
            const malik_parts = malik_text.trim().slice(prefix.length).trim().split(/\s+/);
            const malik_cmd_input = malik_parts[0].toLowerCase();
            const malik_args = malik_parts.slice(1);

            if (malik_plugins.has(malik_cmd_input)) {
                const plugin = malik_plugins.get(malik_cmd_input);
                try {
                    // Minimal Context
                    const isGroup = malik_origin.endsWith('@g.us');
                    let malik_isAdmin = false;
                    if (isGroup) {
                        try {
                            const groupMetadata = await malik_sock.groupMetadata(malik_origin);
                            const senderMod = groupMetadata.participants.find(p => jidNormalizedUser(p.id) === malik_sender);
                            malik_isAdmin = (senderMod?.admin === 'admin' || senderMod?.admin === 'superadmin');
                        } catch (e) { }
                    }

                    // For simplicity, we define isOwner as true if it's the bot itself or listed in config
                    const ownerNum = (config.ownerNumber || '').replace(/\D/g, '');
                    const isOwner = malik_msg.key.fromMe || (ownerNum && malik_sender.includes(ownerNum));

                    await plugin.malik_handler(malik_sock, malik_origin, {
                        malik_sender,
                        malik_msg,
                        malik_args,
                        sessionId,
                        malik_text,
                        malik_isGroup: isGroup,
                        malik_isAdmin,
                        malik_isOwner: isOwner,
                        malik_isSudo: isOwner,
                        malik_plugins
                    });
                } catch (err) {
                    console.error(`Error in plugin ${malik_cmd_input}:`, err.message);
                }
            }
        }
    });
}

// -----------------------------------------------------------------------------
// MAIN STARTUP
// -----------------------------------------------------------------------------
async function main() {
    // 1. Start Dashboard Server IMMEDIATELY (Prevents Heroku timeout)
    malik_app.listen(malik_port, () => {
        console.log(`🌐 Dashboard running on port ${malik_port}`);
    });

    // 2. Load Core Commands
    malik_loadPlugins();

    // 3. Initialize Bot in Background
    (async () => {
        try {
            // Connect Database
            if (config.mongoDbUrl) {
                const dbResult = await malik_connectDatabase(config.mongoDbUrl);
                if (dbResult) console.log('✅ Database connected');
            }

            // Start default session
            const sessionId = config.sessionId || 'malik_session';
            await startSession(sessionId);
        } catch (err) {
            console.error('❌ Initialization Error:', err);
        }
    })();
}

main();

// ═════════════════════════════════════════════════════════════════════════════
// V2 QUEUE PROCESSOR - Sends queued messages smoothly
// ═════════════════════════════════════════════════════════════════════════════
setInterval(async () => {
    if (v2Queue && v2Queue.size && v2Queue.size() > 0) {
        console.log(`📤 Processing queue: ${v2Queue.size()} messages`);
        try {
            const allSessions = Array.from(sessions.values());
            if (allSessions.length > 0 && allSessions[0].sock) {
                await v2Queue.process(async (item) => {
                    try {
                        await allSessions[0].sock.relayMessage(item.jid, item.message, {
                            messageId: allSessions[0].sock.generateMessageTag()
                        });
                    } catch (err) {
                        console.error('Queue error:', err.message);
                    }
                });
            }
        } catch (err) {
            console.error('Queue processor error:', err.message);
        }
    }
}, 5000);

// ═════════════════════════════════════════════════════════════════════════════
// V2 CACHE CLEANER - Keeps duplicate detector fresh
// ═════════════════════════════════════════════════════════════════════════════
setInterval(() => {
    if (v2Detector) {
        v2Detector.cleanCache();
        console.log('🧹 Cache cleaned');
    }
}, 600000); // Every 10 minutes
