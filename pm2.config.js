module.exports = {
  apps: [
    {
      name: "Ashihara",
      script: "./index.js",
      instances: 5,
      max_memory_restart: "300M",
      watch: ['index.js', 'app'],
      env_production: {
        NODE_ENV: "production",
        PORT: 443,
        HOST: 'localhost',
        exec_mode: "cluster_mode",
      }
    },
    {
      name: "Nodemon",
      script: "nodemon",
      args: "build.js index",
      watch: false,
      autorestart: false,
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
}