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

  // adsb.fi använder nautiska mil.
  // 5 km ≈ 2,70 NM. Vi frågar efter 3 NM och
  // gör sedan den exakta 5 km-kontrollen själva.
  const searchRadiusNm = Math.max(3, Math.ceil(radiusKm / 1.852));

  const apiUrl =
    `https://opendata.adsb.fi/api/v3/lat/${lat}/lon/${lon}/dist/${searchRadiusNm}`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      return json(
        {
          ac: [],
          source: "adsb.fi",
          error: `${response.status} ${response.statusText}`,
          upstream: apiUrl
        },
        502
      );
    }

    const data = await response.json();

    // adsb.fi är ADSBexchange-kompatibelt och använder normalt "ac".
    // Vi accepterar även "aircraft" för att vara robusta.
    const aircraft = Array.isArray(data.ac)
      ? data.ac
      : Array.isArray(data.aircraft)
        ? data.aircraft
        : [];

    const nearby = aircraft
      .filter(a =>
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
      .filter(a => a._distanceKm <= radiusKm)
      .sort((a, b) =>
        a._distanceKm - b._distanceKm
      );

    const nearest = nearby[0];

    if (!nearest) {
      return json({
        ac: [],
        source: "adsb.fi",
        received: aircraft.length,
        withinRadius: 0,
        radiusKm
      });
    }

    return json({
      ac: [nearest],
      source: "adsb.fi",
      received: aircraft.length,
      withinRadius: nearby.length,
      nearestDistanceKm: round(nearest._distanceKm, 3),
      radiusKm
    });

  } catch (error) {
    return json(
      {
        ac: [],
        source: "adsb.fi",
        error:
          error instanceof Error
            ? error.message
            : String(error)
      },
      502
    );
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371.0088;
  const toRad = degrees =>
    degrees * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
