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
| `CLIENT_DIAGNOSTICS_DIR` | 可选手机调试日志目录；未设置时关闭接收 |
| `ESRGAN_ENABLED` | 必须为 `false` |

可选 `REMOTE_CLIENT_URL` 和 `SOCKET_PROXY_URL` 会写入 Client `Config.runtime.js`。本机保持为空，让浏览器使用当前页面 origin。

设置 `CLIENT_DIAGNOSTICS_DIR=../../work/diagnostics/client` 并重启 Gateway 后，带 `?debug=1` 的新版 Client 会自动将日志回传到 `/api/client-diagnostics`。相对路径基于进程工作目录，文件按 UTC 日期和服务端生成的会话 UUID 保存为 JSONL，不提供读取接口。接收器只接受同源请求，单请求上限 48 KiB，单会话 20 MiB，目录累计 256 MiB；容量满时返回 507，清理已分析日志并重启服务后再采集。批次按序号去重，断线重试不会重复写入。
