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
    
    // Try to fix chunked text by detecting price patterns and adding line breaks
    // Add line break before prices that look like: 1.23 or $1.23 or 12.34
    text = text.replace(/(\d+\.\d{2})(?=\s+[A-Z])/g, '$1\n');
    
    // Add line break before common quantity patterns: 1pcs, 2x, 1kg
    text = text.replace(/\s+(\d+(?:pcs|pc|x|kg|g|ml|l)\b)/gi, '\n$1 ');
    
    // Add line break before "Description" and similar headers
    text = text.replace(/(Description|Item|Product|Qty)/gi, '\n$1');
    
    // Add line break before parentheses that often indicate new items
    text = text.replace(/\)\s+([A-Z])/g, ')\n$1');
    
    // Normalize multiple spaces but preserve line breaks
    text = text.replace(/ +/g, ' ');
    text = text.replace(/\n\s+/g, '\n');
    
    return text;
}