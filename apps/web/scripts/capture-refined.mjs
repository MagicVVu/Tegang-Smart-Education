/* global console:readonly, window:readonly, PopStateEvent:readonly */

import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputDirectory = path.resolve(
  scriptDirectory,
  "../../../docs/screenshots/web-refined",
);
const webRoot = path.resolve(scriptDirectory, "..");
const baseURL = "http://127.0.0.1:4317";

await mkdir(outputDirectory, { recursive: true });

const devServer = await createServer({
  root: webRoot,
  logLevel: "warn",
  server: {
    host: "127.0.0.1",
    port: 4317,
    strictPort: true
  }
});
await devServer.listen();

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "light",
  locale: "zh-CN"
});
const page = await context.newPage();
const runtimeErrors = [];
const compatibilityWarnings = new Set();

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) {
    runtimeErrors.push(`HTTP ${response.status()} ${response.url()}`);
  }
});
page.on("console", (message) => {
  if (message.type() !== "error") return;
  const content = message.text();
  if (content.startsWith("Failed to load resource:")) return;
  if (content.startsWith("Warning: [antd:")) {
    compatibilityWarnings.add(content);
    return;
  }
  runtimeErrors.push(content);
});

async function capture(name) {
  await page.screenshot({
    path: path.join(outputDirectory, `${name}.png`),
    fullPage: true
  });
}

async function spaNavigate(route) {
  await page.evaluate((target) => {
    window.history.pushState({}, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, route);
}

async function developmentLogin(roleLabel) {
  if (!page.url().startsWith(`${baseURL}/login`)) {
    await spaNavigate("/login");
  }
  await page
    .locator(".role-card")
    .filter({ hasText: roleLabel })
    .click();
  await page.waitForFunction(() => window.location.pathname !== "/login");
  console.log(`Signed in as ${roleLabel}: ${page.url()}`);
}

async function logout() {
  await page.getByRole("button", { name: "退出登录" }).click();
  await page.waitForURL(`${baseURL}/login`);
}

try {
  await page.goto(`${baseURL}/login`);
  await page.getByRole("heading", { name: "登录培训管理平台" }).waitFor();
  await capture("01-login");

  await developmentLogin("培训管理员");
  await page.getByRole("heading", { name: "今天需要处理什么" }).waitFor();
  await capture("02-admin-dashboard");

  await page.getByRole("button", { name: "新建培训任务" }).click();
  await page.getByRole("heading", { name: "创建培训目标与约束" }).waitFor();
  await capture("03-training-create");

  await spaNavigate("/admin/plans/T-20260728-01");
  await page
    .getByRole("heading", { name: "培训方案与执行条件" })
    .waitFor();
  await page.getByRole("button", { name: "确认并进行风险校验" }).click();
  await page.getByText("高风险动作已暂停，等待审核员决定").waitFor();
  await capture("04-plan-risk-gate");

  await logout();
  await developmentLogin("审核员");
  await page.getByRole("heading", { name: "待审批任务" }).waitFor();
  await page.locator(".approval-queue-item").click();
  await page
    .getByRole("heading", { name: "高风险培训审批详情" })
    .waitFor();
  await capture("05-approval-detail");

  await page.getByRole("button", { name: "查看引用详情" }).click();
  await page.getByRole("button", { name: "返回当前页面" }).waitFor();
  await capture("06-approval-citations");
  await page.getByRole("button", { name: "返回当前页面" }).click();

  await page.getByRole("button", { name: "查看 Agent 业务证据" }).click();
  await page.getByRole("button", { name: "返回当前审批" }).waitFor();
  await capture("07-agent-business-evidence");
  await page.getByRole("button", { name: "返回当前审批" }).click();

  await page.locator(".sticky-action-bar .ant-btn-primary").click();
  await page
    .locator("textarea")
    .fill("知识版本、风险范围和下发边界已核对，同意当前版本进入待下发。");
  await page.getByRole("button", { name: "提交决定" }).click();
  await page.getByText("审批已批准").waitFor();
  await capture("08-approval-completed");

  await spaNavigate("/admin/reports/T-20260728-01");
  await page.getByRole("heading", { name: "培训结果与审计闭环" }).waitFor();
  await capture("09-training-report");

  await logout();
  await developmentLogin("系统管理员");
  await spaNavigate("/agent-runs/T-20260728-01?scenario=agent_failure");
  await page.getByRole("heading", { name: "Agent 运行诊断" }).waitFor();
  await page.getByText("受控 Skill 调用失败").waitFor();
  await capture("10-agent-developer-failure");

  await spaNavigate("/system/knowledge");
  await page
    .getByRole("heading", { name: "知识、权限与受控执行配置" })
    .waitFor();
  await capture("11-system-config");

  await spaNavigate("/admin/dashboard");
  await page.getByText("无权限访问", { exact: true }).waitFor();

  if (runtimeErrors.length) {
    throw new Error(`Browser runtime errors:\n${runtimeErrors.join("\n")}`);
  }

  console.log(
    `Captured 11 refined Web screenshots in ${outputDirectory}; permission and P0 evidence-return checks passed. ${compatibilityWarnings.size} Ant Design compatibility warnings were observed separately.`,
  );
} finally {
  await browser.close();
  await devServer.close();
}
