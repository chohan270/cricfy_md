/**
 * ⚡ MALIK CHOHAN MD AUTOFORWARD BOT - ENHANCED V2
 * More Features & Customization
 * Developed by Malik Chohan
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. AUTO-BRANDING WITH CUSTOM STYLES
// ═══════════════════════════════════════════════════════════════════════════

class BrandingEngine {
    constructor() {
        this.styles = {
            // Top & Bottom borders
            fancy: {
                top: '╔╦══• •✠•✠•✠ • •══╦╗',
                bottom: '╚╩══• •✠•✠•✠ • •══╩╝',
                prefix: '  *',
                suffix: '*'
            },
            simple: {
                top: '━━━━━━━━━━━━━━━━━━',
                bottom: '━━━━━━━━━━━━━━━━━━',
                prefix: '*',
                suffix: '*'
            },
            arrow: {
                top: '➤➤➤',
                bottom: '◀◀◀',
                prefix: '*',
                suffix: '*'
            },
            minimal: {
                top: '─────────────',
                bottom: '─────────────',
                prefix: '→ *',
                suffix: '*'
            },
            star: {
                top: '⭐⭐⭐⭐⭐',
                bottom: '⭐⭐⭐⭐⭐',
                prefix: '*',
                suffix: '*'
            },
            box: {
                top: '┌─────────────┐',
                bottom: '└─────────────┘',
                prefix: '│ *',
                suffix: '* │'
            },
            circle: {
                top: '⭕⭕⭕⭕⭕',
                bottom: '⭕⭕⭕⭕⭕',
                prefix: '*',
                suffix: '*'
            },
            deco: {
                top: '✨✨✨✨✨',
                bottom: '✨✨✨✨✨',
                prefix: '*',
                suffix: '*'
            },
            fire: {
                top: '🔥🔥🔥🔥🔥',
                bottom: '🔥🔥🔥🔥🔥',
                prefix: '*',
                suffix: '*'
            }
        };
        
        this.defaultStyle = 'fancy';
    }

    /**
     * Generate branding for target group
     */
    generate(groupName, styleType = this.defaultStyle) {
        const style = this.styles[styleType] || this.styles[this.defaultStyle];
        
        if (!groupName) groupName = 'Target Group';
        
        return `${style.top}\n${style.prefix}${groupName}${style.suffix}\n${style.bottom}`;
    }

    /**
     * Get all available styles
     */
    getAllStyles() {
        return Object.keys(this.styles);
    }

    /**
     * Add custom style
     */
    addStyle(name, config) {
        this.styles[name] = config;
        return true;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. INTELLIGENT CAPTION PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

class CaptionProcessor {
    /**
     * Extract caption from image/video message
     */
    static extractCaption(message) {
        if (message.imageMessage?.caption) return message.imageMessage.caption;
        if (message.videoMessage?.caption) return message.videoMessage.caption;
        if (message.conversation) return message.conversation;
        if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
        return null;
    }

    /**
     * Apply caption to message
     */
    static applyCaption(message, newCaption) {
        if (message.imageMessage) {
            message.imageMessage.caption = newCaption;
        } else if (message.videoMessage) {
            message.videoMessage.caption = newCaption;
        } else if (message.conversation) {
            message.conversation = newCaption;
        } else if (message.extendedTextMessage) {
            message.extendedTextMessage.text = newCaption;
        }
        return message;
    }

    /**
     * Check if message has caption/text
     */
    static hasCaption(message) {
        return this.extractCaption(message) !== null;
    }

    /**
     * Get message type
     */
    static getType(message) {
        if (message.imageMessage) return 'image';
        if (message.videoMessage) return 'video';
        if (message.audioMessage) return 'audio';
        if (message.documentMessage) return 'document';
        if (message.conversation) return 'text';
        if (message.extendedTextMessage) return 'extendedText';
        return 'unknown';
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SMART TEXT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

class TextNormalizer {
    /**
     * Remove extra whitespace
     */
    static normalizeSpaces(text) {
        return text
            .replace(/\n\n\n+/g, '\n\n')  // Max 2 newlines
            .replace(/\s+/g, ' ')           // Single space
            .trim();
    }

    /**
     * Remove emoji only from certain parts
     */
    static removeEmoji(text) {
        return text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    }

    /**
     * Keep only emoji
     */
    static onlyEmoji(text) {
        return text.replace(/[^\u{1F300}-\u{1F9FF}\s]/gu, '').trim();
    }

    /**
     * Convert to uppercase
     */
    static toUpperCase(text) {
        return text.toUpperCase();
    }

    /**
     * Convert to lowercase
     */
    static toLowerCase(text) {
        return text.toLowerCase();
    }

    /**
     * Capitalize first letter
     */
    static capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    /**
     * Remove URLs
     */
    static removeUrls(text) {
        return text.replace(/https?:\/\/[^\s]+/g, '').trim();
    }

    /**
     * Extract URLs
     */
    static extractUrls(text) {
        const urls = text.match(/https?:\/\/[^\s]+/g) || [];
        return urls;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. AUTOMATIC HASHTAG & MENTION DETECTION
// ═══════════════════════════════════════════════════════════════════════════

class ContentAnalyzer {
    /**
     * Extract hashtags from text
     */
    static extractHashtags(text) {
        const hashtags = text.match(/#\w+/g) || [];
        return hashtags;
    }

    /**
     * Extract mentions (@username)
     */
    static extractMentions(text) {
        const mentions = text.match(/@\w+/g) || [];
        return mentions;
    }

    /**
     * Extract numbers/prices
     */
    static extractNumbers(text) {
        const numbers = text.match(/\d+/g) || [];
        return numbers;
    }

    /**
     * Detect language (basic)
     */
    static detectLanguage(text) {
        const urduPattern = /[\u0600-\u06FF]/g;
        const englishPattern = /[a-zA-Z]/g;
        
        const urduCount = (text.match(urduPattern) || []).length;
        const englishCount = (text.match(englishPattern) || []).length;
        
        if (urduCount > englishCount) return 'urdu';
        if (englishCount > urduCount) return 'english';
        return 'mixed';
    }

    /**
     * Check if text is spam-like
     */
    static isSpamLike(text) {
        const spamPatterns = [
            /\b(?:click here|buy now|limited offer|urgent|act now)\b/gi,
            /\b(?:earn money|work from home|free money)\b/gi,
            /\b(?:congratulations|you won|claim prize)\b/gi
        ];

        return spamPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Get content summary
     */
    static getSummary(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Count words
     */
    static wordCount(text) {
        return text.trim().split(/\s+/).length;
    }

    /**
     * Count sentences
     */
    static sentenceCount(text) {
        const sentences = text.match(/[.!?]+/g) || [];
        return sentences.length || 1;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. MESSAGE QUEUING & BATCHING
// ═══════════════════════════════════════════════════════════════════════════

class MessageQueue {
    constructor(batchSize = 5, delayMs = 1000) {
        this.queue = [];
        this.batchSize = batchSize;
        this.delayMs = delayMs;
        this.processing = false;
    }

    /**
     * Add message to queue
     */
    enqueue(message) {
        this.queue.push(message);
        return this.queue.length;
    }

    /**
     * Process queue
     */
    async process(handler) {
        if (this.processing) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.batchSize);
            
            for (const message of batch) {
                try {
                    await handler(message);
                } catch (err) {
                    console.error('Queue processing error:', err.message);
                }
            }

            if (this.queue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.delayMs));
            }
        }

        this.processing = false;
    }

    /**
     * Get queue size
     */
    size() {
        return this.queue.length;
    }

    /**
     * Clear queue
     */
    clear() {
        this.queue = [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. DUPLICATE MESSAGE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

class DuplicateDetector {
    constructor(cacheTimeMs = 300000) { // 5 minutes
        this.cache = new Map();
        this.cacheTime = cacheTimeMs;
    }

    /**
     * Generate hash from message
     */
    static generateHash(text) {
        if (!text) return 'empty';
        
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Check if message is duplicate
     */
    isDuplicate(text, sourceJid) {
        const hash = DuplicateDetector.generateHash(text);
        const key = `${sourceJid}_${hash}`;

        if (this.cache.has(key)) {
            return true;
        }

        this.cache.set(key, Date.now());
        return false;
    }

    /**
     * Clean expired cache entries
     */
    cleanCache() {
        const now = Date.now();
        for (const [key, timestamp] of this.cache.entries()) {
            if (now - timestamp > this.cacheTime) {
                this.cache.delete(key);
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. MESSAGE TEMPLATING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

class MessageTemplate {
    /**
     * Format message with variables
     */
    static format(template, variables) {
        let result = template;
        
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{${key}}`, 'g');
            result = result.replace(regex, value);
        }

        return result;
    }

    /**
     * Pre-built templates
     */
    static templates = {
        broadcast: `📢 {GROUP_NAME}\n\n{CONTENT}`,
        
        news: `📰 {GROUP_NAME}\n━━━━━━━━━━\n{CONTENT}\n\n⏰ {TIME}`,
        
        update: `🔔 {GROUP_NAME}\n\n✨ {CONTENT}`,
        
        announcement: `📣 ANNOUNCEMENT\n{GROUP_NAME}\n\n{CONTENT}`,
        
        daily: `📅 {GROUP_NAME}\n\nToday's Update:\n{CONTENT}`,
        
        urgent: `🚨 URGENT - {GROUP_NAME}\n\n{CONTENT}`,

        link: `🔗 {GROUP_NAME}\n\n{CONTENT}\n\n{URL}`
    };

    /**
     * Use template
     */
    static use(templateName, variables) {
        const template = this.templates[templateName];
        if (!template) return variables.CONTENT;
        return this.format(template, variables);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. AUTO-REPLY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

class AutoReply {
    constructor() {
        this.replies = new Map();
    }

    /**
     * Add auto-reply rule
     */
    addRule(keyword, response) {
        this.replies.set(keyword.toLowerCase(), response);
    }

    /**
     * Check if message matches
     */
    getReply(text) {
        const lowerText = text.toLowerCase();

        for (const [keyword, response] of this.replies.entries()) {
            if (lowerText.includes(keyword)) {
                return response;
            }
        }

        return null;
    }

    /**
     * Remove rule
     */
    removeRule(keyword) {
        this.replies.delete(keyword.toLowerCase());
    }

    /**
     * Get all rules
     */
    getAllRules() {
        return Array.from(this.replies.entries());
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. MESSAGE LOGGING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

class MessageLogger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
    }

    /**
     * Log message
     */
    log(sourceGroup, targetGroup, content, status = 'success') {
        const entry = {
            timestamp: new Date(),
            sourceGroup,
            targetGroup,
            contentLength: content.length,
            status,
            hash: DuplicateDetector.generateHash(content)
        };

        this.logs.push(entry);

        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    /**
     * Get logs by group
     */
    getByGroup(groupJid) {
        return this.logs.filter(log => 
            log.sourceGroup === groupJid || log.targetGroup === groupJid
        );
    }

    /**
     * Get logs by time range
     */
    getByTimeRange(startTime, endTime) {
        return this.logs.filter(log => 
            log.timestamp >= startTime && log.timestamp <= endTime
        );
    }

    /**
     * Get recent logs
     */
    getRecent(count = 10) {
        return this.logs.slice(-count);
    }

    /**
     * Clear logs
     */
    clear() {
        this.logs = [];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
    BrandingEngine,
    CaptionProcessor,
    TextNormalizer,
    ContentAnalyzer,
    MessageQueue,
    DuplicateDetector,
    MessageTemplate,
    AutoReply,
    MessageLogger
};
