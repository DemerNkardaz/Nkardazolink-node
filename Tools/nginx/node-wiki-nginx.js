const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
require('../../modules/CoreConfig/src/CoreConfig').config().init(['AppVariables', 'CoreModules']);
const __PROJECT_DIR__ = path.join(__dirname, '..', '..');
const serverConfig = ini.parse(path.join(__PROJECT_DIR__, 'server.ini'));
const currentFolderPath = path.join(__dirname);
const dir = currentFolderPath.replace(/\\/g, '/');
const sourceDir = __PROJECT_DIR__.replace(/\\/g, '/');

const errorCodes = [
  400, 401, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416,
  417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451, 500, 501, 502, 503,
  504, 505, 506, 507, 508, 510, 511
];

const generateErrorPages = (errorCodes) => {
  return errorCodes.map(code => `    error_page ${code} /html/${code}.html;`).join('\n');
};

const errorPagesConfig = generateErrorPages(errorCodes);


const nginxConfig = `
worker_processes 2;

events {
  worker_connections 8192;
  multi_accept on;
}

http {
  include mime.types;
  default_type application/octet-stream;
  ${serverConfig.NGINX.proxyCache ? `proxy_cache_path temp/proxy_cache levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;` : ''}

  limit_req_zone $binary_remote_addr zone=mylimit:10m rate=5000r/m;
  limit_req_status 429;

  limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
  limit_conn conn_limit_per_ip 10;

  fastcgi_buffer_size 16k;
  fastcgi_buffers 4 16k;
  fastcgi_read_timeout 300s;
  fastcgi_send_timeout 300s;

  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
  '$status $body_bytes_sent "$http_referer" '
  '"$http_user_agent" "$http_x_forwarded_for"';

  access_log logs/access.log main;

  sendfile on;
  keepalive_timeout 65;

  map $http_user_agent $detected_device {
    default "Unknown";

    # Mobile devices
    ~*ipad "Tablet";
    ~*iphone "Mobile";
    ~*android "Mobile";
    ~*pixel "Mobile";
    ~*miui "Mobile";
    ~*mobile "Mobile";
    ~*blackberry "Mobile";
    ~*windows\\ phone "Mobile";
    ~*windows\\ ce "Mobile";

    # Tablets
    ~*tablet "Tablet";
    ~*kindle "Tablet";

    # Desktop operating systems
    ~*windows "Desktop";
    ~*macintosh "Desktop";
    ~*linux "Desktop";

    # Bots and crawlers
    ~*googlebot "Bot";
    ~*bingbot "Bot";
    ~*yandex "Bot";
    ~*duckduckgo "Bot";
  }

  gzip on;
  gzip_comp_level 5;
  gzip_types text/plain text/css text/xml text/javascript text/x-js text/x-json text/x-script text/x-component text/x-markdown application/json application/javascript application/x-javascript application/ecmascript application/xml application/xml+rss application/rss+xml application/atom+xml application/xhtml+xml application/x-font-ttf application/font-woff application/x-font-opentype application/vnd.ms-fontobject application/x-web-app-manifest+json application/vnd.api+json application/ld+json application/pdf application/x-shockwave-flash image/svg+xml image/x-icon image/vnd.microsoft.icon font/ttf font/woff font/woff2 font/opentype font/eot;
  gzip_min_length 500;
  gzip_vary on;
  gzip_proxied any;
  gzip_http_version 1.1;
  gzip_buffers 32 4k;

  upstream nodejs_app {
    ip_hash;
    server ${serverConfig.server.host}:${serverConfig.server.HTTPSPort};
  }

  server {
    listen 80;
    server_name ${serverConfig.server.host};
    return 301 https://$server_name$request_uri;
  }

  server {
    listen 8080 ssl;
    server_name ${serverConfig.server.host};

    ssl_certificate "${sourceDir}/nkardaz.io.crt";
    ssl_certificate_key "${sourceDir}/nkardaz.io.key";

    root ${sourceDir}/tools/phpMyAdmin;
    index index.php;

    location / {
      try_files $uri $uri/ =404;
    }

    location ~ \\.php$ {
      include fastcgi_params;
      fastcgi_pass 127.0.0.1:9000;
      fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    error_log logs/adminer_error.log;
    access_log logs/adminer_access.log;
  }

  server {
    listen ${serverConfig.NGINX.HTTPSPort} ssl;
    server_name ${serverConfig.server.host};

    ssl_certificate "${sourceDir}/nkardaz.io.crt";
    ssl_certificate_key "${sourceDir}/nkardaz.io.key";

    access_log logs/host.access.log main;

    location / {
      proxy_http_version 1.1;
      limit_req zone=mylimit burst=1000 delay=5;

      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_cache_bypass $http_upgrade;

      add_header X-Content-Type-Options 'nosniff';
      add_header X-Request-Detected-Device $detected_device;
      add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
      add_header X-Frame-Options "DENY";
      add_header X-XSS-Protection "1; mode=block";
      add_header Referrer-Policy "no-referrer-when-downgrade";
      add_header X-Project 'NGINX/Node.js-Express "Nkardazolink"';
      add_header X-Request-ID $request_id;
      add_header X-Request-Time $request_time;

      proxy_pass https://nodejs_app;
      proxy_read_timeout 15;
      proxy_connect_timeout 3;
      
      ${serverConfig.NGINX.proxyCache ? `
      proxy_cache my_cache;
      proxy_cache_key "$scheme$request_method$host$request_uri";
      proxy_cache_valid 200 302 10m;
      proxy_cache_valid 404 1m;
      proxy_cache_revalidate on;
      proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
      proxy_cache_lock on;
      proxy_cache_min_uses 5;
      proxy_cache_background_update on;` : ''}

      proxy_buffer_size 128k;
      proxy_buffers 4 256k;
      proxy_busy_buffers_size 256k;
      proxy_temp_file_write_size 256k;
    }

    location ~ /\\.ht {
      deny all;
    }

${errorPagesConfig}

    location /html/ {
      root C:/nginx;
      internal;
    }
  }
}
`;

const createNginxConfig = async () => await writeFileAsync(path.join(currentFolderPath, 'test.conf'), nginxConfig.split('\n').filter(line => line.trim()).join('\n'), 'utf-8');

module.exports = { createNginxConfig };