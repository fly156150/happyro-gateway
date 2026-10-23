# 架构

默认统一模式：一个 Express 进程。

```text
浏览器 :3338
  ├── /applications/pwa/*     Client dist/Web
  ├── /data/*                 本地文件 → DATA_OVERRIDE_PATH → GRF
  ├── /ws/<host:port>         WebSocket → rAthena TCP
  ├── /api/game-session/*     → 配套服务端会话 API
  ├── /api/client-diagnostics  → 可选本地诊断日志
  ├── rAthena Web API 代理    → web-server :8889
  └── /api/adventure-tools    → happyro-api 玩家接口
```

查找实现见 `src/controllers/clientController.js`。代理见 `src/middlewares/httpProxyMiddleware.js` 与根目录 `index.js`。
