# 开发与检查

在 Gateway 仓库执行；先由根仓库准备 `.env`、客户端产物与运行资源。不要在已由服务管理器监听的端口另启动开发进程。

```bash
npm ci
npm start
```

只读诊断与回归：

```bash
npm run doctor
node --test test/*.test.js
```

`npm run prepare` 会生成索引和路径映射，不等于只读诊断。资源提取、转换和验证工具位于 `tools/`，执行写操作前核对输入与输出目录；生成物放入根工作区 work/ 或 artifacts/。

代理／Cookie 修改检查同源验证、Host、超时、错误脱敏和 HTTP／HTTPS；资源查找修改检查 CP949 路径、覆盖优先级及缓存。启动成功不能替代实际登录和进图验收。
