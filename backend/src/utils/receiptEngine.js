/**
 * Multi-Item Receipt Breakdown Engine
 *
 * Parses line items from grocery and retail receipts, calculates individual
 * carbon footprints based on lifecycle emission factors (DEFRA, EPA, Poore & Nemecek 2018),
 * and highlights the #1 Carbon Offender in the shopping cart.
 */

const ITEM_EMISSION_PROFILES = [
  {
    key: 'beef',
    match: /\b(beef|steak|ground\s*beef|sirloin|ribeye|burger|mince|veal|roast\s*beef|filet|meatball)\b/i,
    label: 'Beef / Red Meat',
    co2PerKg: 60.0,
    defaultPortionKg: 0.35,
    tip: 'Red meat is responsible for the highest carbon intensity in grocery carts (~60 kg CO₂e/kg). Swapping beef for chicken, fish, or lentils cuts emissions by up to 90%.'
  },
  {
    key: 'lamb',
    match: /\b(lamb|mutton|chops)\b/i,
    label: 'Lamb & Mutton',
    co2PerKg: 24.0,
    defaultPortionKg: 0.30,
    tip: 'Lamb generates substantial enteric methane (~24 kg CO₂e/kg). Opting for beans, tofu, or poultry saves significant emissions.'
  },
  {
    key: 'cheese',
    match: /\b(cheese|cheddar|mozzarella|parmesan|brie|gouda|feta|swiss|butter|ghee)\b/i,
    label: 'Cheese & Dairy Fats',
    co2PerKg: 21.0,
    defaultPortionKg: 0.25,
    tip: 'Cheese requires ~10L of milk per kg, carrying ~21 kg CO₂e/kg. Moderating portion sizes or trying plant-based cheese drops impact dramatically.'
  },
  {
    key: 'coffeeChocolate',
    match: /\b(coffee|espresso|latte|cappuccino|chocolate|cocoa|candy\s*bar)\b/i,
    label: 'Coffee & Chocolate',
    co2PerKg: 17.0,
    defaultPortionKg: 0.25,
    tip: 'Coffee and cocoa have land-use and intensive drying emissions (~17 kg CO₂e/kg). Look for shade-grown, Rainforest Alliance, or Fairtrade certifications.'
  },
  {
    key: 'pork',
    match: /\b(pork|bacon|ham|sausage|prosciutto|salami|chorizo|pancetta)\b/i,
    label: 'Pork & Bacon',
    co2PerKg: 7.0,
    defaultPortionKg: 0.35,
    tip: 'Pork emits ~7 kg CO₂e/kg. Replacing with plant protein, legumes, or poultry helps lower dietary emissions.'
  },
  {
    key: 'poultry',
    match: /\b(chicken|poultry|turkey|duck|wings|breast|thighs|drumstick|tenders|nugget)\b/i,
    label: 'Poultry & Chicken',
    co2PerKg: 6.0,
    defaultPortionKg: 0.45,
    tip: 'Poultry produces ~6 kg CO₂e/kg — noticeably greener than red meat, but plant proteins like lentils or tofu produce ~80% less CO₂.'
  },
  {
    key: 'fish',
    match: /\b(fish|salmon|tuna|shrimp|prawn|cod|tilapia|seafood|crab|lobster|sardine|trout)\b/i,
    label: 'Fish & Seafood',
    co2PerKg: 5.0,
    defaultPortionKg: 0.35,
    tip: 'Fish and seafood average ~5 kg CO₂e/kg. Look for MSC-certified wild catch or sustainably farmed shellfish.'
  },
  {
    key: 'eggs',
    match: /\b(egg|eggs|egg\s*carton)\b/i,
    label: 'Eggs',
    co2PerKg: 4.5,
    defaultPortionKg: 0.30,
    tip: 'Eggs have moderate emissions (~4.5 kg CO₂e/kg). Pasture-raised eggs or occasional tofu scrambles offer lower footprints.'
  },
  {
    key: 'rice',
    match: /\b(rice|basmati|jasmine|arborio)\b/i,
    label: 'Rice',
    co2PerKg: 4.0,
    defaultPortionKg: 0.40,
    tip: 'Paddy rice produces flooded methane emissions (~4 kg CO₂e/kg). Whole grains, pasta, or potatoes offer lower-carbon starch alternatives.'
  },
  {
    key: 'detergent',
    match: /\b(detergent|soap|tide|dawn|shampoo|conditioner|cleaner|bleach|softener|dish\s*soap|pods|body\s*wash|sponge|windex|cascade|lysol)\b/i,
    label: 'Cleaning & Detergent',
    co2PerKg: 3.5,
    defaultPortionKg: 0.80,
    tip: 'Liquid detergents in heavy single-use plastic jugs have substantial manufacturing and shipping footprints. Concentrated refill pouches or dissolvable sheets cut packaging emissions by 85%.'
  },
  {
    key: 'plantMilk',
    match: /\b(almond\s*milk|oat\s*milk|soy\s*milk|coconut\s*milk|pea\s*milk|cashew\s*milk|plant\s*milk)\b/i,
    label: 'Plant-Based Milk',
    co2PerKg: 0.9,
    defaultPortionKg: 1.00,
    tip: 'Plant milks have ~70-80% lower greenhouse gas emissions and use far less land and water than dairy.'
  },
  {
    key: 'milk',
    match: /\b(milk|dairy|yogurt|yoghurt|kefir|cream|sour\s*cream|half\s*and\s*half)\b/i,
    label: 'Dairy Milk & Yogurt',
    co2PerKg: 3.0,
    defaultPortionKg: 1.00,
    tip: 'Cow milk generates ~3 kg CO₂e per liter. Switching to oat or soy milk drops emissions by over 70%.'
  },
  {
    key: 'tofu',
    match: /\b(tofu|tempeh|seitan|edamame)\b/i,
    label: 'Tofu & Plant Protein',
    co2PerKg: 3.0,
    defaultPortionKg: 0.35,
    tip: 'Tofu is a climate-friendly protein superstar (~3 kg CO₂e/kg), generating 95% fewer emissions than beef.'
  },
  {
    key: 'paperGoods',
    match: /\b(paper\s*towel|toilet\s*paper|napkin|tissue|wipes|foil|trash\s*bag|aluminum\s*foil)\b/i,
    label: 'Paper & Household Goods',
    co2PerKg: 1.5,
    defaultPortionKg: 0.50,
    tip: 'Paper goods consume trees and bleaching chemicals. Choosing 100% post-consumer recycled or bamboo paper protects standing forests.'
  },
  {
    key: 'grains',
    match: /\b(bread|pasta|spaghetti|noodle|flour|oat|oats|cereal|bagel|tortilla|cracker|toast|sourdough|croissant|bun)\b/i,
    label: 'Grains & Bakery',
    co2PerKg: 1.1,
    defaultPortionKg: 0.50,
    tip: 'Grains and fresh bakery goods have low emissions (~1.1 kg CO₂e/kg). Choosing unpackaged bakery bread avoids plastic waste.'
  },
  {
    key: 'legumes',
    match: /\b(bean|beans|chickpea|chickpeas|lentil|lentils|pea|peas|hummus|black\s*beans|kidney\s*beans)\b/i,
    label: 'Legumes & Pulses',
    co2PerKg: 1.0,
    defaultPortionKg: 0.40,
    tip: 'Legumes naturally fix nitrogen into the soil without synthetic fertilizers, making them one of the lowest-carbon foods on Earth.'
  },
  {
    key: 'fruit',
    match: /\b(apple|apples|banana|bananas|orange|oranges|berry|berries|grape|grapes|strawberry|strawberries|blueberry|blueberries|lemon|lime|mango|peach|avocado|melon|watermelon|pear|plum|cherry|cherries)\b/i,
    label: 'Fresh Fruit',
    co2PerKg: 0.5,
    defaultPortionKg: 0.60,
    tip: 'Fresh fruit has a very low carbon footprint (~0.5 kg CO₂e/kg). Buying local in-season fruit avoids heated greenhouses and air freight.'
  },
  {
    key: 'vegetables',
    match: /\b(spinach|lettuce|salad|tomato|tomatoes|potato|potatoes|onion|onions|carrot|carrots|broccoli|cucumber|kale|pepper|peppers|mushroom|mushrooms|greens|veggie|vegetable|vegetables|zucchini|cauliflower|celery|garlic)\b/i,
    label: 'Fresh Vegetables',
    co2PerKg: 0.4,
    defaultPortionKg: 0.50,
    tip: 'Vegetables are among the lowest-emission foods on the planet (~0.4 kg CO₂e/kg). Outstanding choice for the climate!'
  },
  {
    key: 'general',
    match: /.*/,
    label: 'Packaged Grocery',
    co2PerKg: 2.0,
    defaultPortionKg: 0.50,
    tip: 'Packaged grocery item. Buying in bulk sizes and minimizing single-use packaging helps lower lifetime product emissions.'
  }
];

