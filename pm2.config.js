module.exports = {
  apps: [
    {
      name: "Nkardazolink",
      script: "./index.js",
      instances: 10,
      max_memory_restart: "300M",

      out_file: "./out.log",
      error_file: "./error.log",
      merge_logs: true,
      log_date_format: "DD-MM HH:mm:ss Z",
      log_type: "json",

      env_production: {
        NODE_ENV: "production",
        PORT: 443,
        exec_mode: "cluster_mode",
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
        watch: true,
        watch_delay: 3000,
        ignore_watch: [
          "./node_modules",
          "./.vercel",
          "./assets",
          "./cache",
          "./modules",
          "./extensions",
          "./nginx",
          "./shared",
          "./staic",
          "./.DS_Store",
          "./package.json",
          "./yarn.lock",
          "./samples",
          "./src"
        ],
      },
    },
  ],
};
