// src/sdk/discord.js
let discordSdk = null;
let booting = null; // promise guard
let authed = false;

export async function initDiscord() {
  if (authed && discordSdk) return { sdk: discordSdk, user: window.__ME };
  if (booting) return booting;

  booting = (async () => {
    const { DiscordSDK } = await import("@discord/embedded-app-sdk");
    if (!discordSdk) {
      const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
      discordSdk = new DiscordSDK(clientId);
    }

    await discordSdk.ready();

    // If authenticate already happened, skip
    if (!authed) {
      const { code } = await discordSdk.commands.authorize({
        client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify"],
      });

      const tokenRes = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const { access_token } = await tokenRes.json();

      await discordSdk.commands.authenticate({ access_token });

      const meRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const me = await meRes.json();

      window.__ME = {
        id: me.id,
        username: me.username,
        discriminator: me.discriminator,
        global_name: me.global_name,
        avatar: me.avatar,
      };
      authed = true;
    }

    return { sdk: discordSdk, user: window.__ME };
  })();

  const result = await booting;
  booting = null;
  return result;
}
