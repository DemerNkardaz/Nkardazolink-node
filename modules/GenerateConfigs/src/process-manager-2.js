const os = require('os');

const pm2Config = `{
  apps: [
    {
      name: "Asihara",
      script: "./index.js",
      instances: ${Math.max(1, Math.min(os.cpus().length - 1, serverConfig.pm2.maxInstances - 1))},
      max_memory_restart: "300M",
      watch: ['index.js', 'app'],
      env_production: {
        NODE_ENV: "production",
        PORT: 443,
        HOST: 'localhost',
        exec_mode: "cluster_mode",
      }
    }${serverConfig.pm2.rebuildOnChanges ? `,
    {
      name: "Nodemon",
      script: "nodemon",
      args: "build.js index",
      watch: false,
      autorestart: false,
      env_production: {
        NODE_ENV: "production"
      }
    }` : ''}
  ]
}`;



const createPM2Config = () => {
  try {
    fs.writeFileSync(path.join(__PROJECT_DIR__, 'pm2.config.js'), `module.exports = ${pm2Config}`, 'utf-8');
  } catch (error) {
    console.error('Error writing file:', error);
  }
};


module.exports = { createPM2Config };