# HappyRO Gateway

HappyRO 的 Node.js 网关。一个进程提供 PWA 静态文件、客户端资源、WebSocket 到 rAthena 的代理，以及 Web API / 冒险工具反向代理。

基于 [roBrowserLegacy-RemoteClient-JS](https://github.com/FranciscoWallison/roBrowserLegacy-RemoteClient-JS)。上游说明保留在 [docs/upstream.md](docs/upstream.md)。

本机由根仓库启动，监听 `127.0.0.1:3338`。

## 文档

- [架构](docs/architecture.md)
- [配置](docs/configuration.md)
- [资源查找](docs/resource-resolution.md)
- [WebSocket 代理](docs/websocket-proxy.md)
- [故障检查](docs/troubleshooting.md)

## 本机入口

```bash
make configure-gateway
make configure-resources
make gateway-start
make gateway-verify
```

浏览器入口：<http://127.0.0.1:3338/applications/pwa/index.html>

仓库内 `data/` 是本机部署副本，中文源在根仓库 `localization/client/data/`。

## 保持登录

`/api/game-session/create`、`resume`、`revoke` 使用现有 `RATHENA_WEB_API_URL` 访问配套服务端会话接口。需要服务端会话表及 0x0d05 登录扩展；不把密码写入 Cookie 或浏览器存储。

HTTP 与 HTTPS 均支持 30 天保持登录：Cookie 为 HttpOnly、SameSite=Strict，HTTPS 额外设置 Secure，并采用独立 Cookie 名称；反向代理需保留浏览器 Host。请求必须携带匹配 Host 的 HTTP/HTTPS Origin 和 application/json，跨站来源被拒绝。响应 no-store，凭据不写日志。页面内会话返回临时凭据供客户端仅保留在内存。

Gateway 使用系统随机源生成 256 位凭据，恢复时轮换并换取单次游戏票据；服务端负责摘要存储、过期、密码／封禁检查与撤销。会话接口错误不会清除其他标签页刚轮换的 Cookie。

测试：`node --test test/game-session.test.js test/http-proxy.test.js`。
