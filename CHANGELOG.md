# Changelog

日期变更见 [changelog/](changelog/)，功能和配置以 [当前文档](docs/README.md) 为准。以下保留早期功能记录，不重复计作新版本变更。

## 早期功能记录

- 新增游戏会话创建、轮换与撤销 API；HTTP 和 HTTPS 均支持保持登录，持久凭据使用 HttpOnly Cookie，HTTPS 另设 Secure，页面内会话不写 Cookie。
- 使用系统随机源生成凭据和一次性票据，拒绝跨站请求并禁止响应缓存；配套服务端会话表与认证扩展，相关 Cookie、轮换、撤销及实际三端流程验证通过。

- 默认 `ROBROWSER_PATH` 指向 HappyRO 客户端 `dist/Web`。
- `getFile` 拒绝用户路径中的 `..`，避免解析到配置根目录之外。
- `POST /search` 将过滤条件当作字面量，不再把未认证输入编译成正则。
- 根 README 改为 HappyRO Gateway 说明，并记录资源查找、缓存、覆盖目录、WebSocket 与反向代理。
- 支持按顺序读取多个客户端资源覆盖目录，使已审查的运行时中文 LUB 优先于原始 GRF。
- 增加游戏内冒险工具到 Admin API 的同源反向代理，浏览器无需持有 Game Control 服务密钥。
- 集成 HappyRO 所需的 rAthena Web API 代理、WebSocket 目标重定向和混合编码资源路径处理。
- 支持通过可选环境变量分别配置浏览器资源地址和 WebSocket 代理地址。
- 增加可重复执行的 GRF 全量提取工具，生成资源路径、大小和 SHA-256 清单。
