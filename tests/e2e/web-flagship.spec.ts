import { expect, test } from "@playwright/test";

const screenshot = (name: string) => `docs/screenshots/${name}.png`;

test("管理员创建、高风险审批、下发与 Agent 证据链 @screenshots", async ({
  page
}) => {
  await page.goto("/login");
  await page.locator(".role-card").filter({ hasText: "培训管理员" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole("heading", { name: "今天需要处理什么" }))
    .toBeVisible();
  await page.screenshot({
    path: screenshot("web-admin-dashboard")
  });

  await page.getByText("新建培训任务", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "创建培训目标与约束" }))
    .toBeVisible();
  for (let step = 0; step < 4; step += 1) {
    await page.getByRole("button", { name: "下一步" }).click();
  }
  await page.getByRole("button", { name: "提交并启动 Agent" }).click();
  await expect(page.getByText("正在形成可审核培训方案")).toBeVisible();
  await page.getByRole("button", { name: "完成演示并查看方案" }).click();
  await expect(page.getByRole("heading", { name: "培训方案与执行条件" }))
    .toBeVisible();
  await page.screenshot({
    path: screenshot("web-training-plan")
  });

  await page.getByRole("button", { name: "确认并进行风险校验" }).click();
  await expect(page.getByText("高风险动作已暂停，等待审核员决定"))
    .toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await page.locator(".role-card").filter({ hasText: "审核员" }).click();
  await expect(page).toHaveURL(/\/approvals$/);
  await page.getByText("新员工高风险安全规范与岗位基础培训").first().click();
  await expect(page.getByRole("heading", { name: "高风险培训审批详情" }))
    .toBeVisible();
  await page.screenshot({
    path: screenshot("web-approval-detail")
  });
  await page.getByRole("button", { name: /批准/ }).last().click();
  await page
    .getByPlaceholder("说明依据、风险判断和需要执行的后续动作。")
    .fill("知识版本、影响范围与独立达标规则均已核对，批准当前方案。");
  await page.getByRole("button", { name: "提交决定" }).click();
  await expect(page.getByText("审批已批准，任务恢复至待下发。"))
    .toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await page.locator(".role-card").filter({ hasText: "培训管理员" }).click();
  await page.getByText("方案与任务详情", { exact: true }).click();
  await page.getByRole("button", { name: "下发培训任务" }).click();
  await page.getByRole("button", { name: "确认下发" }).click();
  await expect(page.getByText("培训任务已幂等创建并完成通知。"))
    .toBeVisible();

  await page.getByText("Agent运行中心", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Agent 业务执行证据" }))
    .toBeVisible();
  await page.screenshot({
    path: screenshot("web-agent-run-business")
  });
});

test("系统管理员开发者 Trace 与路由权限 @screenshots", async ({ page }) => {
  await page.goto("/login");
  await page.locator(".role-card").filter({ hasText: "系统管理员" }).click();
  await page.getByText("开发者Trace", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Agent 运行诊断" }))
    .toBeVisible();
  await expect(page.getByText("Prompt版本")).toBeVisible();
  await page.screenshot({
    path: screenshot("web-agent-run-developer")
  });

  await page.evaluate(() => {
    window.history.pushState({}, "", "/admin/dashboard");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByText("无权限访问", { exact: true }))
    .toBeVisible();
});
