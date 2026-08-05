import {
  CheckCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PauseCircleOutlined,
  UserSwitchOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Flex,
  Progress,
  Steps,
  Typography
} from "antd";
import type { ContractTrainingTaskStatus } from "@tegang/types";

const stages = [
  "理解目标与约束",
  "读取组织与员工上下文",
  "Supervisor任务拆解",
  "检索授权知识",
  "生成候选方案",
  "硬约束校验与风险分级"
];

interface AgentExecutionPanelProps {
  status: ContractTrainingTaskStatus;
  onComplete: () => void;
  onPause: () => void;
  onTakeover: () => void;
}

export function AgentExecutionPanel({
  status,
  onComplete,
  onPause,
  onTakeover
}: AgentExecutionPanelProps) {
  const isFailed = status === "TB-FAILED";
  const isPaused = status === "TB-PAUSED";
  const isTakeover = status === "TB-MANUAL";
  const current = isFailed || isPaused || isTakeover ? 3 : 2;

  return (
    <Card className="agent-execution">
      <Flex justify="space-between" align="flex-start" gap={24}>
        <div>
          <Typography.Text className="eyebrow">
            执行进度
          </Typography.Text>
          <Typography.Title level={3}>
            {isFailed
              ? "知识检索 Skill 调用失败"
              : isPaused
                ? "流程已暂停"
                : isTakeover
                  ? "人工接管中"
                  : "正在形成可审核培训方案"}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            当前阶段、后续步骤和人工处理入口均被记录；可以安全离开页面。
          </Typography.Paragraph>
        </div>
        <Progress
          type="circle"
          percent={isFailed ? 54 : isPaused ? 48 : 42}
          size={86}
          strokeColor={isFailed ? "#C43D4B" : "#6252C7"}
        />
      </Flex>
      {isFailed ? (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message="SKILL_TIMEOUT：授权知识检索超过等待时间"
          description="已完成 1 次有限重试，未执行正式业务写入。可以重试、回退到最近稳定检查点或请求人工接管。"
          style={{ marginBottom: 20 }}
        />
      ) : null}
      <Steps
        direction="vertical"
        current={current}
        items={stages.map((title, index) => ({
          title,
          description:
            index < current
              ? "已完成并保存检查点"
              : index === current
                ? "正在执行，结果将进入规则校验"
                : "等待上游依赖",
          icon:
            index < current ? (
              <CheckCircleFilled />
            ) : index === current ? (
              <ClockCircleOutlined />
            ) : undefined
        }))}
      />
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Typography.Text type="secondary">
          预计后续：候选比较 → 规则校验 → 风险分级 → 管理员确认
        </Typography.Text>
        <Flex gap={8}>
          <Button icon={<PauseCircleOutlined />} onClick={onPause}>
            暂停
          </Button>
          <Button icon={<UserSwitchOutlined />} onClick={onTakeover}>
            请求人工接管
          </Button>
          <Button type="primary" onClick={onComplete}>
            查看已生成方案
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
