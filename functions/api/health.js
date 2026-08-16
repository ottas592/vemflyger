import { json } from './_shared.js';

export async function onRequestGet() {
  return json({ ok: true, service: 'vemflyger' });
}
