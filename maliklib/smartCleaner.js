/**
 * COMPLETE CLEANER - Removes ALL name lines inside borders + bottom signatures
 */

function removeBrandingBlocks(text) {
    if (!text) return text;
    
    let cleaned = text;
    
    // PATTERN 1: Remove stylized group line (SHAKEEL-SPORTS-GROUP56)
    cleaned = cleaned.replace(/^_*\*?[ᵟʰᵃᵏᵉᵉˡA-Za-z0-9\-_]+(?:group|sports|team|official)[A-Za-z0-9\-_]*\*?_*$/gmi, '');
    
    // PATTERN 2: Remove ANY decorative border line
    cleaned = cleaned.replace(/^[╔╚][═╦╩•✠]+[╗╝]$/gm, '');
    
    // PATTERN 3: Remove ANY line that contains only a name (between borders)
    // Matches: "          Auon Gazar", "          Bilal Khan", etc.
    cleaned = cleaned.replace(/^\s*[A-Za-z]+\s+[A-Za-z]+\s*$/gm, '');
    
    // PATTERN 4: Remove bottom signature lines
    // Matches: _*🇵🇰𝗦𝗦𝗚 Official Team 56 ⚾🏏*_
    // Matches: _*🇵🇰SSG Official Team 56*_
    cleaned = cleaned.replace(/^_*\*?[🇵🇰🇿🇼🇧🇩⚾🏏🔰🗣📡📰💥]*\s*[A-Za-z0-9. ]*(?:team|official|group|sports)[A-Za-z0-9. ]*\s*[⚾🏏🔰🇵🇰🇿🇼🇧🇩]*\*?_*$/gmi, '');
    
    // PATTERN 5: Remove ANY line that has 3+ emojis and contains "team" or "official" or "group"
    cleaned = cleaned.replace(/^[^\n]*?(?:team|official|group)[^\n]*?[⚾🏏🔰🗣📡📰💥🇵🇰🇿🇼🇧🇩]{3,}[^\n]*$/gmi, '');
    
    // PATTERN 6: Remove lines that are ONLY decorative symbols + one name
    cleaned = cleaned.replace(/^\s*[•✠✦✧★☆▪▫◆◇◈]+\s*[A-Za-z]+\s*[•✠✦✧★☆▪▫◆◇◈]+\s*$/gm, '');
    
    // PATTERN 7: Remove empty decorative lines that remain
    const lines = cleaned.split('\n');
    const filtered = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        
        // If line is > 60% decorative symbols → remove
        const alnum = (trimmed.match(/[A-Za-z0-9]/g) || []).length;
        const total = trimmed.length;
        if (total > 2 && alnum / total < 0.15) {
            const decorative = /[═╔╗╚╝╦╩•✠✦✧★☆▪▫◆◇◈‣›»«‹•♠♣♦♥]/;
            if (decorative.test(trimmed)) return false;
        }
        return true;
    });
    cleaned = filtered.join('\n');
    
    // Clean extra newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    return cleaned;
}

async function smartProcessMessage(message, sourceGroupName, targetGroupName) {
    if (!message) return message;
    
    try {
        let processed = JSON.parse(JSON.stringify(message));
        
        // Target branding
        const targetBranding = `╔═══•✠•═══╗\n  *${targetGroupName}*\n╚═══•✠•═══╝`;
        
        const processText = (text) => {
            if (!text || typeof text !== 'string') return text;
            
            let cleaned = removeBrandingBlocks(text);
            
            if (cleaned && cleaned.length > 0) {
                return `${targetBranding}\n\n${cleaned}`;
            }
            return cleaned;
        };
        
        // Apply to all message types
        if (processed.conversation) {
            processed.conversation = processText(processed.conversation);
        }
        if (processed.extendedTextMessage?.text) {
            processed.extendedTextMessage.text = processText(processed.extendedTextMessage.text);
        }
        if (processed.imageMessage?.caption) {
            processed.imageMessage.caption = processText(processed.imageMessage.caption);
        }
        if (processed.videoMessage?.caption) {
            processed.videoMessage.caption = processText(processed.videoMessage.caption);
        }
        
        // Remove metadata
        const blocks = ['extendedTextMessage', 'imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
        for (const block of blocks) {
            if (processed[block]?.contextInfo) {
                delete processed[block].contextInfo.isForwarded;
                delete processed[block].contextInfo.forwardingScore;
                delete processed[block].contextInfo.forwardedNewsletterMessageInfo;
                delete processed[block].contextInfo.externalAdReply;
                processed[block].contextInfo.isForwarded = false;
                processed[block].contextInfo.forwardingScore = 0;
            }
        }
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