# C-02/C-04 Quickstart

以下命令均从任意新克隆目录执行，不依赖固定盘符。

1. 安装 Git、Node.js 24.18 LTS、启用 Corepack、Python 3.12、Docker Desktop（Linux containers）。Android 开发另需 JDK 17、Android Studio 与 Android SDK Platform 36。

2. 获取并进入仓库：

   ```powershell
   git clone https://github.com/MagicVVu/Tegang-Smart-Education.git
   Set-Location .\Tegang-Smart-Education
   ```

3. 创建本地环境文件：

   ```powershell
   Copy-Item -LiteralPath .env.example -Destination .env
   notepad .env
   ```

4. 在 `.env` 本地填写新的 `POSTGRES_PASSWORD` 以及 `MODEL_PROVIDER`、`MODEL_BASE_URL`、`MODEL_NAME`、`MODEL_API_KEY`。不要把 Key 发到聊天、飞书或写入公开变量。

5. 固定 pnpm 并安装锁定依赖：

   ```powershell
   corepack enable
   corepack prepare pnpm@11.9.0 --activate
   pnpm bootstrap
   ```

6. 运行环境诊断：

   ```powershell
   pnpm doctor
   ```

7. 启动完整 Compose：

   ```powershell
   pnpm compose:up
   ```

   Compose 会先执行一次性 `migrate` 服务；只有迁移成功后 backend 才启动。宿主机直接开发时先运行 `pnpm db:upgrade`。

8. 检查健康状态并读取日志：

   ```powershell
   pnpm health
   docker compose ps
   docker compose logs backend
   ```

9. 打开 Web：

   ```powershell
   Start-Process http://127.0.0.1:5173
   ```

10. 如需 Android，在 Windows 宿主机启动 Metro；模拟器的 API 地址使用 `http://10.0.2.2:8000`：

    ```powershell
    pnpm dev:mobile
    pnpm android
    ```

11. 停止服务并保留 PostgreSQL/Redis 数据：

    ```powershell
    pnpm compose:down
    ```

真实模型连通性是显式、可能产生费用的检查，仅在本地配置完成且获得调用许可后运行：

```powershell
pnpm model:check
```
