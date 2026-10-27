# 资源查找

未配置自定义资源时，`/data/<path>` 的顺序：

1. 本仓库同路径本地文件，例如 `data/cardprefixnametable.txt`。
2. `HAPPYRO_GATEWAY_RESOURCE_OVERRIDE_DIRS` 中按顺序的目录。根仓库原生配置为 `inputs/runtime/kro-20211105/client`、其下的 `data/`，然后是 `localization/client/data`。覆盖根目录拼接时会去掉请求路径里的 `data/` 前缀，并将客户端 CP949 字节形式的韩文路径还原为 Unicode。
3. `resources/data.grf`，通过 `DATA.INI` 指向运行目录中的官方包。

命中内容写入 LRU 缓存。修改覆盖或 GRF 后必须重启进程。`make configure-resources` 会校验中文表、安装卡片前缀，并把 GRF、`DATA.INI`、`AI`、`BGM`、`System` 链到本仓库。

路径可能混合 CP949 乱码目录和 Unicode 文件名。网关按片段转换，不能整路径当成一种编码。完整产品说明见根仓库 `docs/localization/client-resources.md`。

配置 `HAPPYRO_GATEWAY_CUSTOM_RESOURCE_DIR` 时，用户资源优先于上述来源和进程缓存；自定义请求使用 no-store，删除覆盖后回到内置来源。相关实现与维护见根仓库 `docs/architecture/customization.md`。
