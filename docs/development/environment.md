# 环境变量清单

| 变量 | 必需 | 当前用途 | 敏感 |
| --- | --- | --- | --- |
| `APP_ENV` | 是 | 运行环境标识 | 否 |
| `APP_HOST` | 是 | 本地监听地址 | 否 |
| `APP_PORT` | 是 | 本地监听端口 | 否 |
| `LOG_LEVEL` | 是 | 日志等级 | 否 |
| `MODEL_PROVIDER` | 待定 | 模型供应商标识 | 否 |
| `MODEL_NAME` | 待定 | 模型名称 | 否 |
| `MODEL_API_KEY` | 待定 | 模型访问凭据 | 是 |
| `MODEL_BASE_URL` | 待定 | 兼容端点 | 可能 |
| `DATABASE_URL` | 待定 | 数据库连接 | 是 |
| `VECTOR_STORE_URL` | 待定 | 检索存储连接 | 是 |

本清单只是安全占位，不代表具体 Provider 或组件已经确定。真实值只保存在本地 `.env` 或后续批准的密钥管理系统中。
