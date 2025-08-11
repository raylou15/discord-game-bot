// src/sdk/discord.js
let discordSdk = null;
let booting = null;
let authed = false;

export async function initDiscord() {
  if (authed && discordSdk) return { sdk: discordSdk, user: window.__ME };
  if (booting) return booting;

  booting = (async () => {
    console.log("[init] start");
    const { DiscordSDK } = await import("@discord/embedded-app-sdk");
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    if (!clientId) throw new Error("Missing VITE_DISCORD_CLIENT_ID");

    discordSdk ||= new DiscordSDK(clientId);

    await discordSdk.ready();
    console.log("[init] discord ready");

    const { code } = await discordSdk.commands.authorize({
      client_id: clientId,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: ["identify"],
    });
    console.log("[init] got code");

    // --- token exchange (relative path) ---
    const resp = await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`/api/token failed: ${resp.status} ${txt}`);
    }
    const { access_token } = await resp.json();
    if (!access_token) throw new Error("No access_token from /api/token");
    console.log("[init] got token");

    await discordSdk.commands.authenticate({ access_token });
    console.log("[init] authenticated");

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!meRes.ok) {
      const t = await meRes.text();
      throw new Error(`/users/@me failed: ${meRes.status} ${t}`);
    }
    const me = await meRes.json();
    window.__ME = {
      id: me.id,
      username: me.username,
      discriminator: me.discriminator,
      global_name: me.global_name,
      avatar: me.avatar,
    };
    authed = true;
    console.log("[init] done");
    return { sdk: discordSdk, user: window.__ME };
  })();

  const out = await booting;
  booting = null;
  return out;
}
