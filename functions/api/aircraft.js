import { json, validNumber, fetchJson, aircraftList, aircraftKey } from './_shared.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const lat = validNumber(url.searchParams.get('lat'), -90, 90);
  const lon = validNumber(url.searchParams.get('lon'), -180, 180);
  const radiusKm = validNumber(url.searchParams.get('radiusKm') ?? '5', 0.1, 25);

  if (lat === null || lon === null || radiusKm === null) {
    return json({ error: 'Ogiltiga parametrar. Ange lat, lon och radiusKm.' }, 400);
  }

  const radiusNm = Math.max(1, Math.ceil(radiusKm / 1.852));
  const sources = [
    ['adsb.lol', `https://api.adsb.lol/v2/point/${lat}/${lon}/${radiusNm}`],
    ['airplanes.live', `https://api.airplanes.live/v2/point/${lat}/${lon}/${radiusNm}`],
  ];

  const results = await Promise.allSettled(
    sources.map(([, endpoint]) => fetchJson(endpoint))
  );

  const merged = new Map();
  const sourceStatus = {};

  results.forEach((result, index) => {
    const sourceName = sources[index][0];
    if (result.status === 'fulfilled') {
      const list = aircraftList(result.value);
      sourceStatus[sourceName] = { ok: true, count: list.length };
      for (const item of list) {
        const key = aircraftKey(item);
        if (!key) continue;
        const existing = merged.get(key);
        merged.set(key, existing ? { ...existing, ...item } : item);
      }
    } else {
      sourceStatus[sourceName] = {
        ok: false,
        error: String(result.reason?.message || result.reason),
      };
    }
  });

  if (!Object.values(sourceStatus).some(status => status.ok)) {
    return json({ error: 'Ingen positionskälla kunde nås.', sources: sourceStatus }, 502);
  }

  return json({ ac: [...merged.values()], sources: sourceStatus, radiusNm });
}
