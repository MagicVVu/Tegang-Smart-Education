import {
  AlertOutlined,
  ArrowRightOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
  RobotOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Table,
  Tag,
  Typography
} from "antd";
import { useNavigate } from "react-router-dom";
import { statusLabels } from "@tegang/shared-utils";
import { PageHeader } from "../components/PageHeader";
import { DataList as List } from "../components/DataList";
import { trainingTask } from "../services/workspace-data";
import { StatusTag } from "../components/StatusTag";
import { usePrototypeStore } from "../stores/prototype-store";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const taskStatus = usePrototypeStore((state) => state.task_status);
  const scenario = usePrototypeStore((state) => state.scenario);

  const priorityActions = [
    {
      title:
    taskStatus === "TB-FAILED"
          ? "处理 Agent 执行失败"
          : "确认新员工培训方案",
      detail:
        taskStatus === "TB-FAILED"
          ? "知识检索 Skill 已完成 1 次有限重试，尚未进行正式写入。"
          : "候选方案已通过必修校验，高风险范围需要确认后进入审批。",
      owner: "培训管理员",
      deadline: taskStatus === "TB-FAILED" ? "需立即处理" : "今天 16:00 前",
      status: taskStatus === "TB-FAILED" ? "执行失败" : "待确认",
      risk: taskStatus === "TB-FAILED" ? "error" : "warning",
      icon:
        taskStatus === "TB-FAILED" ? (
          <ExclamationCircleOutlined />
        ) : (
          <RobotOutlined />
        ),
      action: () =>
        navigate(
        taskStatus === "TB-FAILED"
            ? `/agent-runs/${trainingTask.id}`
            : `/admin/plans/${trainingTask.id}`,
        )
    },
    {
      title: "跟踪高风险审批",
      detail: "炼钢生产部高温作业知识等待授权审核员处理。",
      owner: "审核员／管理者",
      deadline: "已等待 36 分钟",
      status: "待审批",
      risk: "error",
      icon: <AuditOutlined />,
      action: () => navigate("/approvals")
    },
    {
      title: "核对培训报告草稿",
      detail: "报告包含补训、复测和 Agent 干预摘要，尚未确认发布。",
      owner: "培训管理员",
      deadline: "本周五前",
      status: "待确认",
      risk: "processing",
      icon: <SafetyCertificateOutlined />,
      action: () => navigate(`/admin/reports/${trainingTask.id}`)
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="工作台"
        title="今天需要处理什么"
        description="聚合待确认、风险、异常和结果，不用在多个系统间查找状态。"
        extra={
          <Button
            type="primary"
            icon={<FileAddOutlined />}
            onClick={() => navigate("/admin/training/create")}
          >
            新建培训任务
          </Button>
        }
      />
      {scenario === "knowledge_conflict" ? (
        <Alert
          showIcon
          type="error"
          title="知识版本冲突已暂停方案生成"
          description="《炼钢生产部安全操作规范》存在待确认版本。系统未使用冲突内容，请由知识责任人确认后从稳定检查点恢复。"
          action={
            <Button onClick={() => navigate(`/agent-runs/${trainingTask.id}`)}>
              查看处理证据
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      ) : null}
      <Row gutter={[20, 20]}>
        <Col span={15}>
          <Card
            title="优先待办"
            extra={<Tag color="orange">3 项需要处理</Tag>}
          >
            <List
              itemLayout="horizontal"
              dataSource={priorityActions}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button
                      key="open"
                      type="link"
                      icon={<ArrowRightOutlined />}
                      onClick={item.action}
                    >
                      处理
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<div className="task-icon">{item.icon}</div>}
                    title={item.title}
                    description={
                      <Flex vertical gap={8}>
                        <span>{item.detail}</span>
                        <Flex gap={8} wrap>
                          <Tag color={item.risk}>{item.status}</Tag>
                          <Tag>{item.owner}</Tag>
                          <Typography.Text type="secondary">
                            {item.deadline}
                          </Typography.Text>
                        </Flex>
                      </Flex>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={9}>
          <Card className="risk-focus">
            <Flex vertical gap={14}>
              <Flex justify="space-between">
                <Typography.Text className="eyebrow">
                  当前旗舰任务
                </Typography.Text>
                <StatusTag status={taskStatus} />
              </Flex>
              <Typography.Title level={4}>
                {trainingTask.name}
              </Typography.Title>
              <Typography.Paragraph type="secondary">
                智信部与炼钢生产部新员工 · 截止 2026-08-15
              </Typography.Paragraph>
              <Progress
                percent={
                taskStatus === "TB-COMPLETED"
                    ? 100
                  : taskStatus === "TB-IN-PROGRESS"
                      ? 58
                      : 42
                }
                strokeColor="#164E7A"
              />
              <Flex gap={8} wrap>
                <Tag color="red">高风险知识 1 项</Tag>
                <Tag color="blue">知识引用 3 条</Tag>
                <Tag>候选方案 2 个</Tag>
              </Flex>
              <Button
                type="primary"
                block
                onClick={() =>
                  navigate(`/admin/plans/${trainingTask.id}`)
                }
              >
                查看任务详情
              </Button>
            </Flex>
          </Card>
        </Col>
      </Row>
      <Card
        title="负责范围内的培训任务"
        style={{ marginTop: 20 }}
        extra={
          <Button type="link" icon={<ClockCircleOutlined />}>
            查看历史
          </Button>
        }
      >
        <Table
          rowKey="id"
          pagination={false}
          dataSource={[
            {
              ...trainingTask,
              status: taskStatus,
              owner: "培训管理员 A-001",
              exception:
          taskStatus === "TB-FAILED"
                  ? "Skill 调用失败"
                  : "无"
            }
          ]}
          onRow={(record) => ({
            onClick: () => navigate(`/admin/plans/${record.id}`),
            style: { cursor: "pointer" }
          })}
          columns={[
            {
              title: "任务",
              dataIndex: "name",
              render: (value, record) => (
                <div>
                  <strong>{value}</strong>
                  <div className="table-subline">{record.id}</div>
                </div>
              )
            },
            {
              title: "部门",
              dataIndex: "departments",
              render: (value: string[]) => value?.join("、") ?? "-"
            },
            {
              title: "状态",
              dataIndex: "status",
              render: (value) => <StatusTag status={value} />
            },
            {
              title: "异常",
              dataIndex: "exception",
              render: (value) =>
                value === "无" ? (
                  <Typography.Text type="secondary">{value}</Typography.Text>
                ) : (
                  <Tag icon={<AlertOutlined />} color="red">
                    {value}
                  </Tag>
                )
            },
            {
              title: "下一步",
              dataIndex: "status",
              render: (value: keyof typeof statusLabels) => {
                const actions: Partial<Record<keyof typeof statusLabels, string>> = {
                  "TB-NEED-INPUT": "补充任务信息",
                  "TB-WAIT-CONFIRM": "确认培训方案",
                  "TB-WAIT-APPROVAL": "跟踪审批进度",
                  "TB-WAIT-PUBLISH": "确认下发",
                  "TB-IN-PROGRESS": "跟踪学习进度",
                  "TB-FAILED": "处理异常",
                  "TB-MANUAL": "继续人工处理",
                  "TB-COMPLETED": "核对培训报告"
                };
                return actions[value] ?? `查看${statusLabels[value]}`;
              }
            }
          ]}
        />
      </Card>
    </>
  );
}
