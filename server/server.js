import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

app.post("/api/token", async (req, res) => {
  try {
    const { code } = req.body;
    const params = new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: "http://localhost:5173", // or your deployed client URL (must match in Discord dev portal)
    });
    const r = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ error: data });
    res.json({ access_token: data.access_token });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(3001, () => console.log("Token server on :3001"));
