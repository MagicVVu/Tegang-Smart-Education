# C-07 三档模拟数据

本目录提供 small、standard、stress 三档可重复生成的数据集。生成规则、固定词表、profile 配置和模板是唯一权威来源；数据库只是身份数据的装载目标，`packages/mock-data` 是从 small 派生的前端适配产物。

请先阅读 [模拟数据免责声明](DISCLAIMER.md)。

## 目录

```text
data/
  DISCLAIMER.md
  README.md
  dictionary/             固定中文词表与模拟内容主题
  profiles/               三档已批准精确数量
  templates/              带 JSON 元数据头的 Markdown 模板
  small/                  已提交、可读、可直接验证的 canonical 数据集
  generated/              standard/stress 本地按需生成，Git 忽略
  exports/                匿名白名单导出，Git 忽略
```

每档数据包含身份、知识引用、知识点、题目、课程、培训目标、任务、方案、审批、学习记录、测评、补训、复测、Agent Run/State/Step 和事件。完整业务数据库表尚未建立，因此身份以外的业务对象保持为版本化文件。

## 已批准规模

| 对象 | small | standard | stress 默认值 |
| --- | ---: | ---: | ---: |
| 组织 / 部门 / 角色 | 1 / 4 / 4 | 1 / 4 / 4 | 1 / 4 / 4 |
| 岗位 / 用户及画像 | 8 / 16 | 16 / 100 | 24 / 800 |
| 文档 / 知识引用 / 知识点 / 题目 | 8 / 8 / 24 / 48 | 40 / 40 / 200 / 400 | 40 / 40 / 200 / 400 |
| 课程 / 目标 / 任务 / 方案 | 8 / 3 / 6 / 12 | 40 / 12 / 30 / 60 | 40 / 40 / 200 / 400 |
| 审批 / 学习记录 | 4 / 24 | 12 / 600 | 80 / 8,000 |
| 测评会话及结果 | 16 / 16 | 400 / 400 | 4,000 / 4,000 |
| 补训 / 复测 | 4 / 4 | 80 / 80 | 800 / 800 |
| Agent Run / Step / Event | 6 / 24 / 36 | 30 / 150 / 300 | 200 / 1,000 / 2,000 |

stress 的用户数可在 500—1000 内显式调整，任务数和学习记录数也有 profile 中声明的安全边界。覆盖值属于 manifest 生成参数；stress 永不在安装、普通启动或默认测试中自动生成。

## 确定性规则

- `dataset_version=1.0.0`
- `generator_version=1.0.0`
- `random_seed=20260816`
- `fixed_epoch=2026-08-16T00:00:00Z`
- 契约版本取当前代码的 `CONTRACT_SCHEMA_VERSION`；本基线为 `2.2.0`
- C-06 组织、四部门、四角色和四个旗舰身份 ID 保持不变
- 其他外部 ID 使用固定时间戳偏移与 SHA-256 派生的 80 位熵编码为 Crockford Base32 ULID
- 数据版本、profile、种子、对象类型和逻辑序号共同参与 ID 计算
- UTF-8 无 BOM、LF 换行、JSON 键排序、JSONL 固定记录顺序
- `generated_at` 等于固定基准时间，不读取系统当前时间
- manifest 记录文件 SHA-256、字节数、对象数、ID 范围、生成参数、契约版本和自身规范化哈希

同一版本、profile、种子、基准时间和数量参数重复生成必须得到相同文件字节和 manifest 哈希。数据集版本变化时，除固定 C-06 基础对象外，其他 ID 会变化。

## 命令

从仓库根目录运行：

```powershell
pnpm data:generate -- --profile small
pnpm data:validate -- --profile small
pnpm data:generate -- --profile standard
pnpm data:generate -- --profile stress
pnpm data:seed -- --profile small
pnpm data:reset -- --profile small --confirm-simulated-data
pnpm data:export -- --profile small --anonymized
```

stress 覆盖示例：

```powershell
pnpm data:generate -- --profile stress --users 1000 --training-tasks 300 --learning-records 12000
```

命令不调用大模型、外部 API 或网络数据源。失败返回非零退出码。

## 文件与字段

- `*.jsonl`：一行一个结构化对象；已有公开对象由当前 Pydantic 契约校验。
- `documents/*.md`：`---json` 和 `---` 之间是单行 JSON 元数据，之后是模拟 Markdown 正文。
- `knowledge_points.jsonl`：知识点、引用、文档 slug、风险等级和独立通过阈值。
- `questions.jsonl`：正式 `AssessmentQuestion`、答案索引、解析和知识引用。
- `learning_records.jsonl`：任务与员工画像的复合关联，不发明新的公开实体 ID。
- `agent_runs.jsonl`：包含可恢复 Agent State 和可公开的决策摘要；步骤单独位于 `agent_steps.jsonl`。
- `manifest.json`：数据版本、参数、数量、ID 范围、文件哈希和生成器信息。

所有主对象 ID 必须全局唯一，所有外键必须可解析。高风险知识点必须有题目并使用 100% 独立通过阈值；测评、补训和复测链路必须指向同一任务和员工。

## Seed 与 Reset 边界

`data:seed` 首先复用 C-06 `bootstrap_identity`，因此新数据库必须在本机 `.env` 中提供四个至少 12 位的 `BOOTSTRAP_*_PASSWORD`。密码不打印、不进入数据文件、不进入 manifest，也不写入 Git。其余 C-07 员工不创建登录凭证。

当前只向已有表装载：

- C-06 模拟组织、四部门、四角色和四旗舰身份；
- C-07 新增岗位、非旗舰用户、员工画像及用户角色/部门关系。

培训、知识、审批、测评和 Agent 数据暂不写数据库。seed 使用确定性外部 ID 幂等执行；发现同 ID 不同内容或非旗舰用户出现凭证时拒绝覆盖。

`data:reset`：

- 必须显式提供 `--confirm-simulated-data`；
- `APP_ENV=production` 时无条件拒绝；
- 只处理目标 manifest 精确列出的非旗舰 ID；
- 同时校验模拟组织标记、画像 `simulated:c07:<version>:<profile>` 标签、凭证、会话和外部引用；
- 保留 C-06 组织、部门、角色、四旗舰账号、凭证和其他不相关记录；
- 删除与重建在一个数据库事务中完成，失败整体回滚；
- 不清库、不删表、不删卷、不修改 Alembic 历史。

## 匿名导出

`data:export --anonymized` 从通过校验的文件数据集读取，并为每类对象使用显式字段白名单。导出不会查询数据库，因此不会接触密码哈希、Access Token、Refresh Token、Cookie、会话或安全审计摘要。用户展示名会替换为稳定模拟别名；业务外部 ID、部门、岗位、状态、风险和关联关系可以保留。

## 后续任务边界

- C-08 可读取 standard 的 Markdown、知识引用和知识点，但本任务不实现 RAG。
- C-14 可读取 standard 的题目、答案、解析和测评链路，但本任务不实现评测框架。
- C-19 可读取 stress profile 和 manifest 参数，但本任务不实现压测系统。
