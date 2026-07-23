# 特钢智教 Agent

面向特钢企业员工培训场景的受控自主培训 Agent 项目。

> 当前阶段：**项目规划与研究准备**。仓库已建立导航、治理台账和后续代码域占位，但尚未进入数据库、RAG、多 Agent 核心编码，也不代表任何具体技术方案已经定稿。

## 从这里开始

| 入口 | 当前内容 |
| --- | --- |
| [立即看 Demo](docs/demo/README.md) | 演示入口占位；首个可运行版本形成后补充 |
| [3 分钟导览](docs/quick-tour.md) | 项目目标、黄金流程、控制边界与当前状态 |
| [产品材料](docs/product/README.md) | 项目章程、研究、PRD 与流程材料的导航 |
| [本地运行](docs/development/local-development.md) | 当前仓库检查方式和未来运行说明占位 |

## 仓库导航

| 目录 | 职责 |
| --- | --- |
| [`docs/`](docs/README.md) | 产品、研究、架构决策、评测和治理材料 |
| [`frontend/`](frontend/README.md) | 员工端、管理端及运行/评测页面 |
| [`backend/`](backend/README.md) | 业务 API、权限、任务与审批 |
| [`agent_core/`](agent_core/README.md) | Agent 职责、编排、Skills、状态与模型路由 |
| [`rag/`](rag/README.md) | 知识处理、检索、引用、版本和权限过滤 |
| [`evals/`](evals/README.md) | 模型、RAG、Agent 与业务层评测 |
| [`infra/`](infra/README.md) | CI、容器、部署和运行配置 |
| [`tests/`](tests/README.md) | 测试策略、测试资产与复现证据 |
| [`prototype/dify/`](prototype/dify/README.md) | 可选的前期验证证据，不作为最终运行依赖 |

## 项目控制面

- [当前状态看板](docs/status.md)
- [任务台账](docs/governance/task-ledger.md)
- [架构与产品决策记录](docs/decisions/README.md)
- [风险登记册](docs/governance/risks.md)
- [证据登记册](docs/governance/evidence.md)
- [开发与 Git 约定](CONTRIBUTING.md)
- [环境变量清单](docs/development/environment.md)

## 当前明确边界

- 每次只推进一个经确认的最小任务。
- 概念上的 Agent 角色不机械映射为固定服务、进程或类。
- 技术栈、数据库、向量库、模型、编排框架和部署平台仍待后续决策。
- 所有模拟制度、员工数据和评测数据必须显著标注，不冒充真实企业事实。
- 高风险写操作必须经过审批；知识结论需要证据与引用。
- 真实密钥只允许保存在本地 `.env`，不得提交仓库。

## 仓库基线

首个规划阶段基线使用 tag `v0.1.0-planning`。后续开发应从明确任务创建分支，并通过可验证证据完成验收。
