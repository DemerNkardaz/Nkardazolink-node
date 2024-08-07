const nginxErrors = {
  400: ['400 – Bad Request', 'Your browser sent a request that this server could not understand.'],
  401: ['401 – Unauthorized', 'You are not authorized to view the page. Please log in or check your credentials.'],
  403: ['403 – Forbidden', 'You do not have permission to access the requested resource.'],
  404: ['404 – Not Found', 'The requested URL was not found on this server.'],
  405: ['405 – Method Not Allowed', 'The method specified in the request is not allowed for the requested resource.'],
  406: ['406 – Not Acceptable', 'The server cannot generate a response that the requester will accept.'],
  407: ['407 – Proxy Authentication Required', 'The client must authenticate itself with the proxy.'],
  408: ['408 – Request Timeout', 'The server timed out waiting for the request.'],
  409: ['409 – Conflict', 'The request could not be completed due to a conflict with the current state of the resource.'],
  410: ['410 – Gone', 'The requested resource is no longer available at the server and no forwarding address is known.'],
  411: ['411 – Length Required', 'The request did not specify the length of its content, which is required by the requested resource.'],
  412: ['412 – Precondition Failed', 'The server does not meet one of the preconditions that the requester put on the request.'],
  413: ['413 – Payload Too Large', 'The request is larger than the server is willing or able to process.'],
  414: ['414 – URI Too Long', 'The URI provided was too long for the server to process.'],
  415: ['415 – Unsupported Media Type', 'The server does not support the media type of the request body.'],
  416: ['416 – Range Not Satisfiable', 'The server cannot satisfy the range request header indicated in the request.'],
  417: ['417 – Expectation Failed', 'The server cannot meet the requirements of the Expect request-header field.'],
  418: ['418 – I’m a teapot', 'This code was defined in 1998 as one of the traditional April Fools’ jokes in RFC 2324, Hyper Text Coffee Pot Control Protocol, and is not expected to be implemented by actual HTTP servers.'],
  421: ['421 – Misdirected Request', 'The request was directed at a server that is not able to produce a response (for example, because of a connection reuse).'],
  422: ['422 – Unprocessable Entity', 'The server understands the content type of the request entity but was unable to process the contained instructions.'],
  423: ['423 – Locked', 'The resource that is being accessed is locked.'],
  424: ['424 – Failed Dependency', 'The method could not be performed on the resource because the requested action depended on another action and that action failed.'],
  425: ['425 – Too Early', 'The server is unwilling to risk processing a request that might be replayed.'],
  426: ['426 – Upgrade Required', 'The server refuses to perform the request using the current protocol but might be willing to do so after the client upgrades to a different protocol.'],
  428: ['428 – Precondition Required', 'The server requires the request to be conditional.'],
  429: ['429 – Too Many Requests', 'The user has sent too many requests in a given amount of time (“rate limiting”).'],
  431: ['431 – Request Header Fields Too Large', 'The server is unwilling to process the request because its header fields are too large.'],
  451: ['451 – Unavailable For Legal Reasons', 'The server is denying access to the resource as a consequence of a legal demand.'],
  500: ['500 – Internal Server Error', 'The server encountered an unexpected condition that prevented it from fulfilling the request.'],
  501: ['501 – Not Implemented', 'The server does not support the functionality required to fulfill the request.'],
  502: ['502 – Bad Gateway', 'The server received an invalid response from an upstream server.'],
  503: ['503 – Service Unavailable', 'The server is currently unavailable (overloaded or down). Please try again later.'],
  504: ['504 – Gateway Timeout', 'The server, while acting as a gateway or proxy, did not receive a timely response from an upstream server it needed to access in order to complete the request.'],
  505: ['505 – HTTP Version Not Supported', 'The server does not support the HTTP protocol version used in the request.'],
  506: ['506 – Variant Also Negotiates', 'Transparent content negotiation for the request results in a circular reference.'],
  507: ['507 – Insufficient Storage', 'The server is unable to store the representation needed to complete the request.'],
  508: ['508 – Loop Detected', 'The server detected an infinite loop while processing the request.'],
  510: ['510 – Not Extended', 'Further extensions to the request are required for the server to fulfill it.'],
  511: ['511 – Network Authentication Required', 'The client needs to authenticate to gain network access.'],
};

const generateErrorPages = async () => {
  new Promise((resolve, reject) => {
    try {
      !fs.existsSync('./Tools/nginx/html') && fs.mkdirSync('./Tools/nginx/html', { recursive: true });
      resolve();
    } catch (err) {
      console.log(err);
      reject();
    }
  }).then(async () => {
    try {
      Object.keys(nginxErrors).forEach(errorCode => {
        const errorHeader = nginxErrors[errorCode][0];
        const errorText = nginxErrors[errorCode][1];
        const data = { errorHeader, errorText };

        const html = ejs.renderFile(path.join(__dirname, 'errors.ejs'), data, (err, str) => {
          if (err) {
            console.error('Error during NGINX error pages rendering:', err);
            return;
          }
          const fileName = `./html/${errorCode}.html`;
          fs.writeFile(path.join(__PROJECT_DIR__, 'Tools', 'nginx', fileName), str, (err) => {
            if (err) {
              console.error(`Error during creating NGINX error page ${fileName}:`, err);
            }
          });
        });
      });
    } catch (err) {
      console.log(err);
    }
  });
}

const generateErrorsLists = () => {
  const errors = Object.keys(nginxErrors).map((errorCode, index) => {
    if (index === 0) return `error_page ${errorCode} /html/${errorCode}.html;`
    else return `    error_page ${errorCode} /html/${errorCode}.html;`
  });
  return errors.join('\n');
};

const errorPagesConfig = serverConfig.NGINX.errorPages ? generateErrorsLists() : '';

