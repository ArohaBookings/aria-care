// Empty shim for the `ws` package. Middleware runs on Edge Runtime where
// WebSocket is a global — `ws` (the Node.js WebSocket library) is never
// needed, but @supabase/realtime-js imports it. This shim prevents
// `__dirname is not defined` errors in the Edge bundle.
module.exports = globalThis.WebSocket || function () {};
