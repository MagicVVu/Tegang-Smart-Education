# infra

容器、CI、部署、配置和可观测性基础设施的代码域。

当前在 C-02 Windows/Linux 容器基线上增量完成 C-04：根目录 `compose.yaml` 编排 Web、FastAPI、一次性 Alembic migrate、PostgreSQL/pgvector 和 Redis；`infra/postgres/init/001-enable-vector.sql` 仍只启用 `vector` 扩展，业务表由 `backend/migrations` 管理。

Compose 使用命名卷并在正常停止时保留数据。`pnpm compose:down` 和 `pnpm compose:clean` 不删除卷；只有显式运行下列命令才会删除 C-02 的 PostgreSQL 与 Redis 数据：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/compose.ps1 -Action reset -ConfirmDataLoss
```

当前未实现生产部署、CI 发布、正式 Secret 后端、OpenTelemetry Collector、Prometheus、Grafana、消息队列或多实例负载均衡。
