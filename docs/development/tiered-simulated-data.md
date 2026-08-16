# 三档确定性模拟数据基线

C-07 在现有组织、身份、权限和跨模块契约上建立 small、standard、stress 三档模拟数据。完整说明、对象数量、命令、字段、seed/reset 边界和免责声明见 [`data/README.md`](../../data/README.md)。

实际执行结果见 [`docs/test-reports/c07-validation.md`](../test-reports/c07-validation.md)。

## 权威来源和前端兼容

生成规则、`data/dictionary`、`data/profiles` 和 `data/templates` 是唯一手工维护来源。small 生成物提交到仓库；standard/stress 位于 Git 忽略目录并按需生成。`packages/mock-data/src/small.generated.ts` 与 small 同次生成，`packages/mock-data/src/index.ts` 只保留稳定导出边界，因此 Web/Android 不再维护第二套手写旗舰数据。

公开 Pydantic 契约没有修改。文档元数据、知识点、题目解析和学习分配使用 `backend/app/simulated_data` 中的内部数据模型，不加入公开契约 registry。没有新增业务数据库表或迁移。

## 安全边界

生成器不使用系统当前时间、Python 随机 hash、无种子随机、大模型、外部 API、机器路径或执行顺序作为数据来源。数据库 seed 只装载现有身份表；reset 需要精确 ID、模拟标记、显式确认和非生产环境，并在一个事务中完成。

匿名导出只读取已验证的文件数据集并使用字段白名单，明确排除凭证、会话、Token、Cookie、环境变量、本地路径和安全审计摘要。

## 普通启动影响

`pnpm install`、`pnpm bootstrap`、应用普通启动和默认测试都不会生成或装载 stress。small 生成和验证为快速路径；standard/stress 只通过显式命令执行。
