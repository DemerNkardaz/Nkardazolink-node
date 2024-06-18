# NodeWiki

Subproject of my personal website…

## Requirements

|                Name               |    Version    |
| --------------------------------- | ------------- |
| NodeJS                            | ^v21.6.1      |
| Yarn                              | ^1.22.22      |
| …or NPM (Node Package Manager)    | ^10.8.1       |
| Git Bash (Optional?)              | ^4.4.23       |
| Proccess Manager 2 (Optional)     | ^5.4.0        |
| NGINX (Optional)                  | ^1.27.0       |
| PHP (Optional)                    | ^8.3.2        |

`NOTE:` Some node modules can be crashed on newest NodeJS versions.


**About requirements**

`Yarn/NPM:` Yarn used by default, but you can remove yarn.lock and initialize npm if you want. But, with npm you need to edit `getFixedSharp-RUN_SECONDARY_IF_WINDOWS.sh` (for Windows users).

`Git Bash:` For run .sh? Or you can rename extensions of “starting scripts” to .cmd (for Windows users).

`Proccess Manager 2:` For cluster-spawn of application.

`NGINX:` Configured for reverse-proxy, some limitations and headers additions.

`PHP:` If you want to use phpMyAdmin.