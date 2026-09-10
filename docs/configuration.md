# 配置

根仓库 `make configure-gateway` 把 `deploy/remote-client/.env.example` 安装为本仓库 `.env`。

| 变量 | 作用 |
| --- | --- |
| `PORT` | HTTP 与 WebSocket 端口，默认 `3338` |
| `ROBROWSER_PATH` | PWA 静态根，指向 Client `dist/Web` |
| `ROBROWSER_PUBLIC_PATH` | 浏览器路径前缀 `/applications/pwa` |
| `WS_ALLOWED_TARGETS` | 允许的 TCP 目标 |
| `RATHENA_WEB_API_URL` | web-server 基址 |
| `DATA_OVERRIDE_PATH` | 冒号分隔的覆盖目录 |
| `ENABLE_WSPROXY` | 内嵌 WebSocket 代理 |
| `ENABLE_STATIC_SERVE` | 内嵌静态文件服务 |
| `ESRGAN_ENABLED` | 必须为 `false` |

可选 `REMOTE_CLIENT_URL` 和 `SOCKET_PROXY_URL` 会写入 Client `Config.runtime.js`。本机保持为空，让浏览器使用当前页面 origin。
