import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  SaveOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Steps,
  Typography,
  message
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AgentExecutionPanel } from "../components/AgentExecutionPanel";
import { PageHeader } from "../components/PageHeader";
import { services } from "../services";
import { trainingTask } from "../services/workspace-data";
import { usePrototypeStore } from "../stores/prototype-store";

interface TrainingFormValue {
  name: string;
  objective: string;
  departments: string[];
  audience: string[];
  deadline: dayjs.Dayjs;
  mandatoryRequirements: string[];
  highRiskRequirements: string[];
  completionCondition: string;
  knowledgeScope: string[];
  approvalRequirement: string;
}

const stepFields: Array<Array<keyof TrainingFormValue>> = [
  ["name", "deadline"],
  ["departments", "audience"],
  ["objective", "completionCondition"],
  ["mandatoryRequirements", "knowledgeScope"],
  ["highRiskRequirements", "approvalRequirement"],
  []
];

export function TrainingCreatePage() {
  const [form] = Form.useForm<TrainingFormValue>();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showExecution, setShowExecution] = useState(false);
  const taskStatus = usePrototypeStore((state) => state.task_status);
  const scenario = usePrototypeStore((state) => state.scenario);
  const saveDraft = usePrototypeStore((state) => state.saveDraft);
  const completeAnalysis = usePrototypeStore(
    (state) => state.completeAnalysis,
  );
  const pause = usePrototypeStore((state) => state.pause);
  const requestTakeover = usePrototypeStore(
    (state) => state.requestTakeover,
  );
  const navigate = useNavigate();

  const defaults = useMemo<TrainingFormValue>(
    () => ({
      name: trainingTask.name,
      objective: trainingTask.objective,
      departments: trainingTask.department_names ?? [],
      audience: trainingTask.audience_labels ?? [],
      deadline: dayjs(trainingTask.deadline),
      mandatoryRequirements: trainingTask.mandatory_requirements ?? [],
      highRiskRequirements: trainingTask.high_risk_requirements ?? [],
      knowledgeScope: [
        "企业基础制度",
        "智信部岗位知识",
        "炼钢生产部安全规范"
      ],
      approvalRequirement: "高风险知识或正式下发命中规则时提交审批",
      completionCondition:
        "完成必修内容与部门路径；高风险知识点独立达标；未达标进入补训与复测。"
    }),
    [],
  );

  const next = async () => {
    await form.validateFields(stepFields[step]);
    setStep((value) => Math.min(value + 1, 5));
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await services.training.createTask({
        name: values.name,
        objective: values.objective,
        department_names: values.departments,
        audience_labels: values.audience,
        deadline: values.deadline.format("YYYY-MM-DD"),
        mandatory_requirements: values.mandatoryRequirements,
        high_risk_requirements: values.highRiskRequirements,
        risk_level: "high"
      });
      if (scenario === "information_missing") {
        message.warning("信息不足，已列出缺失项，Agent 尚未启动。");
        setSubmitting(false);
        return;
      }
      setShowExecution(true);
      message.success("任务已创建，Supervisor 开始拆解。");
    } catch {
      message.error("请先补齐必填信息。");
    } finally {
      setSubmitting(false);
    }
  };

  if (showExecution || taskStatus === "TB-ANALYZING") {
    return (
      <>
        <PageHeader
          eyebrow="培训任务"
          title="Agent 正在分析任务"
          description="系统正在核对上下文、知识范围和硬约束；可以安全离开页面，进度会持续保留。"
        />
        <AgentExecutionPanel
          status={taskStatus}
          onPause={pause}
          onTakeover={requestTakeover}
          onComplete={() => {
            completeAnalysis();
            navigate(`/admin/plans/${trainingTask.id}`);
          }}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="培训任务"
        title="创建培训目标与约束"
        description="管理员提供业务目标、对象和不可违反的约束，不需要手工编排全部课程与题目。"
        extra={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              Modal.confirm({
                title: "退出创建？",
                content: "未保存的修改将丢失。可以先保存草稿。",
                okText: "确认退出",
                onOk: () => navigate("/admin/dashboard")
              })
            }
          >
            返回工作台
          </Button>
        }
      />
      <Card>
        <Steps
          current={step}
          items={[
            { title: "基本信息" },
            { title: "培训对象" },
            { title: "目标与约束" },
            { title: "知识范围" },
            { title: "风险与审批" },
            { title: "确认提交" }
          ]}
        />
        <Divider />
        {scenario === "information_missing" ? (
          <Alert
            showIcon
            type="warning"
            message="部分员工基础信息待补充"
            description="可以继续保存草稿；提交后系统会列出缺口并暂停分析，不会使用推测信息补全员工资料。"
            style={{ marginBottom: 20 }}
          />
        ) : null}
        <Form
          form={form}
          layout="vertical"
          initialValues={defaults}
          className="training-form"
        >
          <div hidden={step !== 0}>
            <Form.Item
              name="name"
              label="培训任务名称"
              rules={[{ required: true, message: "请输入培训任务名称" }]}
            >
              <Input maxLength={80} showCount />
            </Form.Item>
            <Form.Item
              name="deadline"
              label="完成期限"
              rules={[{ required: true, message: "请选择完成期限" }]}
            >
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </div>
          <div hidden={step !== 1}>
            <Form.Item
              name="departments"
              label="适用部门"
              rules={[{ required: true, message: "请选择适用部门" }]}
            >
              <Select
                mode="multiple"
                options={[
                  { value: "智信部", label: "智信部" },
                  { value: "炼钢生产部", label: "炼钢生产部" }
                ]}
              />
            </Form.Item>
            <Form.Item
              name="audience"
              label="培训对象"
              rules={[{ required: true, message: "请选择培训对象" }]}
            >
              <Select
                mode="multiple"
                options={[
                  { value: "智信部新员工", label: "智信部新员工" },
                  {
                    value: "炼钢生产部新员工",
                    label: "炼钢生产部新员工"
                  }
                ]}
              />
            </Form.Item>
            <Alert
              type="info"
              message="数据范围由当前角色与部门授权共同决定；跨部门越权对象不会返回字段值。"
              showIcon
            />
          </div>
          <div hidden={step !== 2}>
            <Form.Item
              name="objective"
              label="培训目标"
              rules={[{ required: true, message: "请输入培训目标" }]}
            >
              <Input.TextArea rows={5} showCount maxLength={500} />
            </Form.Item>
            <Form.Item
              name="completionCondition"
              label="完成条件"
              rules={[{ required: true, message: "请输入完成条件" }]}
            >
              <Input.TextArea rows={4} />
            </Form.Item>
          </div>
          <div hidden={step !== 3}>
            <Form.Item
              name="mandatoryRequirements"
              label="必修内容"
              rules={[{ required: true, message: "请选择必修内容" }]}
            >
              <Checkbox.Group
                options={[
                  "企业基础制度与行为规范",
                  "部门特色知识",
                  "学习测评与培训报告"
                ]}
              />
            </Form.Item>
            <Form.Item
              name="knowledgeScope"
              label="允许使用的知识范围"
              extra="系统只检索已授权、在有效期内且适用于当前部门的知识版本。"
              rules={[{ required: true, message: "请选择知识范围" }]}
            >
              <Select
                mode="multiple"
                options={[
                  { value: "企业基础制度", label: "企业基础制度" },
                  { value: "智信部岗位知识", label: "智信部岗位知识" },
                  {
                    value: "炼钢生产部安全规范",
                    label: "炼钢生产部安全规范"
                  }
                ]}
              />
            </Form.Item>
            <Alert
              type="info"
              showIcon
              message="版本冲突或引用失效时，方案生成将暂停并转知识责任人处理。"
            />
          </div>
          <div hidden={step !== 4}>
            <Form.Item
              name="highRiskRequirements"
              label="高风险要求"
              rules={[{ required: true, message: "请确认高风险要求" }]}
            >
              <Select
                mode="tags"
                options={[
                  {
                    value: "高温作业与设备联锁前置知识独立达标",
                    label: "高温作业与设备联锁前置知识独立达标"
                  }
                ]}
              />
            </Form.Item>
            <Form.Item
              name="approvalRequirement"
              label="审批要求"
              rules={[{ required: true, message: "请选择审批要求" }]}
            >
              <Select
                options={[
                  {
                    value: "高风险知识或正式下发命中规则时提交审批",
                    label: "命中高风险或正式下发规则时提交审批"
                  }
                ]}
              />
            </Form.Item>
            <Alert
              type="warning"
              showIcon
              message="高风险要求将进入确定性风险分级；正式业务写入前必须完成必要审批。"
            />
          </div>
          <div hidden={step !== 5}>
            <Typography.Title level={4}>提交前确认</Typography.Title>
            <Typography.Paragraph>
              提交后 Supervisor 将拆解诊断、检索、规划、校验、审批、下发、学习、测评与报告节点。Agent
              建议仍需规则校验和管理员确认。
            </Typography.Paragraph>
            <Alert
              showIcon
              type="info"
              message="提交不会直接下发培训，也不会绕过高风险审批。"
            />
          </div>
        </Form>
        <Divider />
        <Flex justify="space-between">
          <Button
            icon={<SaveOutlined />}
            onClick={() => {
              saveDraft();
              message.success("草稿已保存。");
            }}
          >
            保存草稿
          </Button>
          <Flex gap={8}>
            <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
              上一步
            </Button>
            {step < 5 ? (
              <Button type="primary" onClick={next}>
                下一步
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={submitting}
                onClick={handleSubmit}
              >
                提交分析
              </Button>
            )}
          </Flex>
        </Flex>
      </Card>
    </>
  );
}
