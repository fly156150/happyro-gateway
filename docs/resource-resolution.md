# 资源查找

`/data/<path>` 的顺序：

1. 本仓库同路径本地文件，例如 `data/cardprefixnametable.txt`。
2. `DATA_OVERRIDE_PATH` 中按顺序的目录。当前为 `inputs/runtime/kro-20211105/client`，然后是 `localization/client/data`。覆盖根目录拼接时会去掉路径里的 `data/` 前缀。
3. `resources/data.grf`，通过 `DATA.INI` 指向运行目录中的官方包。

命中内容写入 LRU 缓存。修改覆盖或 GRF 后必须重启进程。`make configure-resources` 会校验中文表、安装卡片前缀，并把 GRF、`DATA.INI`、`AI`、`BGM`、`System` 链到本仓库。

路径可能混合 CP949 乱码目录和 Unicode 文件名。网关按片段转换，不能整路径当成一种编码。完整产品说明见根仓库 `docs/localization/client-resources.md`。
