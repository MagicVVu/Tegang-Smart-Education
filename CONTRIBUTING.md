# 开发与 Git 约定

## 基本流程

1. 从远端同步默认分支：`git switch main`、`git pull --ff-only`。
2. 为一个明确任务创建一个分支。
3. 只提交该任务范围内的文件，并运行相关检查。
4. 在提交或 PR 中附上验收证据、限制和未决问题。
5. 通过评审后再合并；不要绕过权限、风险或审批规则。

## 分支命名

- `feat/<short-description>`：新能力。
- `fix/<short-description>`：缺陷修复。
- `docs/<short-description>`：文档与研究材料。
- `chore/<short-description>`：工程和仓库维护。
- `experiment/<short-description>`：可丢弃的验证实验。

使用小写英文、数字和连字符；一个分支只对应一个明确任务。

## 提交信息

采用简洁的 Conventional Commits 风格：

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`
- `chore: ...`

提交正文说明“为什么”和验证方式，不在提交信息中写入密钥或敏感数据。

## Pull Request 最低要求

- 说明目标、范围和明确非目标。
- 链接任务、决策、风险和证据记录。
- 列出执行过的检查及结果。
- 对界面或流程变更提供截图、日志或可复现步骤。
- 不提交 `.env`、真实 Key、真实员工数据和未授权企业资料。

## Tag 约定

- 使用语义化版本：`vMAJOR.MINOR.PATCH`。
- 规划或预发布基线可带后缀，例如 `v0.1.0-planning`。
- tag 必须指向已验证、可说明的提交。
