# WebSocket 与反向代理

浏览器连接 `ws(s)://<gateway>/ws/127.0.0.1:6900` 这类目标。网关去掉 `/ws/` 前缀后，只允许 `WS_ALLOWED_TARGETS` 中的地址，再转到 rAthena TCP。

当前白名单：

```text
127.0.0.1:6900
127.0.0.1:6121
127.0.0.1:5121
```

`RATHENA_WEB_API_URL` 把用户配置等 HTTP API 转到 web-server。`/api/adventure-tools` 把游戏内冒险工具请求同源代理到 Admin，浏览器不持有 Game Control 密钥。
