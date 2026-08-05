import { ReloadOutlined } from "@ant-design/icons";
import { Button, Flex, Select, Tooltip, Typography } from "antd";
import { usePrototypeStore, type DemoScenario } from "../stores/prototype-store";

const options: Array<{ value: DemoScenario; label: string }> = [
  { value: "normal", label: "低风险正常流程" },
  { value: "high_risk", label: "高风险审批流程" },
  { value: "information_missing", label: "信息不足流程" },
  { value: "assessment_failed", label: "测评未达标流程" },
  { value: "knowledge_conflict", label: "知识冲突流程" },
  { value: "agent_failure", label: "Agent失败与接管" }
];

export function ScenarioSwitcher() {
  const scenario = usePrototypeStore((state) => state.scenario);
  const setScenario = usePrototypeStore((state) => state.setScenario);
  const resetDemo = usePrototypeStore((state) => state.resetDemo);

  return (
    <Flex align="center" gap={8} className="scenario-switcher">
      <Typography.Text type="secondary">演示场景</Typography.Text>
      <Select
        aria-label="演示场景"
        value={scenario}
        options={options}
        onChange={setScenario}
        popupMatchSelectWidth={220}
        style={{ width: 190 }}
      />
      <Tooltip title="重置本地演示状态">
        <Button
          aria-label="重置演示数据"
          icon={<ReloadOutlined />}
          onClick={resetDemo}
        />
      </Tooltip>
    </Flex>
  );
}
