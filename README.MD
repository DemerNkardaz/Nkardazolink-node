# NodeWiki

Subproject of my personal website…

## Requirements

|                Name               |    Version    |
| --------------------------------- | ------------- |
| NodeJS                            | ^v21.6.1      |
| Yarn                              | ^1.22.22      |
| …or NPM (Node Package Manager)    | ^10.8.1       |
| Git Bash (Optional)               | ^4.4.23       |
| Process Manager 2 (Optional)      | ^5.4.0        |
| NGINX (Optional)                  | ^1.27.0       |
| PHP (Optional)                    | ^8.3.2        |

**Note:** Some Node modules may encounter issues with the latest NodeJS versions.

**About Requirements:**

- **Yarn/NPM:** Yarn is used by default, but you can remove `yarn.lock` and initialize npm if desired. If using npm, you'll need to edit `getFixedSharp-RUN_SECONDARY_IF_WINDOWS.sh` (for Windows users) and `getNodeModules-RUN_FIRSTLY.sh` (containts just `yarn` command by default).

- **Git Bash:** Required to run `.sh` scripts. Alternatively, you can rename the extension of "starting scripts" to `.cmd` (for Windows users).

- **Process Manager 2:** Used for application cluster spawning.

- **NGINX:** Configured for reverse-proxy with some limitations and additional headers.

- **PHP:** Optional for using phpMyAdmin.

## .ENV

Future info block…

## SERVER.INI

This is your main configuration file for controlling the behavior of the NodeJS server and preferences for (re-)building.

It includes options for ports, hosts, paths, limitations (e.g., allowed file types, caching options, supported languages), etc.

It is recommended to review this file before the initial build.

## CORE-CONFIG.YAML

Secondary-main configuration file that includes dependencies on NodeJS modules and global variables.

## Project Structure

The default project structure looks like this:

```
node-wiki-application/
├── app/ # This directory contains the built application from src/serverside/ files.
│   └── …
├── assets/ # Contains static files that are not media, e.g., localization .yaml (or .json) files.
│   └── locale/ # Default folder to store localization files.
│       ├── asset.common.yaml
│       ├── asset.templates.yaml
│       ├── license.en.yaml
│       ├── license.ja.yaml
│       ├── license.ko.yaml
│       ├── license.mo.yaml
│       ├── license.ro.yaml
│       ├── license.ru.yaml
│       ├── license.vi.yaml
│       ├── license.zh.yaml
│       ├── main.en.yaml
│       ├── main.ja.yaml
│       ├── main.ko.yaml
│       ├── main.mo.yaml
│       ├── main.ro.yaml
│       ├── main.ru.yaml
│       ├── main.vi.yaml
│       ├── main.zh.yaml
│       └── misc.yaml
├── bin/ # Contains binary/bash files, e.g., for starting nginx or other commands.
├── cache/
│   └── …
├── extensions/ # Dedicated folder for modules classified as “extensions”.
│   ├── … # List of extension folders. The index files must have the same name as the extension
│   └── config.yaml # File where you can enable or disable extensions.
├── modules/ # Dedicated folder for modules, including core modules required for the server to work.
│   ├── … # List of module folders. The index files must have the same name as the module folder.
│   └── config.yaml # File where you can enable or disable modules.
├── node_modules/…
├── server.workers/
│   └── server/ # Includes scripts to (re-)build the project and handle scripts.yml
├── shared/ # Default folder for shared static assets (convenient for working with "ImageHandler" like extensions)
│   ├── docs/
│   ├── fonts/
│   ├── images/
│   └── media/
├── static/ # Contains some static files e.g., clientside JavaScript, sitemaps et.c.
│   ├── public/
│   │   ├── manifest/
│   │   │   └── …
│   │   └── script/
│   │       └── …
│   └── site.maps/
│       └── …
├── src/ # Your development folder, where you can edit server/client logic and templates.
│   ├── clientside/ # Folder containing logic used in the client browser.
│   │   └── …
│   └── serverside/ # Folder containing logic used in NodeJS.
│       ├── components/ # Stores .ejs (.md or .pug if desired) component templates
│       │   └── <component_name>.ejs
│       ├── document/ # Stores .ejs (.md or .pug if desired) head and body templates.
│       │   └── <component_name>.ejs
│       ├── styles /
│       │   ├── …/
│       │   ├── index.scss # Required file.
│       │   └── <style>.scss
│       ├── templates/ # Stores JavaScript templates, e.g., template for building web-manifests.
│       │   └── manifest_template.js
│       ├── 404.pug
│       ├── 500.pug
│       └── layout.ejs # Mainframe file for generating HTML.
├── Tools/
│   ├── nginx/
│   │   ├── html/ # Collects error pages for nginx if this option is enabled in server.ini.
│   │   └── nginx.conf
│   ├── phpMyAdmin?/
│   └── php.ini # If you want yo use phpMyAdmin.
├── .env
├── build.js  # File that builds and rebuilds the project.
├── core-config.yaml
├── index.dev.js
├── index.js
├── nodemon.json
├── package.json
├── pm2.config.json # If you want to use Process Manager 2.
├── scripts.ymll # List of commands used by package.json via server.workers/server/run-script.js
├── server.ini
└── yarn.lock
```