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
            merchant = line.toUpperCase();
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

    // Fallback date parsing if not found yet
    if (!date) {
        const fallbackDatePattern = /(\d{2})(\d{2})(\d{2,4})/; // DDMMYY(YY)
        const slashAs7Pattern = /\b(\d{1,2})7(\d{1,2})7(\d{2,4})\b/;

        for (const line of lines) {
            // Try slash-as-7 pattern first, as it's more specific for cases like '237472026'
            let match = line.match(slashAs7Pattern);
            if (match) {
                let d = parseInt(match[1], 10);
                let m = parseInt(match[2], 10);
                let y = parseInt(match[3], 10);
                if (y < 100) y += 2000;

                if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y > 2000 && y < 2100) {
                    date = `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
                    break; // Date found, exit fallback loop
                }
            }

            // Then try DDMMYYYY pattern on digit-only string
            const digitOnlyLine = line.replace(/\D/g, '');
            if (digitOnlyLine.length >= 6) {
                match = digitOnlyLine.match(fallbackDatePattern);
                if (match) {
                    let d = parseInt(match[1], 10);
                    let m = parseInt(match[2], 10);
                    let y = parseInt(match[3], 10);

                    // Handle 2-digit year
                    if (y < 100) y += 2000;

                    if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y > 2000 && y < 2100) {
                        date = `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
                        break; // Date found, exit fallback loop
                    }
                }
            }
        }
    }

    // 3️⃣ Standardize date format to DD/MM/YYYY
    if (date) {
        try {
            let day, month, year;
            // Regex to specifically handle DD-MM-YYYY or DD/MM/YYYY
            const dd_mm_yyyy = date.match(/^(\d{1,2})-\/-\/$/);

            if (dd_mm_yyyy) {
                day = parseInt(dd_mm_yyyy[1], 10);
                month = parseInt(dd_mm_yyyy[2], 10);
                year = parseInt(dd_mm_yyyy[3], 10);
                if (year < 100) year += 2000; // Handle 2-digit year
            } else {
                // Fallback for other formats like YYYY-MM-DD or "Jan 01, 2024"
                const d = new Date(date);
                if (!isNaN(d.getTime())) {
                    day = d.getDate();
                    month = d.getMonth() + 1;
                    year = d.getFullYear();
                }
            }

            if (day && month && year) {
                date = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
            }
        } catch (e) {
            console.warn("Could not standardize date format for:", date);
        }
    }

    // 4️⃣ Extract prices from lines
    const pricePattern = /\$?\s*(\d+\.\d{2})\b/g;
    const spacedPricePattern = /\$?\s*\d+\s*\.\s*\d{2}\b/g;
    const subtotalPattern = /\bsub[\s-]?to?t?a?l\b/i;
    const subtotalVariants = /\b(subfotal|subtatal|subt0tal|sub-total)\b/i;
    const totalPattern = /\btotal\b/i;
    const taxPattern = /\b(G[S5]T|G5T|GST|65T|included|incl|Inc\.\s*9%\s*GST|GST\s*9%)\b/i;
    // Matches adjustment lines like "Total Discount -3.30". These contain
    // the word "total" too, so without this check whichever of "Total
    // Discount" or the real "Total" line happens to come last in the OCR'd
    // text (not necessarily the receipt's printed order) would silently
    // overwrite the correct total.
    const discountPattern = /\bdiscount(s)?\b/i;

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
            // Discount/adjustment lines aren't the total — skip them so they
            // can never be picked up by the totalPattern check below.
            else if (discountPattern.test(lowerLine)) {
                // intentionally not classified as subtotal/total/item
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

    // 5️⃣ Normalize merchant (fix known OCR variants missed by cleanOCR.js)
    merchant = normalizeMerchant(merchant, text);

    return { merchant, date, subtotal, gst, total };
}

function normalizeMerchant(merchant, fullText) {
    // Normalize common merchant OCR variants using heuristics
    const t = (fullText || '').toUpperCase();
    let normalized = merchant;

    // ISETAN variants seen in OCR: ISETAN, TSETAN, 1SETAN, IBETAN, IBETaN (from PDFs)
    if (/ISETAN|TSETAN|1SETAN|IBETAN|I\s*B\s*E\s*T\s*A\s*N/gi.test(t)) {
        normalized = /SINGAPORE/i.test(t) ? 'ISETAN SINGAPORE' : 'ISETAN';
    }

    // If merchant was just 'SINGAPORE' but text contains ISETAN-like tokens, prefer the full name
    if (/^SINGAPORE$/i.test(merchant) && /ISETAN|TSETAN|1SETAN|IBETAN/i.test(t)) {
        normalized = 'ISETAN SINGAPORE';
    }

    // Fuzzy fallback against the full Singapore merchant reference list
    // (sgMerchants.js), for misreads not covered by the rules above.
    if (normalized === merchant && typeof SG_MERCHANTS !== 'undefined' && typeof fuzzyMatchMerchant === 'function') {
        const fuzzyMatch = fuzzyMatchMerchant(normalized, SG_MERCHANTS);
        if (fuzzyMatch) normalized = fuzzyMatch.toUpperCase();
    }

    if (normalized !== merchant) console.log('Merchant normalized from', merchant, 'to', normalized);
    return normalized;
}
