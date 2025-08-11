import { DiscordSDK } from "@discord/embedded-app-sdk";

let discordSdk = null;

export async function initDiscord() {
  if (!discordSdk) {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    discordSdk = new DiscordSDK(clientId);
  }

  // Wait for Discord client to be ready
  await discordSdk.ready();

  // 1) OAuth (identify is enough for lobby name)
  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify"],
  });

  // 2) Exchange via your proxy (same path as the starter uses)
  const tokenRes = await fetch("/.proxy/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const { access_token } = await tokenRes.json();

  // 3) Authenticate the embedded app
  await discordSdk.commands.authenticate({ access_token });

  // Fetch basic user for the lobby header
  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const me = await meRes.json();

  const user = {
    id: me.id,
    username: me.username,
    discriminator: me.discriminator,
    global_name: me.global_name,
    avatar: me.avatar,
  };

  return { sdk: discordSdk, user };
}
