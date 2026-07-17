const Scan = require('../models/Scan');
const disposalCategories = require('../data/disposalCategories.json');
const { matchDisposalCategory } = require('../utils/matchDisposalCategory');
const { getDistanceKm } = require('../utils/haversine');

const overpassCache = new Map();

async function lookupDisposal(req, res, next) {
  try {
    const { query, scanId } = req.body;
    let searchText = '';

    if (scanId) {
      // Fetch scan and verify ownership
      const scan = await Scan.findOne({ _id: scanId, user: req.user.id });
      if (!scan) {
        return res.status(404).json({ success: false, message: 'Scan not found or unauthorized' });
      }
      searchText = `${scan.category || ''} ${scan.rawText || ''} ${JSON.stringify(scan.parsedFields || {})}`;
    } else if (query) {
      searchText = query;
    } else {
      return res.status(400).json({ success: false, message: 'Provide either a query or a scanId' });
    }

    const categoryKey = matchDisposalCategory(searchText);
    const entry = disposalCategories[categoryKey] || disposalCategories['general_landfill'];

    const User = require('../models/User');
    const { checkAndAwardBadges } = require('../utils/badgeEngine');

    let newBadges = [];
    const user = await User.findById(req.user.id);
    if (user) {
      user.recycleLookupsCount = (user.recycleLookupsCount || 0) + 1;
      newBadges = await checkAndAwardBadges(user);
      await user.save({ validateBeforeSave: false });
    }

    return res.status(200).json({
      success: true,
      categoryKey,
      ...entry,
      matchedFrom: scanId ? 'scan' : 'query',
      newBadges
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Geocodes an address string using the OpenStreetMap Nominatim API proxy.
 *
 * @route GET /api/recycle/geocode
 * @access Private
 */
async function geocodeAddress(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Query string must be at least 2 characters long' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ClimateLens/1.0 (personal project; abhinikesh@users.noreply.github.com)'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status}`);
      }

      const result = await response.json();
      if (!result || result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Couldn't find that location. Try a more specific city or address."
        });
      }

      return res.status(200).json({
        success: true,
        lat: parseFloat(result[0].lat),
        lon: parseFloat(result[0].lon),
        displayName: result[0].display_name
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[Geocode Address] Fetch failed:', fetchError.message);
      return res.status(503).json({
        success: false,
        message: 'Location lookup service is temporarily unavailable. Try again shortly.'
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Finds nearby recycling and waste centers using the OpenStreetMap Overpass API proxy.
 *
 * @route GET /api/recycle/centers
 * @access Private
 */
async function findNearbyCenters(req, res, next) {
  try {
    const { lat: latQuery, lon: lonQuery, radius: radiusQuery } = req.query;

    if (!latQuery || !lonQuery) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude parameters are required' });
    }

    const lat = parseFloat(latQuery);
    const lon = parseFloat(lonQuery);

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ success: false, message: 'Invalid latitude or longitude values' });
    }

    let radius = 3000; // default 3000m
    if (radiusQuery) {
      const parsedRadius = parseInt(radiusQuery, 10);
      if (!isNaN(parsedRadius)) {
        // Clamp radius between 1000m and 10000m
        radius = Math.max(1000, Math.min(parsedRadius, 10000));
      }
    }

    const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}_${radius}`;
    const cachedEntry = overpassCache.get(cacheKey);

    if (cachedEntry) {
      const ageMs = Date.now() - cachedEntry.timestamp;
      if (ageMs < 60 * 60 * 1000) { // 1 hour TTL
        return res.status(200).json({
          success: true,
          centers: cachedEntry.data,
          cached: true
        });
      }
    }

    // Build Overpass QL Query
    const overpassQuery = `[out:json][timeout:15];
(
  node["amenity"="recycling"](around:${radius},${lat},${lon});
  way["amenity"="recycling"](around:${radius},${lat},${lon});
  node["amenity"="waste_disposal"](around:${radius},${lat},${lon});
);
out center;`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Overpass interpreter responded with status: ${response.status}`);
      }

      const rawData = await response.json();
      const elements = rawData.elements || [];

      const centers = elements
        .map((element) => {
          let elementLat = null;
          let elementLon = null;

          if (element.type === 'node') {
            elementLat = element.lat;
            elementLon = element.lon;
          } else if (element.type === 'way' && element.center) {
            elementLat = element.center.lat;
            elementLon = element.center.lon;
          }

          if (elementLat === null || elementLon === null) {
            return null;
          }

          const name = element.tags?.name || 'Recycling Point';
          const openingHours = element.tags?.opening_hours || null;

          const acceptedMaterials = [];
          if (element.tags) {
            for (const [key, val] of Object.entries(element.tags)) {
              if (key.startsWith('recycling:') && val === 'yes') {
                const materialName = key.replace('recycling:', '').replace(/_/g, ' ');
                acceptedMaterials.push(materialName);
              }
            }
          }

          const distance = getDistanceKm(lat, lon, elementLat, elementLon);
          const roundedDistance = parseFloat(distance.toFixed(2));

          return {
            name,
            lat: elementLat,
            lon: elementLon,
            acceptedMaterials,
            openingHours,
            distanceKm: roundedDistance
          };
        })
        .filter((item) => item !== null);

      // Sort by distance ascending and slice top 20
      centers.sort((a, b) => a.distanceKm - b.distanceKm);
      const top20Centers = centers.slice(0, 20);

      // Store in cache
      overpassCache.set(cacheKey, {
        data: top20Centers,
        timestamp: Date.now()
      });

      return res.status(200).json({
        success: true,
        centers: top20Centers,
        cached: false
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('[Overpass Centers] Fetch failed:', fetchError.message);
      return res.status(200).json({
        success: true,
        centers: [],
        note: "Could not reach OpenStreetMap's data service right now. Try again in a moment."
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  lookupDisposal,
  geocodeAddress,
  findNearbyCenters
};
