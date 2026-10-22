# Gateway 文档

- [架构](architecture.md)、[开发与检查](development.md)
- [配置](configuration.md)、[资源解析](resource-resolution.md)
- [WebSocket 与代理](connections.md)、[保持登录](game-sessions.md)
- [故障检查](troubleshooting.md)

本仓库负责网关行为，安装与正式发布由[根仓库](https://github.com/happyro/happyro)编排。上游项目见根 README，不复制多语言上游安装教程或历史实施报告。版本历史保留在 CHANGELOG.md 和 changelog/。

## 发布与变更记录

本仓库随 HappyRO 统一版本交付，目标版本读取根仓库 `deploy/docker/VERSION`。准备中的功能和升级要求见[版本摘要](../../../changelog/releases/v0.5.0.md)，本仓库原始变化见 [changelog](../changelog/)。镜像构建与最终包验收按根仓库[发布流程](../../../docs/operations/docker-release.md)执行，文档整理不表示已经发布。
