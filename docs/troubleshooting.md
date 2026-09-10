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
- Web API 代理：`RATHENA_WEB_API_URL` 必须指向 `http://127.0.0.1:8889`。

日志：`work/runtime/gateway/gateway.log`（由根仓库脚本指定）。
