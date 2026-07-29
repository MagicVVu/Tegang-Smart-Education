import {
  ApartmentOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  UserSwitchOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Divider,
  Flex,
  List,
  Row,
  Segmented,
  Space,
  Statistic,
  Steps,
  Tag,
  Timeline,
  Typography,
  message
} from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { agentRun, knowledgeCitations, trainingTask } from "@tegang/mock-data";
import { formatDuration } from "@tegang/shared-utils";
import { PageHeader } from "../components/PageHeader";
import { StatusTag } from "../components/StatusTag";
import { services } from "../services";
import { usePrototypeStore } from "../stores/prototype-store";

export function AgentRunPage() {
  const navigate = useNavigate();
  const role = usePrototypeStore((state) => state.role);
  const taskStatus = usePrototypeStore((state) => state.taskStatus);
  const run = usePrototypeStore((state) => state.agent);
  const retryCount = usePrototypeStore((state) => state.retryCount);
  const triggerAgentFailure = usePrototypeStore(
    (state) => state.triggerAgentFailure,
  );
  const pause = usePrototypeStore((state) => state.pause);
  const resume = usePrototypeStore((state) => state.resume);
  const [actionLoading, setActionLoading] = useState(false);
  const permittedView =
    role === "system_admin" ? "开发者视图" : "业务视图";
  const [view, setView] = useState(permittedView);

  const nodes = useMemo(
    () =>
      taskStatus === "execution_failed"
        ? run.nodes.map((node, index) =>
            index === run.nodes.length - 1
              ? {
                  ...node,
                  status: "failed" as const,
                  errorCode: "SKILL_TIMEOUT",
                  retryCount
                }
              : node,
          )
        : run.nodes,
    [run.nodes, retryCount, taskStatus],
  );

  const handleRecovery = async (
    action: "retry" | "rollback" | "takeover",
  ) => {
    setActionLoading(true);
    try {
      if (action === "retry") {
        await services.agentTrace.retry(run.id);
        message.success("已从 CP-05 发起有限重试。");
      } else if (action === "rollback") {
        await services.agentTrace.rollback(run.id);
        message.success("已回退到稳定检查点 CP-04。");
      } else {
        await services.agentTrace.requestHumanTakeover(run.id);
        message.success("已记录人工接管人、时间和恢复位置。");
      }
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="P-08 Agent运行中心"
        title={
          permittedView === "开发者视图"
            ? "Agent 运行诊断"
            : "Agent 业务执行证据"
        }
        description={
          permittedView === "开发者视图"
            ? "定位节点、版本、Skill、错误和检查点；不在此修改业务审批或学习结果。"
            : "回答 Agent 做了什么、为什么这样做、现在由谁处理，以及下一步去哪里。"
        }
        extra={
          <Flex gap={8}>
            <StatusTag status={taskStatus} />
            <Segmented
              value={view}
              options={
                role === "system_admin"
                  ? ["开发者视图"]
                  : ["业务视图"]
              }
              onChange={(value) => setView(String(value))}
            />
          </Flex>
        }
      />
      <Card>
        <Row gutter={[16, 16]}>
          <Col span={permittedView === "开发者视图" ? 5 : 7}>
            <Statistic
              title="当前阶段"
              value={
                taskStatus === "execution_failed"
                  ? "Skill 调用失败"
                  : run.currentStage
              }
              valueStyle={{ fontSize: 18 }}
            />
          </Col>
          <Col span={5}>
            <Statistic title="风险等级" value="高风险" />
          </Col>
          <Col span={5}>
            <Statistic
              title="等待角色"
              value={run.waitingFor ?? "系统执行"}
            />
          </Col>
          <Col span={7}>
            <Statistic
              title={
                permittedView === "开发者视图" ? "Trace ID" : "下一步"
              }
              value={
                permittedView === "开发者视图"
                  ? run.traceId
                  : "管理员确认或异常处理"
              }
              valueStyle={{ fontSize: 16 }}
              suffix={
                permittedView === "开发者视图" ? (
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      void navigator.clipboard?.writeText(run.traceId);
                      message.success("Trace ID 已复制。");
                    }}
                  />
                ) : null
              }
            />
          </Col>
        </Row>
      </Card>
      {taskStatus === "execution_failed" ? (
        <Alert
          type="error"
          showIcon
          message="受控 Skill 调用失败，未发生正式业务写入"
          description={`错误 SKILL_TIMEOUT；已尝试 ${retryCount} 次。禁止无限重试，可回退或转人工。`}
          action={
            <Flex gap={8}>
              <Button
                icon={<ReloadOutlined />}
                loading={actionLoading}
                disabled={retryCount >= 2}
                onClick={() => handleRecovery("retry")}
              >
                有限重试
              </Button>
              <Button
                icon={<RollbackOutlined />}
                onClick={() => handleRecovery("rollback")}
              >
                回退检查点
              </Button>
              <Button
                type="primary"
                danger
                icon={<UserSwitchOutlined />}
                onClick={() => handleRecovery("takeover")}
              >
                人工接管
              </Button>
            </Flex>
          }
          style={{ marginTop: 20 }}
        />
      ) : null}
      {taskStatus === "paused" ? (
        <Alert
          type="warning"
          showIcon
          message="任务已暂停"
          description="等待外部依赖或人工决定；恢复时将校验审批版本、参数哈希和外部状态。"
          action={
            <Button type="primary" onClick={resume}>
              校验并恢复
            </Button>
          }
          style={{ marginTop: 20 }}
        />
      ) : null}
      {permittedView === "业务视图" ? (
        <BusinessTrace
          nodes={nodes}
          onPause={pause}
          onTriggerFailure={triggerAgentFailure}
          onNavigate={(path) => navigate(path)}
        />
      ) : (
        <DeveloperTrace
          nodes={nodes}
          onTriggerFailure={triggerAgentFailure}
        />
      )}
    </>
  );
}

