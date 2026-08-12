# 组织、身份与权限验证记录

日期：2026-08-10  
基线 SHA：`49288773f6e778a22f1e38458d475bde26e2466f`  
迁移 head：`20260810_0002`  
契约版本：`2.2.0`

## 已执行证据

- 后端与契约：`python -m pytest backend/tests` 通过 37 项测试和 151 个契约子测试，覆盖 Argon2id、幂等 bootstrap、统一登录错误、JWT 过期、Refresh 轮换/复用、Logout、停用用户、Demo 隔离、Web CSRF/Cookie、四角色动作矩阵、本人/跨员工/跨部门和审计；
- 生成契约：`python backend/scripts/export_contracts.py --check` 确认 121 个产物无漂移；
- 前端与移动端：Web、Android TypeScript 检查通过，ESLint 零警告，Vitest 7 个文件、26 项测试通过；
- 生产构建：Vite 构建通过，处理 4852 个模块；
- 迁移：一次性 PostgreSQL 测试库执行 `upgrade head -> downgrade 20260810_0001 -> upgrade head`，最终版本 `20260810_0002`，通过后删除测试库；
- Compose：backend/web 镜像构建通过，db、Redis、backend、web 均 healthy；运行库只向前迁移，状态接口返回 revision `20260810_0002`、schema `2.2.0`，Web 返回 HTTP 200；OpenAPI 包含 6 个认证端点和 1 个受保护身份端点；
- 仓库卫生：`git diff --check` 通过；高置信密钥模式扫描为 0；未跟踪 `.env`、私钥或证书文件；未提交、未 push、未创建 PR。

Pytest 当前仍报告一条来自 FastAPI `TestClient` 与 Starlette/httpx 兼容层的上游弃用提示，不是本任务代码警告，也不影响上述测试通过结果。

## 未作为真实结论的内容

组织、四部门、岗位、账号与权限测试数据均为模拟数据。测试只能证明当前代码路径和边界行为，不证明真实企业目录、生产安全运营或培训成效。

## 本机待配置

本机 `.env` 当前没有 `AUTH_JWT_SECRET` 和四个 `BOOTSTRAP_*_PASSWORD`，因此没有向运行库写入演示账号，也没有声称完成真实账号登录。操作者填写本地值后按身份设计文档执行 bootstrap；这些值不得提交或复制到飞书/GitHub。