// Patterns that identify receipt non-item lines (headers, footers, totals, metadata)
const RECEIPT_NOISE_PATTERNS = [
  /subtotal/i,
  /\btotal\b/i,
  /\btax\b/i,
  /change\s*due/i,
  /\bcash\b/i,
  /\bvisa\b/i,
  /\bmastercard\b/i,
  /\bamex\b/i,
  /\bdebit\b/i,
  /\bcredit\b/i,
  /thank\s*you/i,
  /store\s*#/i,
  /tel:?/i,
  /phone:?/i,
  /welcome/i,
  /cashier/i,
  /balance/i,
  /approved/i,
  /auth\s*code/i,
  /customer\s*copy/i,
  /items?\s*sold/i,
  /savings/i,
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
  /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/i
];

/**
 * Parses line items from receipt text.
 *
 * @param {string} rawText - Raw OCR text
 * @returns {Array<{name: string, price: number|null, raw: string}>}
 */
function parseReceiptItemsFromText(rawText = '') {
  if (!rawText) return [];

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const parsedItems = [];

  // Skip lines until after apparent store header, and filter out metadata
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line matches non-item noise
    if (RECEIPT_NOISE_PATTERNS.some((pattern) => pattern.test(line))) {
      continue;
    }

    // Ignore very short or purely numeric lines
    if (line.length < 3 || /^\d+$/.test(line)) {
      continue;
    }

    // Check for trailing price like '12.99' or '$12.99'
    const priceMatch = line.match(/\$?\s*(\d+\.\d{2})\s*$/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      const name = line.replace(/\$?\s*\d+\.\d{2}\s*$/, '').trim();
      if (name.length >= 2) {
        parsedItems.push({
          name: cleanItemName(name),
          price,
          raw: line
        });
      }
    } else {
      // Check if line contains any recognizable grocery keyword
      const hasGroceryKeyword = ITEM_EMISSION_PROFILES.slice(0, -1).some((p) =>
        p.match.test(line)
      );

      if (hasGroceryKeyword) {
        parsedItems.push({
          name: cleanItemName(line),
          price: null,
          raw: line
        });
      }
    }
  }

  return parsedItems;
}

