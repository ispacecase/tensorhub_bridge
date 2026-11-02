# TensorArt Cloudflare Worker bridge

For a Git-connected Cloudflare Worker, commit `worker.js` and `wrangler.jsonc` to the repository root, then deploy with `npx wrangler deploy`. The `main` property identifies the entry point. For a dashboard-created Worker, paste `worker.js` into the code editor instead.

In Worker Settings -> Variables and Secrets add two encrypted secrets:
- `TENSORART_API_KEY`: a **newly rotated** TensorArt access key.
- `BRIDGE_TOKEN`: a long, randomly generated secret of your own, different from the TensorArt key.

Available POST routes:
- `/tools` with `{}` -> TensorArt `tool/list`
- `/task` with `{"toolName":"...", "inputs":[...]}` -> `task`
- `/status` with `{"taskIds":["..."]}` -> `task/query`
- `/upload-url` with `{"filename":"image.png"}` -> `file/upload` (returns an upload URL; the client sends bytes separately)

Send `Authorization: Bearer <BRIDGE_TOKEN>` and `Content-Type: application/json`.
Never expose either secret in the Worker source code, a public Git repository, or a chat.

Example for a local terminal test (enter your token locally):
  curl -sS -X POST "https://YOUR-WORKER.workers.dev/tools" \
    -H "Authorization: Bearer YOUR_BRIDGE_TOKEN" \
    -H "Content-Type: application/json" -d '{}'

This bridge is a starting point, **not yet a ChatGPT plugin**. A plugin needs a compatible
manifest/actions and a safe way to provide the bridge credential. Keep the Worker
private until authentication and any required deployment security are configured.
