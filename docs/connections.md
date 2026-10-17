# WebSocket 与反向代理

浏览器连接 `ws(s)://<gateway>/ws/127.0.0.1:6900` 这类目标。网关去掉 `/ws/` 前缀后，只允许 `WS_ALLOWED_TARGETS` 中的地址，再转到 rAthena TCP。

根仓库本机配置示例（容器部署使用容器内服务地址，以实际环境为准）：

```text
127.0.0.1:6900
127.0.0.1:6121
127.0.0.1:5121
```

`RATHENA_WEB_API_URL` 把用户配置等 HTTP API 转到 web-server。`/api/adventure-tools` 把游戏内冒险工具请求同源代理到 Admin，浏览器不持有 Game Control 密钥。

保持登录的反向代理还需保留浏览器 Host（含端口），详见下方会话规则。

## 保持登录与连接恢复

`/api/game-session/create`、`resume`、`revoke` 使用现有 `RATHENA_WEB_API_URL` 访问配套服务端会话接口。需要服务端会话表及 0x0d05 登录扩展；不把密码写入 Cookie 或浏览器存储。

HTTP 与 HTTPS 均支持 30 天保持登录：Cookie 为 HttpOnly、SameSite=Strict，HTTPS 额外设置 Secure，并采用独立 Cookie 名称；反向代理需保留浏览器 Host。请求必须携带匹配 Host 的 HTTP/HTTPS Origin 和 application/json，跨站来源被拒绝。响应 no-store，凭据不写日志。页面内会话返回临时凭据供客户端仅保留在内存。

Gateway 使用系统随机源生成 256 位凭据，恢复时轮换并换取单次游戏票据；服务端负责摘要存储、过期、密码／封禁检查与撤销。会话接口错误不会清除其他标签页刚轮换的 Cookie。

测试：`node --test test/game-session.test.js test/http-proxy.test.js`。
