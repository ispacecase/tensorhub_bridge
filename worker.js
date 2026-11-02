// Cloudflare Worker bridge for TensorArt OpenWorks API
// Secrets required: TENSORART_API_KEY, BRIDGE_TOKEN
const MAX_BODY = 100_000;

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return Response.json({error:"Use POST"}, {status:405});
    }

    const expected = env.BRIDGE_TOKEN;
    const supplied = request.headers.get("Authorization");
    if (!expected || !env.TENSORART_API_KEY) {
      return Response.json({error:"Worker secrets not configured"}, {status:503});
    }
    if (!supplied || supplied !== `Bearer ${expected}`) {
      return Response.json({error:"Unauthorized"}, {status:401});
    }

    const pathname = new URL(request.url).pathname;
    const endpoints = {
      "/tools": "tool/list",
      "/task": "task",
      "/status": "task/query",
      "/upload-url": "file/upload"
    };
    const endpoint = endpoints[pathname];
    if (!endpoint) return Response.json({error:"Unknown endpoint"}, {status:404});

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > MAX_BODY) return Response.json({error:"Body too large"}, {status:413});

    let payload;
    try {
      const raw = await request.text();
      if (raw.length > MAX_BODY) return Response.json({error:"Body too large"}, {status:413});
      payload = JSON.parse(raw);
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) throw Error();
    } catch {
      return Response.json({error:"Expected a JSON object"}, {status:400});
    }
    if (pathname === "/tools") payload = {};
    if (pathname === "/task" && (typeof payload.toolName !== "string" || !Array.isArray(payload.inputs))) {
      return Response.json({error:"Expected toolName and inputs array"}, {status:400});
    }
    if (pathname === "/status" && (!Array.isArray(payload.taskIds) || payload.taskIds.length > 10)) {
      return Response.json({error:"Expected taskIds array (max 10)"}, {status:400});
    }
    if (pathname === "/upload-url" && typeof payload.filename !== "string") {
      return Response.json({error:"Expected filename"}, {status:400});
    }

    const key = env.TENSORART_API_KEY.trim();
    const base = key.startsWith("ak_tusi") ? "https://openapi.tusiart.cn/openworks/v1" : "https://openapi.tensor.art/openworks/v1";
    try {
      const upstream = await fetch(`${base}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type":"application/json",
          "Echo-Access-Key":key
        },
        body: JSON.stringify(payload)
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "application/json",
          "Cache-Control":"no-store"
        }
      });
    } catch {
      return Response.json({error:"Unable to reach TensorArt"}, {status:502});
    }
  }
};
