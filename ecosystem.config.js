module.exports = {
  apps: [
    {
      name: "discord-game-bot",
      cwd: "./client",
      script: "npm",
      args: "run dev",
      interpreter: "none",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ],

  deploy: {
    production: {
      user: "root",
      host: "170.187.149.44",
      ref: "origin/main",
      repo: "git@github.com:raylou15/discord-game-bot.git",
      path: "/root/discord-game-bot",
      "post-deploy":
        "npm install --prefix client && pm2 reload ecosystem.config.js --only discord-game-bot"
    }
  }
};
