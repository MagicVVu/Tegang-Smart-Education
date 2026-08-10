# backend

业务 API、身份与权限、培训任务、审批、报告和系统状态的后端代码域。

当前包含 C-02 所需的最小 FastAPI 进程和健康检查：

- `GET /health/live`：仅确认进程存活；
- `GET /health/ready`：检查 PostgreSQL/pgvector、Redis 和模型配置是否就绪；
- `GET /health/dependencies`：返回不含凭证的依赖摘要；
- `backend/scripts/check_model.py`：显式、可能产生 API 费用的模型连通性检查。

该入口只证明 Windows/Python 和 Docker Compose 运行基线，不是 C-04 正式业务服务骨架。当前没有业务路由、ORM、数据库业务表、Alembic 迁移、Worker、Agent 编排或 RAG 实现。

从仓库根目录启动：

```powershell
pnpm dev:backend
```

依赖必须从根目录 `requirements.lock` 安装，不得在未更新 `requirements.in` 和锁文件的情况下临时增加包。
