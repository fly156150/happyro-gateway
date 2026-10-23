# 配置

根仓库 `make configure-gateway` 把 `deploy/remote-client/.env.example` 安装为本仓库 `.env`。

| 变量 | 作用 |
| --- | --- |
| `HOST` | 监听地址；仓库示例为 `127.0.0.1`，未设置时使用 Node.js 默认监听行为 |
| `PORT` | HTTP 与 WebSocket 端口，默认 `3338` |
| `ROBROWSER_PATH` | PWA 静态根，指向 Client `dist/Web` |
| `ROBROWSER_PUBLIC_PATH` | 浏览器路径前缀 `/applications/pwa` |
| `WS_ALLOWED_TARGETS` | 允许的 TCP 目标 |
| `RATHENA_WEB_API_URL` | web-server 基址 |
| `DATA_OVERRIDE_PATH` | 冒号分隔的覆盖目录 |
| `CUSTOM_RESOURCE_PATH` | 用户资源目录，优先于内置来源与缓存；路径相对于客户端 data/ |
| `ENABLE_WSPROXY` | 内嵌 WebSocket 代理 |
| `ENABLE_STATIC_SERVE` | 内嵌静态文件服务 |
| `CLIENT_DIAGNOSTICS_DIR` | 可选手机调试日志目录；未设置时关闭接收 |
| `ESRGAN_ENABLED` | 必须为 `false` |

可选 `REMOTE_CLIENT_URL` 和 `SOCKET_PROXY_URL` 通过动态 `Config.runtime.js` 返回。本机保持为空，让浏览器使用当前页面 origin。

设置 `CLIENT_DIAGNOSTICS_DIR=../../work/diagnostics/client` 并重启 Gateway 后，带 `?debug=1` 的新版 Client 会自动将日志回传到 `/api/client-diagnostics`。相对路径基于进程工作目录，文件按 UTC 日期和服务端生成的会话 UUID 保存为 JSONL，不提供读取接口。接收器只接受同源请求，单请求上限 48 KiB，单会话 20 MiB，目录累计 256 MiB；容量满时返回 507，清理已分析日志并重启服务后再采集。批次按序号去重，断线重试不会重复写入。

## 客户端默认设置

`.env.example` 中的 53 个 `CLIENT_*` 设置可覆盖镜头、自动战斗/瞬移、拾取、画质、音频、界面和地图显示的默认值；空值使用 PWA 内置值。默认值及校验范围由 `ROBROWSER_PATH/client-defaults.schema.json` 提供，该文件由 Client 完整构建生成。Gateway 不维护第二份生产默认值。

布尔值只接受 true/false，数值按定义校验范围和整数要求；拾取类别采用不重复的逗号列表。活动范围不得小于搜怪范围。配置非法或默认定义缺失时拒绝启动。新增配置项需先部署新版 PWA；仅调整现有变量时，重启 Gateway 并刷新游戏页面即可。

Gateway 动态提供 `<ROBROWSER_PUBLIC_PATH>/Config.runtime.js`，优先于静态路由并禁用缓存。PWA 构建覆盖静态空模板不会改变该响应，不再写入构建目录。已有玩家 localStorage 设置优先；恢复默认使用部署值，运行中的自动战斗状态不属于部署配置。

`CLIENT_SCRIPT_TEXT_MIN_CONTRAST` 设置 NPC/任务脚本文字的最低对比度目标，范围 4.5–7、默认 4.5；颜色修正始终开启。无法达到目标时采用对比度最高的黑/白端点。
