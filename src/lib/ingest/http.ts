/**
 * Polite HTTP client for scraping public recreation feeds:
 *  - rotating desktop/mobile User-Agents
 *  - global minimum gap between requests (default 1500ms)
 *  - timeout + single retry with backoff on network/5xx errors
 *  - bot-challenge detection (HTML where JSON was expected, 403/429/503)
 */

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
];

let uaCursor = Math.floor(Math.random() * USER_AGENTS.length);
let lastRequestAt = 0;

export const POLITE_DELAY_MS = Number(process.env.INGEST_DELAY_MS ?? 1500);

export class ChallengeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChallengeError";
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function nextUserAgent() {
  uaCursor = (uaCursor + 1) % USER_AGENTS.length;
  return USER_AGENTS[uaCursor];
}

async function politeGate() {
  const wait = lastRequestAt + POLITE_DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
  attempt = 1,
): Promise<T> {
  await politeGate();
  const { timeoutMs = 20_000, headers, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "User-Agent": nextUserAgent(),
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-CA,en;q=0.9",
        "Cache-Control": "no-cache",
        ...headers,
      },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if ([403, 429, 503].includes(res.status)) {
      throw new ChallengeError(`HTTP ${res.status} (likely rate-limit / bot challenge) from ${new URL(url).host}`);
    }
    if (res.status >= 500 && attempt < 2) {
      await sleep(POLITE_DELAY_MS * 2);
      return fetchJson<T>(url, init, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    const text = await res.text();
    if (!contentType.includes("json") && /^\s*</.test(text)) {
      throw new ChallengeError(`Expected JSON but received HTML from ${new URL(url).host} (challenge page?)`);
    }
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof ChallengeError) throw err;
    const isNetwork = err instanceof TypeError || (err as Error).name === "AbortError";
    if (isNetwork && attempt < 2) {
      await sleep(POLITE_DELAY_MS * 2);
      return fetchJson<T>(url, init, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
