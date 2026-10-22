# 保持登录与连接恢复

`/api/game-session/create`、`resume`、`revoke` 使用现有 `RATHENA_WEB_API_URL` 访问配套服务端会话接口。需要服务端会话表及 0x0d05 登录扩展；不把密码写入 Cookie 或浏览器存储。

HTTP 与 HTTPS 均支持 30 天保持登录：Cookie 为 HttpOnly、SameSite=Strict，HTTPS 额外设置 Secure，并采用独立 Cookie 名称；反向代理需保留浏览器 Host。请求必须携带匹配 Host 的 HTTP/HTTPS Origin 和 application/json，跨站来源被拒绝。响应 no-store，凭据不写日志。页面内会话返回临时凭据供客户端仅保留在内存。

Gateway 使用系统随机源生成 256 位凭据，恢复时轮换并换取单次游戏票据；服务端负责摘要存储、过期、密码／封禁检查与撤销。会话接口错误不会清除其他标签页刚轮换的 Cookie。

测试：`node --test test/game-session.test.js test/http-proxy.test.js`。

## 配套更新与验收

客户端、Gateway、login-server、web-server 与会话数据库结构必须配套更新；部署编排会执行 `upgrade_20261012_sessions.sql`。只替换 Gateway 不能使旧服务端支持恢复。

维护代理时核对 Host 含端口、HTTP／HTTPS Cookie 隔离、Origin 校验和禁止缓存；再验证创建、轮换、一次性票据、撤销及失败响应。源码测试不代替最终容器及手机后台恢复验收。
