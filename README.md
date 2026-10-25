# HappyRO Gateway

HappyRO 的 Node.js 网关。一个进程提供 PWA 静态文件、客户端资源、WebSocket 到 rAthena 的代理，以及 Web API / 冒险工具反向代理。

基于 [roBrowserLegacy-RemoteClient-JS](https://github.com/FranciscoWallison/roBrowserLegacy-RemoteClient-JS)。HappyRO 配置与运行方式以本仓库文档和根仓库编排为准。

本机由根仓库启动，默认端口 `3338`；监听地址由 `HOST` 决定，仓库示例为 `127.0.0.1`。局域网访问需按实际部署配置监听地址或反向代理入口。

## 文档

- [文档索引](docs/README.md)
- [架构](docs/architecture.md)
- [配置](docs/configuration.md)
- [资源查找](docs/resource-resolution.md)
- [WebSocket 代理](docs/connections.md)
- [故障检查](docs/troubleshooting.md)

## 本机入口

以下命令从 HappyRO 根仓库执行：

```bash
make configure-gateway
make configure-resources
make gateway-start
make gateway-verify
```

浏览器入口：<http://127.0.0.1:3338/applications/pwa/index.html>

仓库内 `data/` 是本机部署副本，中文源在根仓库 `localization/client/data/`。

## 保持登录

HTTP／HTTPS 的 Cookie、临时凭据、代理和服务端依赖见[会话说明](docs/game-sessions.md)。

上述本机 make 启停入口面向 Linux systemd；macOS 使用已配置的 launchd 服务，见根仓库[服务管理](../../docs/operations/services.md)。构建与重启是两个步骤，核对服务实际使用的产物路径后再验收。
