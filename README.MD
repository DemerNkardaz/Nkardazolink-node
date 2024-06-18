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

- **Yarn/NPM:** Yarn is used by default, but you can remove `yarn.lock` and initialize npm if desired. If using npm, you'll need to edit `getFixedSharp-RUN_SECONDARY_IF_WINDOWS.sh` for Windows users and `getNodeModules-RUN_FIRSTLY.sh` (containts just `yarn` command by default).

- **Git Bash:** Required to run `.sh` scripts. Alternatively, you can rename the extension of "starting scripts" to `.cmd` for Windows users.

- **Process Manager 2:** Used for application cluster spawning.

- **NGINX:** Configured for reverse-proxy with some limitations and additional headers.

- **PHP:** Optional for using phpMyAdmin.
