# 故障检查

在 HappyRO 根仓库执行 `make gateway-verify`；在 Gateway 仓库执行：

```bash
npm run doctor
```

常见问题：

- `3338` 被占用：停掉旧的 Gateway 或其它 HTTP 服务。
- 资源仍是韩文：先区分客户端 JS 名称表、服务端文本和运行 LUB。JS 需全量构建 PWA；LUB 需从当前翻译源编译、语义校验并安装到运行覆盖路径，核对哈希后重启 Gateway 清缓存；`make configure-resources` 只配置资源路径，不编译翻译。
- PWA 404：确认 `ROBROWSER_PATH` 指向已构建的 `dist/Web`。
- WebSocket 失败：Server 未就绪，或不在白名单内。
- Web API 代理：核对 `RATHENA_WEB_API_URL`；本机通常为 `http://127.0.0.1:8889`，容器使用内部服务地址。

Linux 根仓库脚本通常使用 `work/runtime/gateway/gateway.log`；macOS launchd 使用 `work/runtime/native/logs/gateway.log`，以实际服务配置为准。只检查本次启动后的日志，不用累计日志中的旧 ready 行证明当前服务正常。

保持登录失败时核对 Origin 与 Host、Cookie 协议、服务端会话 SQL 和客户端／Gateway／Server 配套版本，见[会话说明](game-sessions.md)。

## 客户端界面仍是旧版

在客户端执行 `npm run build -- --all`（或 `npm run build:pwa`），确认 `ROBROWSER_PATH` 指向这份 `dist/Web`。在根仓库执行 `bash scripts/client/refresh-client.sh verify --no-color`，比较本地和 3338 的 buildId、关键产物哈希；通过后再强制刷新浏览器。仅构建 Online 会把启动页替换为直接进游戏的入口，不用于本机验收。

`refresh-client.sh build` 还通过 systemd 查找 API 服务用户，属于 Linux 编排；macOS 先分别同步目录、构建，再使用跨平台的 verify 子命令。Node 源码和环境变化需要重启实际 Gateway 进程；单纯构建 PWA 不等于重启 Gateway。