const getUpstreams = () => {
  const servers = Object.values(serverConfig.NGINX.upstream);
  if (servers.length === 0) return '';

  const result = servers.map((server, index) => {
    if (index === 0) return `server ${server};`;
    else return `    server ${server};`;
  });

  return result.join('\n');
}

const upstreamAdresses = serverConfig.NGINX.upstream ? getUpstreams() : null;

const nginxConfig = `
worker_processes ${serverConfig.NGINX[`${os}`].workerProcesses};
${(os === 'linux' || os === 'macos') ? `worker_rlimit_nofile ${serverConfig.NGINX[`${os}`].workerRlimitNofile};` : ''}

events {
  worker_connections ${serverConfig.NGINX.workerConnections};
  ${os === 'linux' ? 'use epoll;' : ''}
  multi_accept ${serverConfig.NGINX.multiAccept};
}

http {
  charset utf-8;
  include mime.types;
  default_type application/octet-stream;
  ${serverConfig.NGINX.proxyCache ? `proxy_cache_path temp/proxy_cache levels=1:2 keys_zone=my_cache:10m max_size=1g inactive=60m use_temp_path=off;` : ''}

  limit_req_zone $binary_remote_addr zone=mylimit:5m rate=${serverConfig.NGINX.limits.requests};
  limit_req_status 429;

  limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:1m;
  limit_conn conn_limit_per_ip ${serverConfig.NGINX.limits.connectionsPerIP};

  fastcgi_buffer_size 32k;
  fastcgi_buffers 8 32k;
  fastcgi_read_timeout 300s;
  fastcgi_send_timeout 300s;

  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
  '$status $body_bytes_sent "$http_referer" '
  '"$http_user_agent" "$http_x_forwarded_for"';

  access_log logs/access.log main;

  sendfile on;

  ${(os === 'linux') ? 'aio on;' : ''}
  ${(os === 'linux') ? 'directio 8m;' : ''}
  ${(os === 'linux' || os === 'macos') ? 'tcp_nopush on;' : ''}
  ${(os === 'linux' || os === 'macos') ? 'tcp_nodelay off;' : ''}

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
  gzip_min_length ${serverConfig.NGINX.gzip.minLength};
  gzip_comp_level ${serverConfig.NGINX.gzip.level};
  gzip_types text/plain text/css text/xml text/javascript text/x-js text/x-json text/x-script text/x-component text/x-markdown application/json application/javascript application/x-javascript application/ecmascript application/xml application/xml+rss application/rss+xml application/atom+xml application/xhtml+xml application/x-web-app-manifest+json application/vnd.api+json application/ld+json application/pdf image/svg+xml;
  gzip_vary on;
  gzip_proxied any;
  gzip_http_version 1.1;
  gzip_buffers 32 4k;
  gzip_disable "msie6";

  keepalive_timeout 120;
  keepalive_requests 1000;

  reset_timedout_connection on;
  client_body_timeout 60;
  client_header_timeout 14;

  send_timeout 10;

  client_body_buffer_size 32k;
  client_header_buffer_size 1k;
  client_max_body_size 12m;
  large_client_header_buffers 2 1k;


  upstream nodeWikiApplication {
    ip_hash;
    ${!serverConfig.NGINX.upstream ? `server ${serverConfig.server.host}:${serverConfig.server.HTTPSPort};` :
    upstreamAdresses}
  }

  #server {
  #  listen ${serverConfig.server.HTTPPort};
  #  server_name ${serverConfig.server.host};
  #  return 301 https://$server_name$request_uri;
  #}

  server {
    listen 8080 ssl;
    http2 ${serverConfig.NGINX.HTTP2 ? 'on' : 'off'};
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
    listen ${serverConfig.NGINX.HTTPSPort} ssl${(os === 'linux') ? ' reuseport' : ''};
    http2 ${serverConfig.NGINX.HTTP2 ? 'on' : 'off'};
    server_name ${serverConfig.server.host};

    ssl_certificate "${sourceDir}/nkardaz.io.crt";
    ssl_certificate_key "${sourceDir}/nkardaz.io.key";

    access_log logs/host.access.log main;

    location / {
      proxy_http_version 1.1;
      limit_req zone=mylimit burst=${serverConfig.NGINX.limits.requestsBurst} delay=${serverConfig.NGINX.limits.requestsDelay};

      proxy_set_header Nginx-Active "true";

      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;

      proxy_cache_bypass $http_upgrade;

      proxy_set_header detected-user-device $detected_device;
      proxy_set_header user-ip-address $remote_addr;

      add_header X-Request-Detected-Device $detected_device;
      add_header Project-proxy 'Nginx $nginx_version';
      add_header X-Request-ID $request_id;
      add_header X-Request-Time $request_time;

      proxy_pass https://nodeWikiApplication/;
      proxy_read_timeout 60s;
      proxy_connect_timeout 30s;
      
      ${serverConfig.NGINX.proxyCache ? `
      proxy_cache my_cache;
      proxy_cache_key "$scheme$request_method$host$request_uri";
      proxy_cache_valid 200 302 ${serverConfig.server.proxyCacheValid};
      proxy_cache_valid 404 1m;
      proxy_cache_revalidate on;
      proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
      proxy_cache_lock on;
      proxy_cache_min_uses ${serverConfig.server.proxyCacheMinUses};
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

    ${serverConfig.NGINX.errorPages ? 
    `
    location /html/ {
      root ./;
      internal;
    }
    ` : ''}
  }
}
`;

const createNginxConfig = async () => {
  await writeFileAsync(serverConfig.NGINX.pathToSave, nginxConfig.split('\n').filter(line => line.trim()).join('\n'), 'utf-8');
}

module.exports = { createNginxConfig, generateErrorPages };