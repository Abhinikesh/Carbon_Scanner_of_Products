const { EMISSION_FACTORS } = require('../utils/carbonCalculator');
const { sendSuccess } = require('../utils/responseHelper');

const getFactors = async (req, res, next) => {
  try {
    return sendSuccess(res, 200, 'Emission factors fetched', { factors: EMISSION_FACTORS });
  } catch (error) {
    next(error);
  }
};

const compareItems = async (req, res, next) => {
  try {
    const { item1, item2, category = 'food' } = req.query;
    const factors = EMISSION_FACTORS[category] || {};

    const co2Item1 = factors[item1] || null;
    const co2Item2 = factors[item2] || null;

    return sendSuccess(res, 200, 'Comparison result', {
      item1: { name: item1, co2_per_kg: co2Item1 },
      item2: { name: item2, co2_per_kg: co2Item2 },
      difference: co2Item1 && co2Item2 ? parseFloat((co2Item1 - co2Item2).toFixed(2)) : null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFactors, compareItems };
