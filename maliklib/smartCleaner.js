/**
 * ⚡ MALIK CHOHAN MD AUTOFORWARD BOT ⚡
 * Smart Cleaner - Auto-detect & Remove Group Names + Add Target Branding
 * Developed by Malik Chohan
 */

/**
 * Extract keywords from group name (handles stylized fonts)
 * E.g., "_*ᵟʰᵃᵏᵉᵉˡ-ᵟᵖᵒʳᵗˢ-ᵍʳᵒᵘᵖ*_" → ["shakeel", "sports", "group"]
 */
function extractGroupKeywords(groupName) {
    if (!groupName || typeof groupName !== 'string') return [];
    
    try {
        // Remove all decorative characters and normalize
        let cleaned = groupName
            // Remove markdown formatting
            .replace(/[_*~`]/g, '')
            // Remove special decorative characters and keep only alphanumeric + spaces/dashes
            .replace(/[^\w\s\-]/gu, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
        
        if (!cleaned) return [];
        
        // Split by spaces and dashes, lowercase everything
        const keywords = cleaned
            .split(/[\s\-]+/)
            .map(word => word.toLowerCase())
            .filter(word => word.length > 0 && word.length <= 30); // Filter out very short/long junk
        
        return [...new Set(keywords)]; // Remove duplicates
    } catch (e) {
        console.error('Error extracting keywords:', e.message);
        return [];
    }
}

/**
 * Remove group name keywords from text (whole-word matching)
 * E.g., "Shakeel Sports Latest Update" + keywords ["shakeel", "sports"]
 * Result: "Latest Update"
 */
function removeGroupNameFromText(text, keywords) {
    if (!text || !keywords || keywords.length === 0) return text;
    
    try {
        let cleaned = text;
        
        // Remove each keyword as a whole word (case-insensitive)
        for (const keyword of keywords) {
            if (!keyword || keyword.length === 0) continue;
            
            // Escape special regex characters in the keyword
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Word boundary regex - matches whole words only
            const regex = new RegExp(`\\b${escaped}\\b`, 'gui');
            cleaned = cleaned.replace(regex, '');
        }
        
        // Also remove decorative lines and patterns
        // Remove lines like: ╔╦══• •✠•✠•✠ • •══╦╗ ... ╚╩══• •✠•✠•✠ • •══╩╝
        cleaned = cleaned.replace(/╔╦══[\s\S]*?╚╩══[^\n]*/g, '');
        
        // Remove multiple consecutive spaces/newlines
        cleaned = cleaned
            .replace(/\n\n\n+/g, '\n\n')
            .replace(/\s+/g, ' ')
            .trim();
        
        return cleaned;
    } catch (e) {
        console.error('Error removing keywords:', e.message);
        return text;
    }
}

/**
 * Create stylish branding for target group
 */
function createTargetBranding(targetGroupName) {
    if (!targetGroupName) {
        targetGroupName = 'Target Group';
    }
    
    // Stylish top and bottom borders
    const border = '╔╦══• •✠•✠•✠ • •══╦╗';
    const footer = '╚╩══• •✠•✠•✠ • •══╩╝';
    
    return `${border}\n  *${targetGroupName}*\n${footer}`;
}

/**
 * Smart message processing with auto group name detection
 * - Detects source group name
 * - Removes group keywords from content
 * - Adds target group branding
 * - Handles text and image captions
 */
async function smartProcessMessage(message, sourceGroupName, targetGroupName) {
    if (!message) return message;
    
    try {
        let processed = JSON.parse(JSON.stringify(message));
        
        // Extract keywords from source group name
        const sourceKeywords = extractGroupKeywords(sourceGroupName);
        console.log(`📌 Source Group: "${sourceGroupName}" → Keywords: [${sourceKeywords.join(', ')}]`);
        
        // Create target branding
        const targetBranding = createTargetBranding(targetGroupName);
        
        // Process conversation (text message)
        if (processed.conversation && typeof processed.conversation === 'string') {
            let text = processed.conversation;
            
            // Remove group name keywords
            text = removeGroupNameFromText(text, sourceKeywords);
            
            // Add target branding if text is not empty
            if (text.trim()) {
                processed.conversation = `${targetBranding}\n\n${text}`;
            }
        }
        
        // Process extended text message
        if (processed.extendedTextMessage && processed.extendedTextMessage.text) {
            let text = processed.extendedTextMessage.text;
            
            // Remove group name keywords
            text = removeGroupNameFromText(text, sourceKeywords);
            
            // Add target branding if text is not empty
            if (text.trim()) {
                processed.extendedTextMessage.text = `${targetBranding}\n\n${text}`;
            }
        }
        
        // Process image caption
        if (processed.imageMessage && processed.imageMessage.caption) {
            let caption = processed.imageMessage.caption;
            
            // Remove group name keywords
            caption = removeGroupNameFromText(caption, sourceKeywords);
            
            // Add target branding if caption is not empty
            if (caption.trim()) {
                processed.imageMessage.caption = `${targetBranding}\n\n${caption}`;
            }
        }
        
        // Process video caption
        if (processed.videoMessage && processed.videoMessage.caption) {
            let caption = processed.videoMessage.caption;
            
            // Remove group name keywords
            caption = removeGroupNameFromText(caption, sourceKeywords);
            
            // Add target branding if caption is not empty
            if (caption.trim()) {
                processed.videoMessage.caption = `${targetBranding}\n\n${caption}`;
            }
        }
        
        // Remove forwarding metadata
        const targetBlocks = ['extendedTextMessage', 'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
        targetBlocks.forEach(block => {
            if (processed[block]?.contextInfo) {
                delete processed[block].contextInfo.isForwarded;
                delete processed[block].contextInfo.forwardingScore;
                delete processed[block].contextInfo.forwardedNewsletterMessageInfo;
                delete processed[block].contextInfo.externalAdReply;
                delete processed[block].contextInfo.newsletterJid;
                delete processed[block].contextInfo.newsletterName;
                processed[block].contextInfo.isForwarded = false;
                processed[block].contextInfo.forwardingScore = 0;
            }
        });
        
        if (processed.contextInfo) {
            delete processed.contextInfo.isForwarded;
            delete processed.contextInfo.forwardingScore;
            processed.contextInfo.isForwarded = false;
        }
        
        return processed;
    } catch (e) {
        console.error('Smart processing error:', e.message);
        return message;
    }
}

/**
 * Get group name safely
 */
async function getGroupName(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        return metadata?.subject || 'Group';
    } catch (e) {
        console.warn(`Could not fetch group name for ${groupJid}:`, e.message);
        return 'Group';
    }
}

module.exports = {
    extractGroupKeywords,
    removeGroupNameFromText,
    createTargetBranding,
    smartProcessMessage,
    getGroupName
};
