# Changelog

## Unreleased

- 支持按顺序读取多个客户端资源覆盖目录，使已审查的运行时中文 LUB 优先于原始 GRF。
- 增加游戏内冒险工具到 Admin API 的同源反向代理，浏览器无需持有 Game Control 服务密钥。
- 集成 HappyRO 所需的 rAthena Web API 代理、WebSocket 目标重定向和混合编码资源路径处理。
- 支持通过可选环境变量分别配置浏览器资源地址和 WebSocket 代理地址。
- 增加可重复执行的 GRF 全量提取工具，生成资源路径、大小和 SHA-256 清单。