function BusinessTrace({
  nodes,
  onPause,
  onTriggerFailure,
  onNavigate
}: {
  nodes: typeof agentRun.nodes;
  onPause: () => void;
  onTriggerFailure: () => void;
  onNavigate: (path: string) => void;
}) {
  const run = usePrototypeStore((state) => state.agent);
  return (
    <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
      <Col span={7}>
        <Card title="培训阶段">
          <Steps
            direction="vertical"
            current={4}
            items={[
              "目标与上下文",
              "诊断与知识检索",
              "方案与规则校验",
              "风险与审批",
              "任务下发",
              "学习与测评",
              "补训或重规划",
              "报告与审计"
            ].map((title, index) => ({
              title,
              description:
                index < 3
                  ? "已完成并留痕"
                  : index === 3
                    ? "当前或最近处理阶段"
                    : "等待上游状态"
            }))}
          />
        </Card>
      </Col>
      <Col span={10}>
        <Card
          title="Supervisor 拆解与执行证据"
          extra={<Tag color="purple">Agent 建议与规则已区分</Tag>}
        >
          <Timeline
            items={nodes.map((node) => ({
              color:
                node.status === "failed"
                  ? "red"
                  : node.status === "succeeded"
                    ? "green"
                    : "blue",
              children: (
                <div className="trace-event">
                  <Flex justify="space-between" gap={12}>
                    <strong>{node.label}</strong>
                    <Tag
                      color={
                        node.status === "failed"
                          ? "red"
                          : node.status === "succeeded"
                            ? "green"
                            : "blue"
                      }
                    >
                      {node.status}
                    </Tag>
                  </Flex>
                  <Typography.Paragraph type="secondary">
                    {node.outputSummary}
                  </Typography.Paragraph>
                  {node.decisionReason ? (
                    <Typography.Text>
                      决策摘要：{node.decisionReason}
                    </Typography.Text>
                  ) : null}
                </div>
              )
            }))}
          />
        </Card>
        <Card title="关键决定" style={{ marginTop: 20 }}>
          <List
            dataSource={run.decisions}
            renderItem={(decision) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    decision.source === "deterministic_rule" ? (
                      <SafetyCertificateOutlined />
                    ) : (
                      <ApartmentOutlined />
                    )
                  }
                  title={
                    <Space>
                      {decision.title}
                      <Tag
                        color={
                          decision.source === "deterministic_rule"
                            ? "blue"
                            : "purple"
                        }
                      >
                        {decision.source === "deterministic_rule"
                          ? "确定性规则"
                          : "Agent建议"}
                      </Tag>
                    </Space>
                  }
                  description={decision.summary}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col span={7}>
        <Card title="依据、风险与处理">
          <List
            size="small"
            dataSource={knowledgeCitations}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<FileSearchOutlined />}
                  title={`${item.documentName} ${item.version}`}
                  description={item.department}
                />
                <Tag color="green">有效</Tag>
              </List.Item>
            )}
          />
          <Divider />
          <Alert
            type="warning"
            showIcon
            message="高风险下发前必须审批"
            description="规则已暂停正式业务写入，并保存恢复检查点。"
          />
        </Card>
        <Card title="业务操作" style={{ marginTop: 20 }}>
          <Flex vertical gap={8}>
            <Button
              type="primary"
              onClick={() =>
                onNavigate(`/admin/plans/${trainingTask.id}`)
              }
            >
              返回方案页
            </Button>
            <Button
              icon={<PauseCircleOutlined />}
              onClick={onPause}
            >
              暂停任务
            </Button>
            <Button
              danger
              icon={<BugOutlined />}
              onClick={onTriggerFailure}
            >
              演示 Skill 失败
            </Button>
          </Flex>
        </Card>
      </Col>
    </Row>
  );
}

