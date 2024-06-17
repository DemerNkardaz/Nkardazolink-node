module.exports = {
  apps: [
    {
      name: "Nkardazolink",
      script: "./index.js",
      instances: 4,
      max_memory_restart: "300M",

      env_production: {
        NODE_ENV: "production",
        PORT: 443,
        HOST: 'localhost',
        exec_mode: "cluster_mode",
      }
    },
  ],
};
