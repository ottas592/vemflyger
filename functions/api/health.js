export async function onRequestGet() {
  const url = "https://api.airplanes.live/v2/point/59.633810/17.915602/3";

  const tests = [
    {
      name: "plain-fetch",
      options: {}
    },
    {
      name: "browser-like-user-agent",
      options: {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json,text/plain,*/*"
        }
      }
    },
    {
      name: "explicit-json",
      options: {
        headers: {
          "Accept": "application/json"
        }
      }
    }
  ];

  const results = [];

  for (const test of tests) {
    const started = Date.now();

    try {
      const response = await fetch(url, test.options);
      const text = await response.text();

      results.push({
        name: test.name,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - started,
        headers: {
          "content-type": response.headers.get("content-type"),
          "server": response.headers.get("server"),
          "cf-ray": response.headers.get("cf-ray"),
          "retry-after": response.headers.get("retry-after"),
          "www-authenticate": response.headers.get("www-authenticate"),
          "x-ratelimit-limit": response.headers.get("x-ratelimit-limit"),
          "x-ratelimit-remaining": response.headers.get("x-ratelimit-remaining")
        },
        bodyPreview: text.slice(0, 1200)
      });
    } catch (error) {
      results.push({
        name: test.name,
        ok: false,
        fetchError: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started
      });
    }
  }

  return new Response(
    JSON.stringify(
      {
        testedUrl: url,
        timestamp: new Date().toISOString(),
        results
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}