/**
 * Cleans up raw line text into readable item titles.
 */
function cleanItemName(str = '') {
  return str
    .replace(/^[\d\s*xX#\-_.]+/, '') // strip leading bullet or quantity e.g. "1x " or "# "
    .replace(/[$@]\s*[\d.]+/g, '') // strip internal price tags
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Calculates the multi-item carbon breakdown for a receipt.
 *
 * @param {Array<object>} extractedItems - Pre-parsed items [{name, price, category?}]
 * @param {number|null} totalAmount - Total receipt spend if known
 * @param {string} rawText - OCR text for fallback parsing
 * @returns {object} Breakdown payload
 */
function calculateReceiptBreakdown(extractedItems = [], totalAmount = null, rawText = '') {
  let itemsToProcess = [];

  if (Array.isArray(extractedItems) && extractedItems.length > 0) {
    itemsToProcess = extractedItems.map((item) => ({
      name: cleanItemName(typeof item === 'string' ? item : item.name || item.raw || 'Item'),
      price: item.price != null ? parseFloat(item.price) : null,
      raw: item.raw || item.name || ''
    }));
  } else if (rawText) {
    itemsToProcess = parseReceiptItemsFromText(rawText);
  }

  // If no items could be parsed, provide a graceful fallback or empty breakdown
  if (itemsToProcess.length === 0) {
    return null;
  }

  // Calculate carbon footprint for each item
  const evaluatedItems = itemsToProcess.map((item) => {
    const matchedProfile =
      ITEM_EMISSION_PROFILES.find((p) => p.match.test(item.name)) ||
      ITEM_EMISSION_PROFILES[ITEM_EMISSION_PROFILES.length - 1]; // fallback 'general'

    // Emission calculation:
    // If price is known and > 0, estimate portion weight proportional to price or use standard portion
    let weightKg = matchedProfile.defaultPortionKg;
    if (item.price && item.price > 0) {
      if (item.price > 15 && matchedProfile.key === 'beef') weightKg = 0.5;
      else if (item.price > 10 && matchedProfile.key === 'poultry') weightKg = 0.8;
      else if (item.price > 10 && matchedProfile.key === 'detergent') weightKg = 1.0;
    }

    const co2Kg = Math.round(matchedProfile.co2PerKg * weightKg * 100) / 100;

    return {
      name: item.name,
      categoryKey: matchedProfile.key,
      category: matchedProfile.label,
      co2Kg,
      price: item.price,
      tip: matchedProfile.tip,
      isTopOffender: false
    };
  });

  // Calculate total cart CO2 from items
  const totalCartCo2Kg = Math.round(
    evaluatedItems.reduce((sum, item) => sum + item.co2Kg, 0) * 100
  ) / 100;

  // Sort items in descending order of CO2 footprint
  evaluatedItems.sort((a, b) => b.co2Kg - a.co2Kg);

  // Compute percentages & mark top offender
  evaluatedItems.forEach((item, index) => {
    item.percentage =
      totalCartCo2Kg > 0 ? Math.round((item.co2Kg / totalCartCo2Kg) * 100) : 0;
    item.isTopOffender = index === 0;
  });

  const topItem = evaluatedItems[0];
  const lowestItem = evaluatedItems[evaluatedItems.length - 1];

  const topOffender = topItem
    ? {
        name: topItem.name,
        category: topItem.category,
        co2Kg: topItem.co2Kg,
        percentage: topItem.percentage,
        tip: topItem.tip
      }
    : null;

  const lowestOffender = lowestItem && lowestItem !== topItem
    ? {
        name: lowestItem.name,
        category: lowestItem.category,
        co2Kg: lowestItem.co2Kg,
        percentage: lowestItem.percentage
      }
    : null;

  return {
    items: evaluatedItems,
    topOffender,
    lowestOffender,
    totalItems: evaluatedItems.length,
    totalCartCo2Kg
  };
}

module.exports = {
  ITEM_EMISSION_PROFILES,
  parseReceiptItemsFromText,
  calculateReceiptBreakdown
};
