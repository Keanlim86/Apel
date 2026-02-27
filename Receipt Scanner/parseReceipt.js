function parseReceipt(text) {
    let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);

    let total = 0;
    let subtotal = 0;
    let gst = 0;
    let date = '';
    let merchant = '';

    // 1️⃣ Find merchant (first 5 lines, mostly letters)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        const letterCount = (line.match(/[a-zA-Z]/g) || []).length;
        const digitCount = (line.match(/\d/g) || []).length;
        if (letterCount > 3 && letterCount > digitCount * 2) {
            merchant = line;
            break;
        }
    }

    // 2️⃣ Find date
    const datePatterns = [
        /\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/,
        /\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/,
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/i,
        /Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    ];
    
    for (const line of lines) {
        for (const pattern of datePatterns) {
            const match = line.match(pattern);
            if (match) {
                date = match[1] || match[0];
                break;
            }
        }
        if (date) break;
    }

    // 3️⃣ Extract prices from lines
    const pricePattern = /\$?\s*(\d+\.\d{2})\b/g;
    const spacedPricePattern = /\$?\s*\d+\s*\.\s*\d{2}\b/g;
    const subtotalPattern = /\bsub[\s-]?to?t?a?l\b/i;
    const subtotalVariants = /\b(subfotal|subtatal|subt0tal|sub-total)\b/i;
    const totalPattern = /\btotal\b/i;
    const taxPattern = /\b(G[S5]T|G5T|GST|65T|included|incl|Inc\.\s*9%\s*GST|GST\s*9%)\b/i;

    // Helper: fuzzy subtotal detection
    function isLikelySubtotal(line) {
        if (!line) return false;
        if (subtotalPattern.test(line) || subtotalVariants.test(line)) return true;
        const tokens = line.split(/\s|[:\-]/).map(t => t.replace(/[^a-zA-Z]/g, '').toLowerCase()).filter(Boolean);
        for (const t of tokens) {
            if (t.length < 4) continue;
            const dist = levenshteinDist(t, 'subtotal');
            if (dist <= 2) return true;
        }
        return false;
    }

    // Helper: Levenshtein distance for fuzzy matching
    function levenshteinDist(a, b) {
        if (a === b) return 0;
        const al = a.length, bl = b.length;
        if (al === 0) return bl;
        if (bl === 0) return al;
        const matrix = Array.from({ length: al + 1 }, () => new Array(bl + 1));
        for (let i = 0; i <= al; i++) matrix[i][0] = i;
        for (let j = 0; j <= bl; j++) matrix[0][j] = j;
        for (let i = 1; i <= al; i++) {
            for (let j = 1; j <= bl; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[al][bl];
    }

    // Helper: extract price from line (handles spaced prices like "6. 30")
    function extractPriceFromLine(line) {
        if (!line) return null;
        const spacedRe = /\$?\s*(\d+)\s*\.\s*(\d{2})(?!\d)/g;
        const standardRe = /\$?\s*(\d+\.\d{2})(?!\d)/g;

        const spacedMatches = [...line.matchAll(spacedRe)];
        if (spacedMatches.length > 0) {
            const m = spacedMatches[spacedMatches.length - 1];
            return parseFloat(m[1] + '.' + m[2]);
        }

        const stdMatches = [...line.matchAll(standardRe)];
        if (stdMatches.length > 0) {
            const m = stdMatches[stdMatches.length - 1];
            return parseFloat(m[1].replace(',', '.'));
        }

        return null;
    }

    // Scan all lines for subtotal, total, and GST
    for (let line of lines) {
        const lowerLine = line.toLowerCase();
        let price = extractPriceFromLine(line);
        
        if (price === null) {
            const matches = [...line.matchAll(pricePattern)];
            if (matches.length > 0) {
                price = parseFloat(matches[matches.length - 1][1].replace(',', '.'));
            }
        }

        if (price !== null) {
            // Check for GST/tax
            if (taxPattern.test(lowerLine)) {
                gst = price;
            }
            // Check for subtotal (only set on first match)
            else if (isLikelySubtotal(lowerLine)) {
                if (!subtotal) subtotal = price;
            }
            // Check for total
            else if (totalPattern.test(lowerLine) && !isLikelySubtotal(lowerLine)) {
                total = price;
            }
        }
    }

    // If no total found, use subtotal
    if (!total && subtotal) {
        total = subtotal;
    }

    return { merchant, date, subtotal, gst, total };
}
