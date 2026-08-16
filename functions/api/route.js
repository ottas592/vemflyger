import { json, fetchJson } from './_shared.js';

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const callsign = String(url.searchParams.get('callsign') || '').trim().toUpperCase();

  if (!/^[A-Z0-9]{2,10}$/.test(callsign)) {
    return json({ error: 'Ogiltig callsign.' }, 400);
  }

  try {
    const data = await fetchJson(
      `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`
    );
    return json(data);
  } catch (error) {
    return json({ error: String(error?.message || error) }, 502);
  }
}
