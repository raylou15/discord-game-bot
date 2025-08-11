module.exports = {
  apps: [
    {
      name: "discord-game-bot",
      script: "server.js",
      cwd: "./server",
      interpreter: "node",
      watch: false,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
