function parseReceipt(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    // Extract merchant - look for the first substantial non-numeric line
    let merchant = 'Unknown';
    const skipWords = ['receipt', 'tax', 'invoice', 'total', 'subtotal', 'date', 'time', 'thank', 'you'];
    
    for (const line of lines) {
        // Skip if too short, too long, starts with number, or contains common receipt words
        if (line.length < 3 || line.length > 50) continue;
        if (/^\d/.test(line)) continue;
        if (skipWords.some(w => line.toLowerCase().includes(w))) continue;
        
        // Look for lines with mostly letters (potential merchant name)
        const letterCount = (line.match(/[a-zA-Z]/g) || []).length;
        const digitCount = (line.match(/\d/g) || []).length;
        
        if (letterCount > 3 && letterCount > digitCount * 2) {
            merchant = line;
            break;
        }
    }
    
    // Extract date - normalize to DD/MM/YYYY format
    let date = '';
    const datePatterns = [
        /\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\b/g,  // DD/MM/YYYY or MM/DD/YYYY
        /\b(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\b/g,  // YYYY/MM/DD
        /\b([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})\b/gi  // Jan 15, 2025
    ];
    
    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            const raw = match[0];
            
            // Parse and normalize to DD/MM/YYYY
            if (/^\d{4}/.test(raw)) {
                // YYYY/MM/DD format
                const parts = raw.split(/[-\/]/);
                date = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
            } else if (/^[A-Z][a-z]{2}/.test(raw)) {
                // Month name format - keep as is
                date = raw;
            } else {
                // DD/MM/YYYY or MM/DD/YYYY - try to determine format
                const parts = raw.split(/[-\/]/);
                const num1 = parseInt(parts[0]);
                const num2 = parseInt(parts[1]);
                
                if (num1 > 12) {
                    // Must be DD/MM/YYYY
                    date = `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
                } else if (num2 > 12) {
                    // Must be MM/DD/YYYY, convert to DD/MM/YYYY
                    date = `${parts[1].padStart(2, '0')}/${parts[0].padStart(2, '0')}/${parts[2]}`;
                } else {
                    // Ambiguous - assume MM/DD/YYYY and convert to DD/MM/YYYY
                    date = `${parts[1].padStart(2, '0')}/${parts[0].padStart(2, '0')}/${parts[2]}`;
                }
            }
            break;
        }
    }
    
    // Extract total
    let total = 0;
    const totalPatterns = [
        /total[:\s]*\$?\s*(\d+[.,]\d{2})/gi,
        /amount[:\s]*\$?\s*(\d+[.,]\d{2})/gi,
        /grand\s*total[:\s]*\$?\s*(\d+[.,]\d{2})/gi,
        /balance[:\s]*\$?\s*(\d+[.,]\d{2})/gi,
        /\$\s*(\d+[.,]\d{2})/g
    ];
    
    for (const pattern of totalPatterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
            const amounts = matches.map(m => parseFloat(m[1].replace(',', '.')));
            total = Math.max(...amounts);
            break;
        }
    }
    
    return { merchant, date, total };
}
