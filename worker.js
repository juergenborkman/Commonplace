/* Commonplace helper: a Cloudflare Worker that writes lessons with Claude and keeps them.

   Endpoints (every request must send the header  X-Passphrase: <your APP_PASSPHRASE>):
     GET  /ping                   -> {ok:true}            (checks the address and passphrase)
     POST /generate {prompt,tier} -> {json:<parsed reply>} (tier "complex" uses MODEL_COMPLEX)
     GET  /doc?path=<key>         -> {exists, data}       (saved lessons, facts, progress)
     PUT  /doc?path=<key>  <json> -> {ok:true}

   Settings in Cloudflare (Worker > Settings > Variables and Secrets):
     ANTHROPIC_API_KEY  (Secret)  your key from platform.claude.com
     APP_PASSPHRASE     (Secret)  any long phrase; the app asks for it once per device
     MODEL              (Text, optional) default "claude-sonnet-5-5"
     MODEL_COMPLEX      (Text, optional) default same as MODEL; used for fact-checking
     DAILY_LIMIT        (Text, optional) max Claude calls per day, default "60"
   Binding: a KV namespace bound as  STORE
*/
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Passphrase",
  "Access-Control-Max-Age": "86400",
};
const out = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function parseJSON(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try { return JSON.parse(t); } catch (e) {}
  const s = Math.min(...["{", "["].map(c => t.indexOf(c)).filter(i => i >= 0));
  const e = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1));
  throw new Error("Claude's reply was not valid JSON");
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (!env.APP_PASSPHRASE || !env.ANTHROPIC_API_KEY || !env.STORE)
      return out({ error: "Helper is not fully set up (missing ANTHROPIC_API_KEY, APP_PASSPHRASE, or STORE)." }, 500);
    if (!sameSecret(req.headers.get("X-Passphrase") || "", env.APP_PASSPHRASE))
      return out({ error: "Wrong passphrase." }, 401);

    const url = new URL(req.url);
    try {
      if (url.pathname === "/ping") return out({ ok: true, model: env.MODEL || "claude-sonnet-5-5" });

      if (url.pathname === "/doc") {
        const path = url.searchParams.get("path") || "";
        if (!/^[\w\-./:@]{1,300}$/.test(path)) return out({ error: "Bad path" }, 400);
        if (req.method === "GET") {
          const v = await env.STORE.get("doc:" + path);
          return out(v == null ? { exists: false } : { exists: true, data: JSON.parse(v) });
        }
        if (req.method === "PUT") {
          const body = await req.text();
          if (body.length > 20_000_000) return out({ error: "Too large" }, 413);
          JSON.parse(body);
          await env.STORE.put("doc:" + path, body);
          return out({ ok: true });
        }
      }

      if (url.pathname === "/generate" && req.method === "POST") {
        const { prompt, tier } = await req.json();
        if (typeof prompt !== "string" || !prompt || prompt.length > 60000) return out({ error: "Bad prompt" }, 400);

        // A simple daily cap so a mistake can't run up the bill.
        const day = "count:" + new Date().toISOString().slice(0, 10);
        const used = parseInt((await env.STORE.get(day)) || "0", 10);
        const cap = parseInt(env.DAILY_LIMIT || "60", 10);
        if (used >= cap) return out({ error: `Daily limit of ${cap} generations reached. It resets at midnight UTC.` }, 429);
        await env.STORE.put(day, String(used + 1), { expirationTtl: 60 * 60 * 48 });

        const model = tier === "complex" ? (env.MODEL_COMPLEX || env.MODEL || "claude-sonnet-5-5") : (env.MODEL || "claude-sonnet-5-5");
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": env.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 8000,
            system: "You write content for Commonplace, a learning app. Reply with valid JSON only: no Markdown fences and no commentary before or after the JSON.",
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const data = await r.json();
        if (!r.ok) return out({ error: (data.error && data.error.message) || "Claude request failed", status: r.status }, 502);
        const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        return out({ json: parseJSON(text), usage: data.usage, model });
      }

      return out({ error: "Not found" }, 404);
    } catch (e) {
      return out({ error: String((e && e.message) || e) }, 500);
    }
  },
};
