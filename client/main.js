import { DiscordSDK } from "@discord/embedded-app-sdk";

const app = document.querySelector("#app");
app.innerHTML = "<h1>Loading…</h1>";

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
console.log("CLIENT_ID:", CLIENT_ID);

let sdk;
try {
  sdk = new DiscordSDK(CLIENT_ID || "");
} catch (e) {
  console.error("Failed to construct DiscordSDK:", e);
}

(async () => {
  try {
    await sdk.ready();
    app.innerHTML = "<h1>Hello from Discord Activity</h1>";
  } catch (e) {
    console.error("SDK not ready:", e);
    app.innerHTML = "<h1>Not running inside Discord Activity</h1>";
  }
})();
