let memoryCache = {
  key: null,
  expiresAt: 0,
  payload: null,
};

export async function onRequestGet(context) {
  const url = new URL(context.request.url);

  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const radiusKm = Number(url.searchParams.get("radiusKm") || 5);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return json({ error: "lat and lon must be valid numbers" }, 400);
  }

  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 50) {
    return json({ error: "radiusKm must be between 0 and 50" }, 400);
  }

  const cacheKey =
    `${lat.toFixed(5)}:${lon.toFixed(5)}:${radiusKm.toFixed(1)}`;

  const now = Date.now();

  if (
    memoryCache.key === cacheKey &&
    memoryCache.payload &&
    memoryCache.expiresAt > now
  ) {
    return json({
      ...memoryCache.payload,
      cache: "hit"
    });
  }

  const searchRadiusNm = 25;

  const apiUrl =
    `https://api.adsb.lol/v2/closest/${lat}/${lon}/${searchRadiusNm}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "vemflyger/1.0"
      }
    });

    if (!response.ok) {
      if (
        response.status === 429 &&
        memoryCache.key === cacheKey &&
        memoryCache.payload
      ) {
        return json({
          ...memoryCache.payload,
          cache: "stale",
          warning:
            "Upstream returned 429; serving last successful response"
        });
      }

      return json(
        {
          ac: [],
          source: "adsb.lol",
          error: `${response.status} ${response.statusText}`,
          cache: "miss"
        },
        502
      );
    }

    const data = await response.json();

    const aircraft = Array.isArray(data.ac)
      ? data.ac
      : [];

    const valid = aircraft
      .filter(
        a =>
          Number.isFinite(a.lat) &&
          Number.isFinite(a.lon)
      )
      .map(a => ({
        ...a,
        _distanceKm: haversineKm(
          lat,
          lon,
          a.lat,
          a.lon
        )
      }))
      .sort(
        (a, b) =>
          a._distanceKm - b._distanceKm
      );

    const nearest = valid[0];

    const payload =
      !nearest ||
      nearest._distanceKm > radiusKm
        ? {
            ac: [],
            source: "adsb.lol",
            nearestDistanceKm: nearest
              ? round(nearest._distanceKm, 3)
              : null,
            radiusKm
          }
        : {
            ac: [nearest],
            source: "adsb.lol",
            nearestDistanceKm:
              round(nearest._distanceKm, 3),
            radiusKm
          };

    memoryCache = {
      key: cacheKey,
      expiresAt: now + 30000,
      payload
    };

    return json({
      ...payload,
      cache: "miss"
    });

  } catch (error) {
    if (
      memoryCache.key === cacheKey &&
      memoryCache.payload
    ) {
      return json({
        ...memoryCache.payload,
        cache: "stale",
        warning:
          "Upstream request failed; serving last successful response"
      });
    }

    return json(
      {
        ac: [],
        source: "adsb.lol",
        error:
          error instanceof Error
            ? error.message
            : String(error),
        cache: "miss"
      },
      502
    );
  }
}

function haversineKm(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const R = 6371.0088;

  const toRad =
    deg => deg * Math.PI / 180;

  const dLat =
    toRad(lat2 - lat1);

  const dLon =
    toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.asin(Math.sqrt(a))
  );
}

function round(
  value,
  decimals
) {
  const factor =
    10 ** decimals;

  return (
    Math.round(value * factor) /
    factor
  );
}

function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "public, max-age=30"
      }
    }
  );
}
