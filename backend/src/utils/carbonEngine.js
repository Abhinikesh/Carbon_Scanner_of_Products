const emissionFactors = require('../data/emissionFactors.json');
const airports = require('../data/airports.json');
const { getDistanceKm } = require('./haversine');
const { matchSpendCategory, matchMaterialCategory } = require('./categoryMatcher');

/**
 * Rounds a number to a specific number of decimals.
 */
function round(value, decimals = 2) {
  if (value == null || isNaN(value)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Clamps a number between a minimum and a maximum value.
 */
function clamp(value, min = 0, max = 100) {
  if (value == null || isNaN(value)) return null;
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculates carbon footprint for a receipt based on spend amount and category.
 */
function calculateReceiptCarbon(categoryKey, amount) {
  const factor = emissionFactors.spendCategories[categoryKey].factorPerDollar;
  const co2Kg = round(factor * amount, 2);
  const { spendCategoryMin, spendCategoryMax } = emissionFactors.scoreNormalization;
  const score = clamp(
    round(
      100 -
        ((factor - spendCategoryMin) / (spendCategoryMax - spendCategoryMin)) *
          100
    ),
    0,
    100
  );
  return {
    category: emissionFactors.spendCategories[categoryKey].label,
    categoryKey,
    co2Kg,
    score,
    calculationMethod: 'spend-based'
  };
}

/**
 * Calculates carbon footprint for a product based on its material category.
 */
function calculateProductCarbon(materialKey) {
  const co2Kg = emissionFactors.materialCategories[materialKey].co2PerItem;
  const { materialMin, materialMax } = emissionFactors.scoreNormalization;
  const score = clamp(
    round(
      100 -
        ((co2Kg - materialMin) / (materialMax - materialMin)) * 100
    ),
    0,
    100
  );
  return {
    category: emissionFactors.materialCategories[materialKey].label,
    categoryKey: materialKey,
    co2Kg,
    score,
    calculationMethod: 'material-average'
  };
}

/**
 * Calculates carbon footprint for a flight between two valid IATA airport codes.
 */
function calculateFlightCarbon(code1, code2) {
  const airport1 = airports[code1];
  const airport2 = airports[code2];

  if (!airport1 || !airport2) {
    return {
      category: 'Flight (unverified route)',
      categoryKey: 'flight',
      co2Kg: null,
      score: null,
      calculationMethod: 'insufficient-data',
      note: 'Could not identify two valid airport codes from the extracted text. Distance could not be calculated.'
    };
  }

  const distanceKm = getDistanceKm(airport1.lat, airport1.lon, airport2.lat, airport2.lon);

  let factor;
  if (distanceKm < 500) {
    factor = emissionFactors.flightFactors.domesticPerKm;
  } else if (distanceKm < emissionFactors.flightFactors.shortHaulThresholdKm) {
    factor = emissionFactors.flightFactors.shortHaulPerKm;
  } else {
    factor = emissionFactors.flightFactors.longHaulPerKm;
  }

  const co2Kg = round(distanceKm * factor, 1);
  const score = clamp(round(100 - co2Kg / 50), 0, 100);

  return {
    category: `Flight (${code1} → ${code2})`,
    categoryKey: 'flight',
    co2Kg,
    score,
    distanceKm: round(distanceKm),
    calculationMethod: 'distance-based'
  };
}

/**
 * Queries Open Food Facts and returns carbon estimation metrics.
 */
async function calculateBarcodeCarbon(barcodeValue) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcodeValue}.json`);
    if (!response.ok) {
      throw new Error(`Open Food Facts API responded with status ${response.status}`);
    }
    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return {
        category: 'Unknown product',
        categoryKey: null,
        co2Kg: null,
        score: null,
        calculationMethod: 'not-found',
        note: "This barcode wasn't found in Open Food Facts. It may not be a packaged food product, or isn't in their database yet. You can set a category manually."
      };
    }

    const product = data.product;
    console.log('[Carbon Engine] OFF ecoscore_data:', JSON.stringify(product.ecoscore_data));

    const categoryName = product.product_name || product.categories || 'Unknown product';

    // Parse product details to match foodPerKg keys
    const nameStr = (product.product_name || '').toLowerCase();
    const tagsStr = (product.categories_tags || []).join(' ').toLowerCase();
    const combinedStr = `${nameStr} ${tagsStr}`;

    let categoryKey = null;
    const foodKeys = ['beef', 'lamb', 'pork', 'poultry', 'fish', 'eggs', 'cheese', 'milk', 'rice', 'tofu', 'vegetables', 'fruit', 'legumes', 'grains'];
    for (const key of foodKeys) {
      if (combinedStr.includes(key)) {
        categoryKey = key;
        break;
      }
    }

    // Priority 1: agribalyse co2_total
    const agribalyseCo2 = product.ecoscore_data?.agribalyse?.co2_total;
    if (agribalyseCo2 != null && !isNaN(parseFloat(agribalyseCo2))) {
      const co2Kg = round(parseFloat(agribalyseCo2), 2);

      let score = null;
      if (product.ecoscore_score != null && typeof product.ecoscore_score === 'number') {
        score = product.ecoscore_score;
      } else if (product.ecoscore_grade) {
        const gradeMap = { a: 90, b: 75, c: 55, d: 35, e: 15 };
        score = gradeMap[product.ecoscore_grade.toLowerCase()] || null;
      }

      return {
        category: categoryName,
        categoryKey,
        co2Kg,
        score,
        calculationMethod: 'openfoodfacts-agribalyse'
      };
    }

    // Priority 2: ecoscore grade mapping
    if (product.ecoscore_grade) {
      const gradeMap = { a: 90, b: 75, c: 55, d: 35, e: 15 };
      const score = gradeMap[product.ecoscore_grade.toLowerCase()] || null;

      let co2Kg = null;
      if (product.categories_tags && Array.isArray(product.categories_tags)) {
        const allCategoryTagsString = product.categories_tags.join(' ').toLowerCase();
        for (const [key, value] of Object.entries(emissionFactors.foodPerKg)) {
          if (allCategoryTagsString.includes(key)) {
            co2Kg = value;
            break;
          }
        }
      }

      return {
        category: categoryName,
        categoryKey,
        co2Kg,
        score,
        calculationMethod: 'openfoodfacts-ecoscore-grade'
      };
    }

    // Priority 3: neither present
    return {
      category: categoryName,
      categoryKey,
      co2Kg: null,
      score: null,
      calculationMethod: 'no-carbon-data',
      note: 'Found the product but no carbon data was available for it.'
    };
  } catch (error) {
    console.error('[Carbon Engine] Error fetching from Open Food Facts:', error.message);
    return {
      category: 'Unknown product',
      categoryKey: null,
      co2Kg: null,
      score: null,
      calculationMethod: 'lookup-failed',
      note: 'Could not reach Open Food Facts. Try again or enter a category manually.'
    };
  }
}

/**
 * Calculates carbon emissions based on scan type.
 *
 * @param {string} scanType - 'receipt' | 'product' | 'flight' | 'barcode'
 * @param {object} parsedFields - Parsed text fields
 * @param {string} barcodeValue - Barcode digit string
 * @param {string[]} aiLabels - AI-predicted image labels (from client-side classifier)
 * @returns {Promise<object>} - Carbon result payload
 */
async function calculateCarbon(scanType, parsedFields = {}, barcodeValue = null, aiLabels = []) {
  if (scanType === 'receipt') {
    const storeName = parsedFields.storeName || '';
    const itemLines = parsedFields.itemLines || [];
    const searchText = storeName + ' ' + itemLines.join(' ');

    const categoryKey = matchSpendCategory(searchText);

    let amount = parseFloat(parsedFields.totalAmount);
    let estimatedAmount = false;
    if (isNaN(amount) || amount <= 0) {
      amount = 25.0;
      estimatedAmount = true;
    }

    const { calculateReceiptBreakdown } = require('./receiptEngine');
    const itemsInput = parsedFields.extractedItems || parsedFields.receiptItems || [];
    const rawTextForBreakdown = parsedFields.rawText || itemLines.join('\n');
    const breakdown = calculateReceiptBreakdown(itemsInput, amount, rawTextForBreakdown);

    const result = calculateReceiptCarbon(categoryKey, amount);

    let finalCo2 = result.co2Kg;
    if (breakdown && breakdown.totalCartCo2Kg > 0) {
      finalCo2 = breakdown.totalCartCo2Kg;
    }

    return {
      ...result,
      co2Kg: finalCo2,
      estimatedAmount,
      receiptBreakdown: breakdown
    };
  }

  if (scanType === 'product') {
    // Combine OCR-derived text and AI-predicted labels into one search string.
    // matchMaterialCategory returns null when nothing matches — this is correct
    // and must produce an honest "Unidentified" result, not a guess.
    const searchText = (parsedFields.productNameGuess || '') + ' ' + aiLabels.join(' ');
    const materialKey = matchMaterialCategory(searchText);

    if (materialKey === null) {
      return {
        category: 'Unidentified',
        categoryKey: null,
        co2Kg: null,
        score: null,
        calculationMethod: 'unidentified',
        note: 'No readable product text or recognizable object was found. You can set a category manually.'
      };
    }

    return calculateProductCarbon(materialKey);
  }

  if (scanType === 'flight') {
    const airportCodes = parsedFields.airportCodes || [];
    // Get upper-case unique valid codes
    const validCodes = airportCodes
      .map((code) => code.toUpperCase())
      .filter((code) => airports[code] != null);

    if (validCodes.length < 2) {
      return {
        category: 'Flight (unverified route)',
        categoryKey: 'flight',
        co2Kg: null,
        score: null,
        calculationMethod: 'insufficient-data',
        note: 'Could not identify two valid airport codes from the extracted text. Distance could not be calculated.'
      };
    }

    return calculateFlightCarbon(validCodes[0], validCodes[1]);
  }

  if (scanType === 'barcode') {
    return calculateBarcodeCarbon(barcodeValue);
  }

  return {
    category: 'General Scan',
    categoryKey: null,
    co2Kg: null,
    score: null,
    calculationMethod: 'unknown'
  };
}

module.exports = {
  calculateCarbon,
  calculateReceiptCarbon,
  calculateProductCarbon,
  calculateFlightCarbon,
  calculateBarcodeCarbon
};
