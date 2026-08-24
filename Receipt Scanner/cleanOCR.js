function cleanOCRText(text) {
    // Remove common OCR artifacts and special characters
    text = text.replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII
    text = text.replace(/Â¥|Â«|Â»|Â®|Â©|Â°/g, ''); // Remove specific artifacts
    text = text.replace(/[|~`^]/g, ''); // Remove confusing symbols
    
    // Fix common OCR letter confusion for Singapore merchants
    // Isetan
    text = text.replace(/\bT SINGAPORE\b/gi, 'ISETAN SINGAPORE');
    text = text.replace(/\bTSETAN\b/gi, 'ISETAN');
    text = text.replace(/\b1SETAN\b/gi, 'ISETAN');
    text = text.replace(/\bISETAN\b/gi, 'ISETAN');

    // Ichiban Boshi
    text = text.replace(/\bTCHIBAN\b/gi, 'ICHIBAN');
    text = text.replace(/\b1CHIBAN\b/gi, 'ICHIBAN');
    text = text.replace(/\bICHIRAN BOSHI\b/gi, 'ICHIBAN BOSHI');

    // FairPrice variations
    text = text.replace(/\bFa1rpr1ce\b/gi, 'FAIRPRICE');
    text = text.replace(/\bFa1rprice\b/gi, 'FAIRPRICE');
    text = text.replace(/\bFairpr1ce\b/gi, 'FAIRPRICE');
    text = text.replace(/\bFair Pr1ce\b/gi, 'FAIRPRICE');
    text = text.replace(/\bNTUC\s*Fa1rprice\b/gi, 'NTUC FAIRPRICE');
    
    // Cold Storage
    text = text.replace(/\bC0LD\s*ST0RAGE\b/gi, 'COLD STORAGE');
    text = text.replace(/\bC0LDSTORAGE\b/gi, 'COLD STORAGE');
    text = text.replace(/\bCOLD\s*ST0RAGE\b/gi, 'COLD STORAGE');
    text = text.replace(/\bC0LD\s*STORAGE\b/gi, 'COLD STORAGE');
    
    // Giant
    text = text.replace(/\bG1ANT\b/gi, 'GIANT');
    text = text.replace(/\bGlANT\b/gi, 'GIANT');
    
    // Sheng Siong
    text = text.replace(/\bSHENG\s*S10NG\b/gi, 'SHENG SIONG');
    text = text.replace(/\bSHENG\s*SlONG\b/gi, 'SHENG SIONG');
    
    // Prime / Cheers / 7-Eleven
    text = text.replace(/\bPR1ME\b/gi, 'PRIME');
    text = text.replace(/\bCHEERS\b/gi, 'CHEERS');
    text = text.replace(/\b7-ELEVEN\b/gi, '7-ELEVEN');
    text = text.replace(/\b7-ELEVEtl\b/gi, '7-ELEVEN');
    text = text.replace(/\b7\s*ELEVEN\b/gi, '7-ELEVEN');
    
    // Don Don Donki
    text = text.replace(/\bD0N\s*D0N\s*D0NKI\b/gi, 'DON DON DONKI');
    text = text.replace(/\bDON\s*DON\s*D0NKI\b/gi, 'DON DON DONKI');
    text = text.replace(/\bD0NK1\b/gi, 'DONKI');
    
    // Guardian / Watsons
    text = text.replace(/\bGUARD1AN\b/gi, 'GUARDIAN');
    text = text.replace(/\bWATS0NS\b/gi, 'WATSONS');
    text = text.replace(/\bWATSONS\b/gi, 'WATSONS');
    
    // Popular / Courts
    text = text.replace(/\bP0PULAR\b/gi, 'POPULAR');
    text = text.replace(/\bC0URTS\b/gi, 'COURTS');
    
    // McDonald's / KFC / Burger King
    text = text.replace(/\bMcD0NALD'?S\b/gi, 'MCDONALDS');
    text = text.replace(/\bMCDONALD'?S\b/gi, 'MCDONALDS');
    text = text.replace(/\bKFC\b/gi, 'KFC');
    text = text.replace(/\bBURGER\s*K1NG\b/gi, 'BURGER KING');
    
    // Uniqlo / Muji / Daiso
    text = text.replace(/\bUN1QLO\b/gi, 'UNIQLO');
    text = text.replace(/\bUNIQL0\b/gi, 'UNIQLO');
    text = text.replace(/\bMUJ1\b/gi, 'MUJI');
    text = text.replace(/\bDA1SO\b/gi, 'DAISO');
    text = text.replace(/\bDAIS0\b/gi, 'DAISO');
    
    // Common English words that might be misread
    text = text.replace(/\bHITCHEN\b/gi, 'KITCHEN');
    
    // Try to fix chunked text by detecting price patterns and adding line breaks
    // Add line break before prices that look like: 1.23 or $1.23 or 12.34
    text = text.replace(/(\d+\.\d{2})(?=\s+[A-Z])/g, '$1\n');
    
    // Add line break before common quantity patterns: 1pcs, 2x, 1kg
    text = text.replace(/\s+(\d+(?:pcs|pc|x|kg|g|ml|l)\b)/gi, '\n$1 ');
    
    // Add line break before "Description" and similar headers.
    // Word-bounded so this only matches the standalone header word (e.g. a
    // table header "Item Qty Price") and NOT "Item" as a mere substring of
    // another word — without \b this used to match inside "items" too (as
    // in "Total 1 items 2.70"), splitting that line right before the price
    // and silently dropping the receipt's total.
    text = text.replace(/\b(Description|Item|Product|Qty)\b/gi, '\n$1');
    
    // Add line break before parentheses that often indicate new items
    text = text.replace(/\)\s+([A-Z])/g, ')\n$1');
    
    // Normalize multiple spaces but preserve line breaks
    text = text.replace(/ +/g, ' ');
    text = text.replace(/\n\s+/g, '\n');
    
    return text;
}

// Levenshtein (edit) distance between two strings — counts the minimum
// number of single-character insertions/deletions/substitutions needed to
// turn `a` into `b`. Used by fuzzyMatchMerchant() below for merchant names
// not covered by the exact regex rules above.
function levenshteinDistance(a, b) {
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
                matrix[i - 1][j] + 1,       // deletion
                matrix[i][j - 1] + 1,       // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }
    return matrix[al][bl];
}

// Fuzzy-match a candidate merchant string against a reference list of known
// merchant names (see sgMerchants.js), catching OCR misreads that the exact
// regex rules in cleanOCRText() don't cover. Returns the closest reference
// name if it's within a length-scaled edit-distance tolerance, else null.
function fuzzyMatchMerchant(candidate, merchantList, maxDistanceRatio = 0.3) {
    if (!candidate || !merchantList || !merchantList.length) return null;
    let c = candidate.toUpperCase().trim();
    // Strip stray non-alphanumeric junk from both ends (e.g. OCR misreading
    // a receipt's decorative border as symbols glued to the real text, like
    // "H LUCKIN COFFEE }" picking up a trailing "}") so it doesn't eat into
    // the edit-distance tolerance below. Doesn't help with a stray *letter*
    // stuck on either end (that's a separate, unhandled case).
    c = c.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');
    if (c.length < 3) return null; // too short to fuzzy-match reliably

    let best = null;
    let bestDist = Infinity;

    for (const name of merchantList) {
        const n = name.toUpperCase();

        // Skip candidates whose length is wildly different from the
        // reference name — avoids nonsense matches on short/long lines.
        if (Math.abs(n.length - c.length) > Math.max(3, n.length * 0.5)) continue;

        const dist = levenshteinDistance(c, n);
        const maxAllowed = Math.max(2, Math.floor(n.length * maxDistanceRatio));
        if (dist <= maxAllowed && dist < bestDist) {
            bestDist = dist;
            best = name;
        }
    }

    return best;
}