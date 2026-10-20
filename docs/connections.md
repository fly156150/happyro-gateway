# WebSocket 与反向代理

浏览器连接 `ws(s)://<gateway>/ws/127.0.0.1:6900` 这类目标。网关去掉 `/ws/` 前缀后，只允许 `WS_ALLOWED_TARGETS` 中的地址，再转到 rAthena TCP。

根仓库本机配置示例（容器部署使用容器内服务地址，以实际环境为准）：

```text
127.0.0.1:6900
127.0.0.1:6121
127.0.0.1:5121
```

`RATHENA_WEB_API_URL` 把用户配置等 HTTP API 转到 web-server。`/api/adventure-tools` 把游戏内冒险工具请求同源代理到 Admin，浏览器不持有 Game Control 密钥。

保持登录的反向代理还需保留浏览器 Host（含端口）。会话创建、恢复与撤销的接口、Cookie 和验证见[保持登录与连接恢复](game-sessions.md)。
