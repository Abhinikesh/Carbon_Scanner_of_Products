/**
 * Parses OCR extracted text based on scan type.
 * Note: This is intentionally simple regex-based parsing, not machine learning (ML).
 * It acts as a lightweight first-pass heuristic suitable for a v1 implementation
 * and can be upgraded to a more robust parser or LLM-based extraction in the future.
 *
 * @param {string} type - The scan type ('product', 'receipt', 'flight', 'barcode')
 * @param {string} rawText - The OCR raw text output
 * @returns {object} - The parsed fields object
 */
function parseFields(type, rawText = '') {
  if (!rawText) return {};

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  if (type === 'receipt') {
    // 1. Guess storeName as the first non-empty trimmed line of rawText
    const storeName = lines[0] || null;

    // 2. Find total amount: try patterns like /total[:\s]*\$?\s*(\d+\.\d{2})/i
    let totalAmount = null;
    const totalRegex = /total[:\s]*\$?\s*(\d+\.\d{2})/i;
    const totalMatch = rawText.match(totalRegex);

    if (totalMatch) {
      totalAmount = parseFloat(totalMatch[1]);
    } else {
      // Fallback: try finding all dollar amounts like /\$\s*(\d+\.\d{2})/g and take the largest
      const dollarMatches = [...rawText.matchAll(/\$\s*(\d+\.\d{2})/g)];
      if (dollarMatches.length > 0) {
        const amounts = dollarMatches.map(m => parseFloat(m[1]));
        totalAmount = Math.max(...amounts);
      }
    }

    // 3. Extract itemLines: lines that aren't the total line
    const totalLineRegex = /total/i;
    const itemLines = [];
    for (const line of lines) {
      if (itemLines.length >= 15) break;
      if (totalLineRegex.test(line)) continue;
      itemLines.push(line);
    }

    // Extract itemized items using receiptEngine
    const { parseReceiptItemsFromText } = require('./receiptEngine');
    const receiptItems = parseReceiptItemsFromText(rawText);

    return {
      storeName,
      totalAmount,
      itemLines,
      receiptItems
    };
  }

  if (type === 'flight') {
    // 1. Find 3-letter airport codes (\b[A-Z]{3}\b), unique matches
    const airportCodesRegex = /\b[A-Z]{3}\b/g;
    const airportCodes = [...new Set(rawText.match(airportCodesRegex) || [])];

    // 2. Find flight number pattern (\b[A-Z]{2}\d{3,4}\b)
    const flightRegex = /\b[A-Z]{2}\d{3,4}\b/;
    const flightMatch = rawText.match(flightRegex);
    const flightNumber = flightMatch ? flightMatch[0] : null;

    // 3. Find any date-like pattern (\d{1,2}[\/\-][A-Za-z]{3}|\d{1,2}\/\d{1,2}\/\d{2,4})
    const dateRegex = /\d{1,2}[\/\-][A-Za-z]{3}|\d{1,2}\/\d{1,2}\/\d{2,4}/;
    const dateMatch = rawText.match(dateRegex);
    const dateGuess = dateMatch ? dateMatch[0] : null;

    return {
      airportCodes,
      flightNumber,
      dateGuess
    };
  }

  if (type === 'product') {
    const productNameGuess = lines[0] || null;
    return {
      productNameGuess
    };
  }

  // Barcode type doesn't need text parsing as it is already decoded client-side
  return {};
}

module.exports = { parseFields };
