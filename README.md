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
