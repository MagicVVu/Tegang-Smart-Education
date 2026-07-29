import {
  AuditOutlined,
  CheckOutlined,
  CloseOutlined,
  FileSearchOutlined,
  FormOutlined,
  InfoCircleOutlined,
  RobotOutlined,
  SafetyCertificateOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Row,
  Space,
  Tag,
  Typography,
  message
} from "antd";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  approvalRecord,
  candidatePlans,
  knowledgeCitations,
  trainingTask
} from "@tegang/mock-data";
import type { ApprovalDecision } from "@tegang/types";
import { KnowledgeDrawer } from "../components/KnowledgeDrawer";
import { PageHeader } from "../components/PageHeader";
import { StatusTag } from "../components/StatusTag";
import { services } from "../services";
import { usePrototypeStore } from "../stores/prototype-store";

export function ApprovalsPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const role = usePrototypeStore((state) => state.role);
  const taskStatus = usePrototypeStore((state) => state.taskStatus);
  const approvalStatus = usePrototypeStore((state) => state.approvalStatus);
  const [citationOpen, setCitationOpen] = useState(false);
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<{ comment: string; changes?: string }>();
  const plan = candidatePlans[1]!;

  const submitDecision = async () => {
    if (!decision) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await services.approval.decide(
        approvalRecord.id,
        decision,
        values.comment,
      );
      message.success(
        decision === "approved"
          ? "审批已批准，任务恢复至待下发。"
          : decision === "approved_with_changes"
            ? "已记录修改后批准，任务进入重新校验。"
            : decision === "rejected"
              ? "已拒绝当前版本并返回方案修订。"
              : "已退回补充信息。",
      );
      setDecision(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="P-06 审批中心"
        title={taskId ? "高风险培训审批详情" : "待审批任务"}
        description="在业务动作执行前核对目标、依据、影响和可恢复位置。培训管理员只能查看进度，不能作出审批决定。"
        extra={
          <Flex gap={8}>
            <Tag color="red">高风险</Tag>
            <StatusTag status={taskStatus} />
          </Flex>
        }
      />
      {role === "training_admin" ? (
        <Alert
          type="info"
          showIcon
          message="当前为审批进度只读视图"
          description="请退出并以审核员身份登录后作出审批决定。管理员不能替代审核员批准高风险动作。"
          style={{ marginBottom: 20 }}
        />
      ) : null}
      <Row gutter={[20, 20]}>
        <Col span={7}>
          <Card
            title="待办队列"
            extra={<Tag color="orange">1 项</Tag>}
          >
            <List
              dataSource={[
                {
                  id: approvalRecord.id,
                  title: trainingTask.name,
                  risk: "高风险",
                  time: "到达 36 分钟"
                }
              ]}
              renderItem={(item) => (
                <List.Item
                  className="approval-queue-item"
                  onClick={() => navigate(`/approvals/${trainingTask.id}`)}
                >
                  <List.Item.Meta
                    avatar={<AuditOutlined />}
                    title={item.title}
                    description={
                      <Space direction="vertical" size={4}>
                        <span>{item.id}</span>
                        <span>{item.time}</span>
                      </Space>
                    }
                  />
                  <Tag color="red">{item.risk}</Tag>
                </List.Item>
              )}
            />
          </Card>
          <Card title="审批状态" style={{ marginTop: 20 }}>
            <Descriptions
              column={1}
              size="small"
              items={[
                {
                  key: "status",
                  label: "当前状态",
                  children:
                    approvalStatus === "pending"
                      ? "待审核员处理"
                      : approvalStatus
                },
                {
                  key: "checkpoint",
                  label: "暂停检查点",
                  children: "CP-05 风险分级完成"
                },
                {
                  key: "write",
                  label: "外部业务写入",
                  children: "未执行"
                }
              ]}
            />
          </Card>
        </Col>
        <Col span={17}>
          <Card>
            <Flex justify="space-between" align="flex-start" gap={20}>
              <div>
                <Typography.Text className="eyebrow">
                  {approvalRecord.id}
                </Typography.Text>
                <Typography.Title level={3}>
                  {trainingTask.name}
                </Typography.Title>
                <Typography.Paragraph type="secondary">
                  申请人：培训管理员 A-001 · 影响 2 个部门 ·
                  正式下发前审批
                </Typography.Paragraph>
              </div>
              <Button
                icon={<RobotOutlined />}
                onClick={() => navigate(`/agent-runs/${trainingTask.id}`)}
              >
                查看 Agent 业务证据
              </Button>
            </Flex>
            <Divider />
            <Descriptions
              bordered
              column={2}
              items={[
                {
                  key: "objective",
                  label: "培训目标",
                  span: 2,
                  children: trainingTask.objective
                },
                {
                  key: "scope",
                  label: "影响对象",
                  children: trainingTask.audience.join("、")
                },
                {
                  key: "deadline",
                  label: "完成期限",
                  children: trainingTask.deadline
                },
                {
                  key: "risk",
                  label: "风险类型",
                  children: "高风险知识范围与正式任务下发"
                },
                {
                  key: "version",
                  label: "方案版本",
                  children: `${plan.title} · V${plan.version}`
                }
              ]}
            />
          </Card>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card
                title={
                  <Space>
                    <RobotOutlined />
                    Agent 建议摘要
                  </Space>
                }
              >
                <Typography.Paragraph>
                  建议采用风险前置的部门化路径：炼钢新员工先完成高温作业与设备联锁知识，智信部进入数据权限案例。
                </Typography.Paragraph>
                <Alert
                  type="info"
                  showIcon
                  message="这是 Agent 建议，不是规则结论或审批决定。"
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card
                title={
                  <Space>
                    <SafetyCertificateOutlined />
                    规则触发原因
                  </Space>
                }
              >
                <List
                  size="small"
                  dataSource={[
                    "包含炼钢高温作业高风险知识",
                    "影响正式培训任务下发范围",
                    "高风险知识需独立达标与复测",
                    "审批前未发生正式业务写入"
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <CheckOutlined className="icon-success" /> {item}
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
          <Card
            title="知识依据与版本"
            style={{ marginTop: 16 }}
            extra={
              <Button
                type="link"
                icon={<FileSearchOutlined />}
                onClick={() => setCitationOpen(true)}
              >
                查看引用详情
              </Button>
            }
          >
            <List
              dataSource={knowledgeCitations}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<FileSearchOutlined />}
                    title={`${item.documentName} ${item.version}`}
                    description={`${item.section} · ${item.department} · ${item.relation}`}
                  />
                  <Tag color="green">现行有效</Tag>
                </List.Item>
              )}
            />
          </Card>
          <Card title="方案差异与审批历史" style={{ marginTop: 16 }}>
            <Descriptions
              column={1}
              items={[
                {
                  key: "difference",
                  label: "相对标准路径",
                  children:
                    "炼钢高风险模块前置；智信部不进入无关现场细节；高风险复测成为完成条件。"
                },
                {
                  key: "history",
                  label: "历史审批",
                  children: "当前为首次提交，无被覆盖的旧决定。"
                },
                {
                  key: "stale",
                  label: "版本变化控制",
                  children:
                    "方案、知识或风险版本变化后，旧审批单自动失效并要求重新核对。"
                }
              ]}
            />
          </Card>
          <Card className="sticky-action-bar">
            <Flex justify="space-between" align="center" gap={16}>
              <Space>
                <InfoCircleOutlined />
                <Typography.Text>
                  决定将关联当前方案和知识版本，并写入审计记录。
                </Typography.Text>
              </Space>
              <Flex gap={8}>
                <Button
                  disabled={role !== "reviewer"}
                  icon={<FormOutlined />}
                  onClick={() => setDecision("returned_for_information")}
                >
                  退回补充
                </Button>
                <Button
                  danger
                  disabled={role !== "reviewer"}
                  icon={<CloseOutlined />}
                  onClick={() => setDecision("rejected")}
                >
                  拒绝
                </Button>
                <Button
                  disabled={role !== "reviewer"}
                  onClick={() => setDecision("approved_with_changes")}
                >
                  修改后批准
                </Button>
                <Button
                  type="primary"
                  disabled={role !== "reviewer"}
                  icon={<CheckOutlined />}
                  onClick={() => setDecision("approved")}
                >
                  批准
                </Button>
              </Flex>
            </Flex>
          </Card>
        </Col>
      </Row>
      <KnowledgeDrawer
        open={citationOpen}
        onClose={() => setCitationOpen(false)}
      />
      <Modal
        title={
          decision === "approved"
            ? "确认批准"
            : decision === "approved_with_changes"
              ? "修改后批准"
              : decision === "rejected"
                ? "拒绝当前版本"
                : "退回补充信息"
        }
        open={Boolean(decision)}
        okText="提交决定"
        cancelText="取消"
        confirmLoading={submitting}
        onCancel={() => setDecision(null)}
        onOk={submitDecision}
      >
        <Alert
          type={
            decision === "rejected" || decision === "returned_for_information"
              ? "warning"
              : "info"
          }
          showIcon
          message="审批决定只对当前方案、知识和风险版本有效。"
          style={{ marginBottom: 16 }}
        />
        <Form form={form} layout="vertical">
          {decision === "approved_with_changes" ? (
            <Form.Item
              name="changes"
              label="明确修改要求"
              rules={[{ required: true, message: "请填写修改要求" }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="例如：将高风险复测设为完成条件，并保留独立通过证据。"
              />
            </Form.Item>
          ) : null}
          <Form.Item
            name="comment"
            label="审批意见"
            rules={[{ required: true, message: "请填写审批意见" }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="说明依据、风险判断和需要执行的后续动作。"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
