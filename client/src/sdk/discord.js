// src/sdk/discord.js
let discordSdk = null;

export async function initDiscord() {
  // Lazy import to avoid heavy build in the main bundle
  const { DiscordSDK } = await import("@discord/embedded-app-sdk");

  if (!discordSdk) {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    discordSdk = new DiscordSDK(clientId);
  }

  await discordSdk.ready();

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

  return {
    sdk: discordSdk,
    user: {
      id: me.id,
      username: me.username,
      discriminator: me.discriminator,
      global_name: me.global_name,
      avatar: me.avatar,
    },
  };
}
