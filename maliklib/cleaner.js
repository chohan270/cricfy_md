/**
 * ⚡ MALIK CHOHAN MD AUTOFORWARD BOT ⚡
 * Cleaner Utility
 * Developed by Malik Chohan
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

const OLD_TEXT_REGEX = process.env.OLD_TEXT_REGEX
    ? process.env.OLD_TEXT_REGEX.split(',').map(pattern => {
        try {
            if (!pattern.trim()) return null;
            // Escape literal text to prevent crash from characters like ( ) [ ] * +
            const escaped = escapeRegex(pattern.trim());
            // Use 'u' flag for better unicode/stylish font support
            return new RegExp(escaped, 'gu');
        } catch (e) {
            console.error(`Invalid regex pattern: ${pattern}`, e);
            return null;
        }
      }).filter(regex => regex !== null)
    : [];

const NEW_TEXT = process.env.NEW_TEXT || '';

/**
 * Clean forwarded label and newsletter markers
 */
function processAndCleanMessage(message) {
    try {
        if (!message) return message;
        let cleaned = JSON.parse(JSON.stringify(message));
        
        // Remove all forwarding/newsletter/ad metadata
        const targetBlocks = ['extendedTextMessage', 'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
        targetBlocks.forEach(block => {
            if (cleaned[block]?.contextInfo) {
                // Remove specific forwarding and newsletter labels
                delete cleaned[block].contextInfo.isForwarded;
                delete cleaned[block].contextInfo.forwardingScore;
                delete cleaned[block].contextInfo.forwardedNewsletterMessageInfo;
                delete cleaned[block].contextInfo.externalAdReply;
                delete cleaned[block].contextInfo.newsletterJid;
                delete cleaned[block].contextInfo.newsletterName;
                delete cleaned[block].contextInfo.newsletterServerMessageId;
                
                // Explicitly set to false just in case Baileys defaults to original if missing
                cleaned[block].contextInfo.isForwarded = false;
                cleaned[block].contextInfo.forwardingScore = 0;
            }
            
            // Handle if the block itself has these fields directly (unlikely but safe)
            delete cleaned[block]?.isForwarded;
            delete cleaned[block]?.forwardingScore;
        });

        // Some messages have contextInfo directly on the root under specific structures
        if (cleaned.contextInfo) {
            delete cleaned.contextInfo.isForwarded;
            delete cleaned.contextInfo.forwardingScore;
            delete cleaned.contextInfo.forwardedNewsletterMessageInfo;
            cleaned.contextInfo.isForwarded = false;
        }

        // Replace text/captions
        const replaceText = (text) => {
            if (!text || !OLD_TEXT_REGEX.length) return text;
            let result = text;
            OLD_TEXT_REGEX.forEach(regex => {
                result = result.replace(regex, NEW_TEXT);
            });
            return result;
        };

        if (cleaned.conversation) cleaned.conversation = replaceText(cleaned.conversation);
        if (cleaned.extendedTextMessage) cleaned.extendedTextMessage.text = replaceText(cleaned.extendedTextMessage.text);
        if (cleaned.imageMessage) cleaned.imageMessage.caption = replaceText(cleaned.imageMessage.caption);
        if (cleaned.videoMessage) cleaned.videoMessage.caption = replaceText(cleaned.videoMessage.caption);
        if (cleaned.documentMessage) cleaned.documentMessage.caption = replaceText(cleaned.documentMessage.caption);

        return cleaned;
    } catch (e) {
        console.error('Cleaning Error:', e.message);
        return message;
    }
}

/**
 * Auto-Forward is restricted to TEXT and IMAGE (with caption) only.
 * Any other type (video, audio, document, sticker, poll, contact, location, etc.)
 * is ignored by the auto-forward engine.
 */
function isAllowedForwardType(message) {
    if (!message) return false;

    // Unwrap view-once wrappers before checking
    let msg = message;
    if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
    else if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
    if (!msg) return false;

    return Boolean(
        msg.conversation ||
        msg.extendedTextMessage ||
        msg.imageMessage
    );
}

module.exports = { processAndCleanMessage, isAllowedForwardType };