function DeveloperTrace({
  nodes,
  onTriggerFailure
}: {
  nodes: typeof agentRun.nodes;
  onTriggerFailure: () => void;
}) {
  return (
    <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
      <Col span={8}>
        <Card
          title="Agent 节点树"
          extra={<Tag color="blue">{nodes.length} 个节点</Tag>}
        >
          <List
            dataSource={nodes}
            renderItem={(node) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    node.status === "failed" ? (
                      <ExclamationCircleOutlined className="icon-error" />
                    ) : node.status === "succeeded" ? (
                      <CheckCircleOutlined className="icon-success" />
                    ) : (
                      <ClockCircleOutlined />
                    )
                  }
                  title={node.label}
                  description={`${node.capability} · ${node.checkpointId ?? "无检查点"}`}
                />
                <Tag>{node.status}</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col span={16}>
        <Card
          title="节点输入、调用与恢复详情"
          extra={
            <Button
              danger
              icon={<BugOutlined />}
              onClick={onTriggerFailure}
            >
              注入 Skill 超时
            </Button>
          }
        >
          <Collapse
            defaultActiveKey={nodes[0]?.id}
            items={nodes.map((node) => ({
              key: node.id,
              label: (
                <Flex justify="space-between" style={{ width: "100%" }}>
                  <span>{node.label}</span>
                  <Space>
                    {node.latencyMs ? (
                      <Tag>{formatDuration(node.latencyMs)}</Tag>
                    ) : null}
                    <Tag color={node.status === "failed" ? "red" : "green"}>
                      {node.status}
                    </Tag>
                  </Space>
                </Flex>
              ),
              children: (
                <Descriptions
                  bordered
                  column={2}
                  size="small"
                  items={[
                    {
                      key: "input",
                      label: "输入摘要",
                      span: 2,
                      children: node.inputSummary
                    },
                    {
                      key: "output",
                      label: "输出摘要",
                      span: 2,
                      children: node.outputSummary
                    },
                    {
                      key: "model",
                      label: "模型",
                      children: node.model ?? "未调用模型"
                    },
                    {
                      key: "prompt",
                      label: "Prompt版本",
                      children: node.promptVersion ?? "不适用"
                    },
                    {
                      key: "tokens",
                      label: "Token",
                      children: node.tokens ?? "不适用"
                    },
                    {
                      key: "latency",
                      label: "延迟",
                      children: node.latencyMs
                        ? formatDuration(node.latencyMs)
                        : "未记录"
                    },
                    {
                      key: "skill",
                      label: "Skill",
                      children: node.skillName ?? "未调用"
                    },
                    {
                      key: "error",
                      label: "错误",
                      children: node.errorCode ?? "无"
                    },
                    {
                      key: "retry",
                      label: "重试次数",
                      children: node.retryCount
                    },
                    {
                      key: "checkpoint",
                      label: "检查点",
                      children: node.checkpointId ?? "无"
                    }
                  ]}
                />
              )
            }))}
          />
          <Divider />
          <Alert
            type="info"
            showIcon
            icon={<ToolOutlined />}
            message="参数与员工字段按最小必要原则脱敏"
            description="开发者视图用于诊断，不提供业务审批、学习结果修改或正式报告编辑入口。"
          />
        </Card>
      </Col>
    </Row>
  );
}
