export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

export function validNumber(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

export function aircraftList(payload) {
  if (Array.isArray(payload?.ac)) return payload.ac;
  if (Array.isArray(payload?.aircraft)) return payload.aircraft;
  return [];
}

export function aircraftKey(aircraft) {
  return String(
    aircraft?.hex || aircraft?.icao || aircraft?.flight ||
    `${aircraft?.lat ?? ''}:${aircraft?.lon ?? ''}`
  ).trim().toLowerCase();
}
