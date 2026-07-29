import {
  ArrowLeftOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  DiffOutlined,
  EditOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SendOutlined
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  List,
  Modal,
  Radio,
  Row,
  Segmented,
  Space,
  Tag,
  Timeline,
  Typography,
  message
} from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { candidatePlans, trainingTask } from "@tegang/mock-data";
import { StatusTag } from "../components/StatusTag";
import { KnowledgeDrawer } from "../components/KnowledgeDrawer";
import { PageHeader } from "../components/PageHeader";
import { services } from "../services";
import { usePrototypeStore } from "../stores/prototype-store";

export function PlanPage() {
  const navigate = useNavigate();
  const [comparisonMode, setComparisonMode] = useState("方案详情");
  const [editOpen, setEditOpen] = useState(false);
  const [citationOpen, setCitationOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const taskStatus = usePrototypeStore((state) => state.taskStatus);
  const selectedPlanId = usePrototypeStore((state) => state.selectedPlanId);
  const selectPlan = usePrototypeStore((state) => state.selectPlan);
  const confirmPlan = usePrototypeStore((state) => state.confirmPlan);
  const completeApprovalModification = usePrototypeStore(
    (state) => state.completeApprovalModification,
  );
  const reviseAfterRejection = usePrototypeStore(
    (state) => state.reviseAfterRejection,
  );

  const selectedPlan = useMemo(
    () =>
      candidatePlans.find((plan) => plan.id === selectedPlanId) ??
      candidatePlans[0]!,
    [selectedPlanId],
  );

  const handleRiskCheck = () => {
    confirmPlan();
    const newStatus = usePrototypeStore.getState().taskStatus;
    if (newStatus === "awaiting_approval") {
      message.warning("高风险规则命中，审批单已创建并暂停正式写入。");
    } else {
      message.success("低风险校验通过，方案已进入待下发。");
    }
  };

  const handlePublish = async () => {
    Modal.confirm({
      title: "确认下发培训任务？",
      content:
        "将向智信部与炼钢生产部新员工创建正式培训任务。重复请求使用相同幂等键，不会重复创建。",
      okText: "确认下发",
      cancelText: "返回检查",
      onOk: async () => {
        setPublishing(true);
        try {
          await services.training.publishTask(trainingTask.id);
          message.success("培训任务已幂等创建并完成通知。");
          navigate("/admin/dashboard");
        } finally {
          setPublishing(false);
        }
      }
    });
  };

  return (
    <>
      <PageHeader
        eyebrow="P-03 方案查看与调整页"
        title="培训方案与执行条件"
        description="区分 Agent 建议、确定性规则和人工决定；高风险动作在正式写入前暂停。"
        extra={
          <Flex gap={8}>
            <StatusTag status={taskStatus} />
            <Button
              icon={<RobotOutlined />}
              onClick={() => navigate(`/agent-runs/${trainingTask.id}`)}
            >
              查看运行证据
            </Button>
          </Flex>
        }
      />
      {taskStatus === "awaiting_approval" ? (
        <Alert
          type="warning"
          showIcon
          message="高风险动作已暂停，等待审核员决定"
          description="当前没有向外部系统写入正式培训任务。审核员将核对知识引用、影响范围和规则命中原因。"
          action={
            <Button
              icon={<AuditOutlined />}
              onClick={() => navigate("/approvals")}
            >
              查看审批进度
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      ) : null}
      {taskStatus === "approval_rejected" ? (
        <Alert
          type="error"
          showIcon
          message="当前版本被拒绝"
          description="拒绝原因：高风险模块的现场案例与现行版本范围不一致。请修订后重新生成并校验，或终止任务。"
          action={
            <Button
              danger
              onClick={() => {
                reviseAfterRejection();
                navigate("/admin/training/create");
              }}
            >
              返回修订目标与约束
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      ) : null}
      {taskStatus === "approval_modification" ? (
        <Alert
          type="info"
          showIcon
          message="按审核意见修改后批准"
          description="需将炼钢高风险模块前置，并将独立复测设为下发条件。应用修改后，系统会重新运行硬约束校验。"
          action={
            <Button
              type="primary"
              onClick={() => {
                completeApprovalModification();
                message.success("批准参数已应用，重新校验通过。");
              }}
            >
              应用修改并重新校验
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      ) : null}
      <Row gutter={[20, 20]}>
        <Col span={16}>
          <Card>
            <Flex justify="space-between" align="center" gap={16}>
              <div>
                <Typography.Text className="eyebrow">
                  候选方案
                </Typography.Text>
                <Typography.Title level={3}>
                  选择可审核的执行路径
                </Typography.Title>
              </div>
              <Segmented
                value={comparisonMode}
                options={["方案详情", "并排比较", "版本差异"]}
                onChange={(value) => setComparisonMode(String(value))}
              />
            </Flex>
            <Radio.Group
              value={selectedPlanId}
              onChange={(event) => selectPlan(event.target.value)}
              className="plan-selector"
            >
              {candidatePlans.map((plan) => (
                <Card
                  key={plan.id}
                  className={
                    plan.id === selectedPlanId
                      ? "plan-option plan-option--selected"
                      : "plan-option"
                  }
                  onClick={() => selectPlan(plan.id)}
                >
                  <Flex justify="space-between" align="flex-start" gap={16}>
                    <div>
                      <Radio value={plan.id}>
                        <strong>{plan.candidateLabel}</strong>
                      </Radio>
                      <Typography.Title level={4}>
                        {plan.title}
                      </Typography.Title>
                      <Typography.Paragraph type="secondary">
                        {plan.summary}
                      </Typography.Paragraph>
                    </div>
                    {plan.id === "PLAN-02" ? (
                      <Tag color="purple">Agent建议</Tag>
                    ) : (
                      <Tag>备选</Tag>
                    )}
                  </Flex>
                  <div className="selection-reason">
                    <RobotOutlined />
                    <span>选择理由摘要：{plan.selectionReason}</span>
                  </div>
                </Card>
              ))}
            </Radio.Group>
          </Card>
          <Card
            title="部门化学习路径"
            style={{ marginTop: 20 }}
            extra={
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => setEditOpen(true)}
              >
                修改部分内容
              </Button>
            }
          >
            <Timeline
              items={selectedPlan.modules.map((module) => ({
                color: module.riskLevel === "high" ? "red" : "blue",
                children: (
                  <div className="module-timeline">
                    <Flex justify="space-between">
                      <strong>{module.title}</strong>
                      <Space>
                        <Tag>{module.department}</Tag>
                        {module.riskLevel === "high" ? (
                          <Tag color="red">高风险</Tag>
                        ) : null}
                      </Space>
                    </Flex>
                    <Typography.Text type="secondary">
                      预计 {module.durationMinutes} 分钟 ·
                      知识点 {module.knowledgePointIds.join("、")}
                    </Typography.Text>
                  </div>
                )
              }))}
            />
          </Card>
          <Card title="确定性规则校验" style={{ marginTop: 20 }}>
            <List
              dataSource={selectedPlan.ruleChecks}
              renderItem={(rule) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      rule.result === "passed" ? (
                        <CheckCircleOutlined className="icon-success" />
                      ) : (
                        <ExperimentOutlined className="icon-warning" />
                      )
                    }
                    title={
                      <Flex gap={8}>
                        <span>{rule.label}</span>
                        <Tag color={rule.result === "passed" ? "green" : "orange"}>
                          确定性规则
                        </Tag>
                      </Flex>
                    }
                    description={rule.detail}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="risk-panel">
            <Typography.Text className="eyebrow">当前风险等级</Typography.Text>
            <Flex align="center" gap={12} className="risk-level">
              <Badge status="error" />
              <Typography.Title level={3}>高风险</Typography.Title>
            </Flex>
            <Typography.Paragraph type="secondary">
              原因：炼钢生产部包含高温作业和设备联锁前置知识，正式下发会影响现场培训范围。
            </Typography.Paragraph>
            <Divider />
            <Descriptions
              column={1}
              size="small"
              items={[
                {
                  key: "scope",
                  label: "影响范围",
                  children: "智信部、炼钢生产部新员工"
                },
                {
                  key: "knowledge",
                  label: "知识依据",
                  children: (
                    <Button
                      type="link"
                      icon={<FileSearchOutlined />}
                      onClick={() => setCitationOpen(true)}
                    >
                      查看 3 条引用
                    </Button>
                  )
                },
                {
                  key: "write",
                  label: "正式写入",
                  children:
                    taskStatus === "executing" ? "已执行" : "尚未执行"
                }
              ]}
            />
          </Card>
          <Card title="当前可执行操作" style={{ marginTop: 20 }}>
            <Flex vertical gap={10}>
              {[
                "awaiting_admin_confirmation",
                "plan_generated"
              ].includes(taskStatus) ? (
                <>
                  <Button
                    type="primary"
                    icon={<SafetyCertificateOutlined />}
                    onClick={handleRiskCheck}
                  >
                    确认并进行风险校验
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() =>
                      message.info(
                        "已保持目标与约束，生成另一候选方案（演示状态）。",
                      )
                    }
                  >
                    保持约束，重新生成
                  </Button>
                  <Button
                    icon={<DiffOutlined />}
                    onClick={() => navigate("/admin/training/create")}
                  >
                    更改目标后重新规划
                  </Button>
                </>
              ) : null}
              {taskStatus === "awaiting_publish" ? (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={publishing}
                  onClick={handlePublish}
                >
                  下发培训任务
                </Button>
              ) : null}
              {taskStatus === "awaiting_approval" ? (
                <Button
                  icon={<AuditOutlined />}
                  onClick={() => navigate("/approvals")}
                >
                  查看审批状态
                </Button>
              ) : null}
              {taskStatus === "executing" ? (
                <>
                  <Button
                    type="primary"
                    onClick={() => navigate("/admin/dashboard")}
                  >
                    跟踪学习进度
                  </Button>
                  <Button
                    onClick={() =>
                      navigate(`/admin/reports/${trainingTask.id}`)
                    }
                  >
                    查看培训报告
                  </Button>
                </>
              ) : null}
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate("/admin/dashboard")}
              >
                返回工作台
              </Button>
            </Flex>
          </Card>
        </Col>
      </Row>
      <Drawer
        title="修改部分培训内容"
        width={560}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        extra={
          <Button
            type="primary"
            onClick={() => {
              setEditOpen(false);
              message.success("修改已保存，规则校验结果已刷新。");
            }}
          >
            保存并重新校验
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          message="修改课程顺序或说明不会改变目标；更改目标或约束应使用“重新规划”。"
          style={{ marginBottom: 20 }}
        />
        <Form layout="vertical">
          <Form.Item label="方案摘要">
            <Input.TextArea rows={4} defaultValue={selectedPlan.summary} />
          </Form.Item>
          <Form.Item label="炼钢模块说明">
            <Input.TextArea
              rows={5}
              defaultValue="高风险知识前置，完成独立测评后才进入后续路径。"
            />
          </Form.Item>
        </Form>
      </Drawer>
      <KnowledgeDrawer
        open={citationOpen}
        onClose={() => setCitationOpen(false)}
      />
    </>
  );
}
