# 故障检查

```bash
make gateway-verify
npm run doctor
```

常见问题：

- `3338` 被占用：停掉旧的 Gateway 或其它 HTTP 服务。
- 资源仍是韩文：重新 `make configure-resources` 并重启，不要只改源文件。
- PWA 404：确认 `ROBROWSER_PATH` 指向已构建的 `dist/Web`。
- WebSocket 失败：Server 未就绪，或不在白名单内。
- Web API 代理：核对 `RATHENA_WEB_API_URL`；本机通常为 `http://127.0.0.1:8889`，容器使用内部服务地址。

日志：`work/runtime/gateway/gateway.log`（由根仓库脚本指定）。

保持登录失败时核对 Origin 与 Host、Cookie 协议、服务端会话 SQL 和客户端／Gateway／Server 配套版本，见[会话说明](game-sessions.md)。
