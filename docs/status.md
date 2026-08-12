# 项目状态看板

更新时间：2026-08-10

总体状态：**代码型高保真原型 + 最小业务服务、组织身份与权限基础已建立**

| 工作流 | 状态 | 当前说明 |
| --- | --- | --- |
| 仓库与协作基线 | Done | Git 历史、GitHub 配置和原有规划目录均保留 |
| 前期研究、PRD 与信息架构 | Done（飞书） | 正式依据位于飞书《智能 Agent》，仓库不复制完整原文 |
| Web 高保真原型 | Done | 页面、权限、Mock 服务和核心流程已实现；TypeScript、Lint、单测、生产构建和 E2E 已通过 |
| Android 高保真原型 | Done | React Native 页面与原生工程已生成；Debug APK 已构建并在 API 35 模拟器跑通员工闭环 |
| 共享业务代码 | Done | 类型、Mock、规则、Token 和工具已形成 workspace 包 |
| C-02 Windows/Docker 基线 | Completed | 四服务、健康检查、持久化、真实模型连通性和中文/空格目录复现均已通过，历史验证记录保留 |
| C-04 FastAPI 与持久化骨架 | Completed | 应用工厂、统一错误/关联日志、SQLAlchemy、Alembic、身份基础表、只读纵向接口、Web HTTP Client 和 CI 配置已实现并完成本地/Compose 验证 |
| 组织、身份与权限基础 | Completed | 本地受控账号、Argon2id、Web/Android 会话、RBAC、部门/员工数据范围、默认拒绝、安全审计和受保护员工资源已实现；企业 SSO/LDAP/HR 同步仍后置 |
| 完整业务后端 | Not started | 培训、审批、测评、报告和企业身份源 API 尚未实现 |
| 正式 RAG / Agent 后端 | Not started | 当前仅验证前端交互、业务状态和服务边界 |

## 当前边界

- 模拟数据不冒充真实企业效果。
- 高风险正式写入在审批前暂停。
- Agent 建议、确定性规则和人工决定在界面中分开呈现。
- 员工不能访问其他员工数据、审批操作或开发者 Trace。
- 当前不宣称掌握度、培训效率或风险指标已经改善。
- 当前身份基础只提供本地受控账号，不等同于企业 SSO、LDAP、HR 主数据同步或完整 IAM。
- 系统管理员默认不拥有培训业务数据权限；权限必须由角色、能力和数据范围显式授予。
- Web 正式系统状态走 HTTP；培训、审批、测评和 Agent 原型仍使用现有 Mock Adapter。
- 正式运行要求后端受控模型 API 配置；Mock/Stub 只用于原型与自动化测试。
