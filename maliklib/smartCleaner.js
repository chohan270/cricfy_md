/**
 * SMART CLEANER - Removes ANY name inside borders, source signatures, bottom lines
 */

function extractGroupKeywords(groupName) {
    if (!groupName || typeof groupName !== 'string') return [];
    try {
        let normalized = groupName.normalize('NFKC')
            .replace(/[_*~`]/g, '')
            .replace(/[^\p{L}\p{N}\s\-]/gu, ' ')
            .toLowerCase();
        const words = normalized.split(/[\s\-]+/)
            .map(w => w.trim())
            .filter(w => w.length > 2 && !/^\d+$/.test(w));
        const stopwords = ['group', 'official', 'team', 'news', 'hd', 'channel', 'public', 'chat'];
        return [...new Set(words.filter(w => !stopwords.includes(w)))];
    } catch (e) {
        return [];
    }
}

function removeBrandingBlocks(text) {
    if (!text) return text;
    
    let cleaned = text;
    const lines = cleaned.split('\n');
    const filteredLines = [];
    let insideBorderBlock = false;
    let borderStartIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Skip empty lines
        if (!trimmed) {
            filteredLines.push(line);
            continue;
        }
        
        // CHECK: Is this a decorative border?
        const isBorder = /^[╔╚][═╦╩•✠]+[╗╝]$/.test(trimmed);
        
        if (isBorder) {
            // This is a border - start or end of border block
            if (!insideBorderBlock) {
                insideBorderBlock = true;
                borderStartIndex = i;
            } else {
                insideBorderBlock = false;
            }
            // Skip ALL borders (remove them)
            continue;
        }
        
        // If we are inside a border block
        if (insideBorderBlock) {
            // Check if this line is a NAME (2+ words, only letters, no numbers, no emojis, no special chars)
            // Matches: "Auon Gazar", "Bilal Khan", "Ali Raza", "Muhammad Usman"
            const isNameLine = /^\s*[A-Za-z]+\s+[A-Za-z]+\s*$/.test(trimmed);
            
            // Also check for name with 3 words: "Muhammad Ali Khan"
            const isThreeWordName = /^\s*[A-Za-z]+\s+[A-Za-z]+\s+[A-Za-z]+\s*$/.test(trimmed);
            
            // Check if it's the stylized group name
            const isGroupName = /ᵟʰᵃᵏᵉᵉˡ/.test(trimmed) || /group56/i.test(trimmed);
            
            // Check if it's SSG Official
            const isSSG = /ssg/i.test(trimmed) || /official team/i.test(trimmed);
            
            // REMOVE any name line inside borders
            if (isNameLine || isThreeWordName || isGroupName || isSSG) {
                continue; // Skip this line (remove it)
            }
            
            // If line has content that is NOT a name (score, stats, etc.), keep it
            // But first check if it contains source keywords
            const hasSourceKeyword = /shakeel|sports|group56|ssg|official|team\s*\d+/i.test(trimmed);
            if (!hasSourceKeyword) {
                filteredLines.push(line);
            }
            // If it has source keyword, skip it
            continue;
        }
        
        // NOT inside border block - normal processing
        
        // Remove SSG Official Team 56 line (anywhere)
        if (/ssg.*official|official.*team\s*\d+/i.test(trimmed)) continue;
        
        // Remove lines with "Official" + "Team"
        if (/official.*team/i.test(trimmed) || /team.*official/i.test(trimmed)) continue;
        
        // Remove lines with "Team" + number
        if (/team\s*\d+/i.test(trimmed)) continue;
        
        // Remove lines with "Group" + number
        if (/group\s*\d+/i.test(trimmed)) continue;
        
        // Remove lines that are > 60% decorative symbols
        const alnum = (trimmed.match(/[A-Za-z0-9]/g) || []).length;
        const total = trimmed.length;
        if (total > 2 && alnum / total < 0.2) {
            const decorative = /[═╔╗╚╝╦╩•✠✦✧★☆▪▫◆◇◈‣›»«‹•♠♣♦♥▶◀☠☢☣]/;
            if (decorative.test(trimmed)) continue;
        }
        
        // Keep everything else
        filteredLines.push(line);
    }
    
    cleaned = filteredLines.join('\n');
    
    // Clean extra newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
    
    return cleaned;
}

function createTargetBranding(targetGroupName) {
    if (!targetGroupName) targetGroupName = 'Target Group';
    return `╔═══•✠•═══╗\n  *${targetGroupName}*\n╚═══•✠•═══╝`;
}

async function smartProcessMessage(message, sourceGroupName, targetGroupName) {
    if (!message) return message;
    
    try {
        let processed = JSON.parse(JSON.stringify(message));
        const targetBranding = createTargetBranding(targetGroupName);
        
        const processText = (text) => {
            if (!text || typeof text !== 'string') return text;
            let cleaned = removeBrandingBlocks(text);
            if (cleaned && cleaned.length > 0) {
                return `${targetBranding}\n\n${cleaned}`;
            }
            return cleaned;
        };
        
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

async function getGroupName(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        return metadata?.subject || 'Group';
    } catch (e) {
        return 'Group';
    }
}

module.exports = {
    extractGroupKeywords,
    removeBrandingBlocks,
    createTargetBranding,
    smartProcessMessage,
    getGroupName
};