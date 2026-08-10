import {
  AuditOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  PrinterOutlined,
  RobotOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Flex,
  Progress,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message
} from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataList as List } from "../components/DataList";
import { PageHeader } from "../components/PageHeader";
import { StatusTag } from "../components/StatusTag";
import { services } from "../services";
import {
  knowledgeCitations,
  reportSummary,
  trainingTask
} from "../services/workspace-data";
import { usePrototypeStore } from "../stores/prototype-store";

export function ReportPage() {
  const navigate = useNavigate();
  const role = usePrototypeStore((state) => state.role);
  const taskStatus = usePrototypeStore((state) => state.task_status);
  const [exporting, setExporting] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    "draft" | "awaiting_confirmation" | "confirmed"
  >(reportSummary.status);

  const requestExport = async () => {
    setExporting(true);
    try {
      const result = await services.report.requestExport(
        trainingTask.id,
        "pdf",
      );
      message.success(result.data.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="培训报告"
        title="培训结果与审计闭环"
        description="核对完成情况、测评、补训、高风险知识与异常记录，并在依据完整后确认正式结果。"
        extra={
          <Space>
            <Button
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
            >
              打印
            </Button>
            <Button
              icon={<DownloadOutlined />}
              loading={exporting}
              disabled={reportStatus !== "confirmed"}
              onClick={requestExport}
            >
              导出已确认版本
            </Button>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              onClick={() => navigate(`/agent-runs/${trainingTask.id}`)}
            >
              查看 Agent 轨迹
            </Button>
          </Space>
        }
      />
      <Alert
        showIcon
        type={reportStatus === "confirmed" ? "success" : "warning"}
        title={
          reportStatus === "confirmed"
            ? "报告已完成确认，可作为当前版本的正式培训结果"
            : reportStatus === "awaiting_confirmation"
              ? "报告完整性检查已通过，等待授权人员确认"
              : "当前为报告草稿，确认前不作为正式培训结论"
        }
        description="报告结论关联当前任务、方案、知识引用、审批与异常记录；版本变化后需重新核对。"
        style={{ marginBottom: 20 }}
      />
      <Card>
        <Flex justify="space-between" align="flex-start" gap={24}>
          <div>
            <Typography.Text className="eyebrow">
              {trainingTask.id}
            </Typography.Text>
            <Typography.Title level={3}>
              {trainingTask.name}
            </Typography.Title>
            <Typography.Paragraph type="secondary">
              覆盖智信部与炼钢生产部新员工 · 目标期限 2026-08-15
            </Typography.Paragraph>
          </div>
          <StatusTag status={taskStatus} />
        </Flex>
        <Descriptions
          bordered
          column={4}
          items={[
            {
              key: "completion",
              label: "任务完成",
          children: `${reportSummary.completion_rate_percent}%`
            },
            {
              key: "pass",
              label: "首次达标",
          children: `${reportSummary.assessment_pass_rate_percent}%`
            },
            {
              key: "remedial",
              label: "进入补训",
          children: `${reportSummary.remedial_count} 人`
            },
            {
              key: "risk",
              label: "高风险干预",
          children: `${reportSummary.high_risk_intervention_count} 次`
            }
          ]}
        />
        <Alert
          type="warning"
          showIcon
          title="需要处理：3 人首次未通过高风险知识要求"
          description="其中 1 人待复测、2 人复测已通过。完成剩余复测并核对异常记录后再确认报告。"
          action={<Button type="link">查看未完成项</Button>}
          style={{ marginTop: 16 }}
        />
      </Card>
      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col span={14}>
          <Card title="部门进度与路径差异">
            <Table
              pagination={false}
              rowKey="department"
              dataSource={[
                {
                  department: "智信部",
                  path: "基础制度 → 数据权限案例 → 测评",
                  progress: 94,
                  pass: 84,
                  status: "执行中"
                },
                {
                  department: "炼钢生产部",
                  path: "基础制度 → 高风险知识前置 → 场景练习 → 独立复测",
                  progress: 88,
                  pass: 72,
                  status: "补训中"
                }
              ]}
              columns={[
                { title: "部门", dataIndex: "department" },
                { title: "学习路径", dataIndex: "path" },
                {
                  title: "完成进度",
                  dataIndex: "progress",
                  render: (value) => (
                    <Progress percent={value} size="small" />
                  )
                },
                {
                  title: "首次达标",
                  dataIndex: "pass",
                  render: (value) => `${value}%`
                },
                {
                  title: "状态",
                  dataIndex: "status",
                  render: (value) => <Tag>{value}</Tag>
                }
              ]}
            />
          </Card>
          <Card title="高风险知识点结果" style={{ marginTop: 20 }}>
            <List
              dataSource={[
                {
                  title: "高温作业与设备联锁",
                  result: "3 人首次未达标，已进入针对性补训",
                  status: "处理中",
                  color: "orange"
                },
                {
                  title: "数据权限与账号使用",
                  result: "当前没有阻断性薄弱点",
                  status: "通过",
                  color: "green"
                }
              ]}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      item.color === "green" ? (
                        <CheckCircleOutlined className="icon-success" />
                      ) : (
                        <ExclamationCircleOutlined className="icon-warning" />
                      )
                    }
                    title={item.title}
                    description={item.result}
                  />
                  <Tag color={item.color}>{item.status}</Tag>
                </List.Item>
              )}
            />
          </Card>
          <Card title="补训与复测记录" style={{ marginTop: 20 }}>
            <Table
              pagination={false}
              rowKey="id"
              dataSource={[
                {
                  id: "E-0231",
                  weak: "高温作业联锁前置条件",
                  remedial: "定向讲解 + 场景练习",
                  attempt: 2,
                  result: "复测通过"
                },
                {
                  id: "E-0244",
                  weak: "隔离边界识别",
                  remedial: "定向讲解",
                  attempt: 1,
                  result: "待复测"
                }
              ]}
              columns={[
                { title: "匿名员工", dataIndex: "id" },
                { title: "薄弱知识点", dataIndex: "weak" },
                { title: "补训内容", dataIndex: "remedial" },
                { title: "复测次数", dataIndex: "attempt" },
                { title: "结果", dataIndex: "result" }
              ]}
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card
            title={
              <Space>
                <AuditOutlined />
                审批与异常摘要
              </Space>
            }
          >
            <List
              dataSource={[
                "高风险方案在正式下发前完成审批",
                "审核意见已关联方案 V2 与知识版本",
                "知识检索 Skill 出现 1 次超时，重试后恢复",
                "未发生绕过审批或重复创建任务"
              ]}
              renderItem={(item) => (
                <List.Item>
                  <CheckCircleOutlined className="icon-success" />
                  <span>{item}</span>
                </List.Item>
              )}
            />
          </Card>
          <Card
            title="知识引用"
            style={{ marginTop: 20 }}
            extra={<Tag color="blue">{knowledgeCitations.length} 条</Tag>}
          >
            <List
              size="small"
              dataSource={knowledgeCitations}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<FileSearchOutlined />}
                    title={`${item.document_name} ${item.document_version}`}
                    description={`${item.section} · ${(item.authorized_scopes ?? []).join("、")}`}
                  />
                  <Tag color="green">有效</Tag>
                </List.Item>
              )}
            />
          </Card>
          <Card title="报告确认" style={{ marginTop: 20 }}>
            <Typography.Paragraph type="secondary">
              完整性校验通过后，培训管理员可提交审核员或管理者确认。确认前不作为正式培训结论。
            </Typography.Paragraph>
            {role === "reviewer" ? (
              <Flex gap={8}>
                <Button
                  onClick={() => {
                    setReportStatus("draft");
                    message.warning("已退回补充异常处理说明。");
                  }}
                >
                  退回补充
                </Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setReportStatus("confirmed");
                    message.success("报告已确认并保留版本。");
                  }}
                >
                  确认报告
                </Button>
              </Flex>
            ) : (
              <Button
                type="primary"
                block
                disabled={reportStatus !== "draft"}
                onClick={() => {
                  setReportStatus("awaiting_confirmation");
                  message.success("完整性检查通过，报告已提交确认。");
                }}
              >
                提交确认
              </Button>
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
