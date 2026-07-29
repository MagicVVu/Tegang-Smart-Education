import {
  ApiOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CloudSyncOutlined,
  FileSearchOutlined,
  LockOutlined,
  WarningOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Flex,
  List,
  Row,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message
} from "antd";
import { knowledgeCitations } from "@tegang/mock-data";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { PageHeader } from "../components/PageHeader";

export function SystemConfigPage() {
  const items = [
    {
      key: "knowledge",
      label: "知识文档与版本",
      children: <KnowledgeTab />
    },
    {
      key: "permission",
      label: "角色与数据权限",
      children: <PermissionTab />
    },
    {
      key: "rules",
      label: "规则与 Skill",
      children: <RulesTab />
    },
    {
      key: "health",
      label: "系统运行状态",
      children: <HealthTab />
    },
    {
      key: "design",
      label: "设计规范与公共组件",
      children: <DesignSystemTab />
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="P-09 知识与配置管理页"
        title="知识、权限与受控执行配置"
        description="配置版本化发布并保留影响分析；系统管理员不能在这里修改学习结果或业务审批。"
        extra={<Tag color="blue">配置环境 · 本地演示</Tag>}
      />
      <Alert
        type="info"
        showIcon
        message="本页展示最小治理配置的原型，不连接真实身份、知识或业务系统。"
        style={{ marginBottom: 20 }}
      />
      <Card>
        <Tabs items={items} />
      </Card>
    </>
  );
}

function KnowledgeTab() {
  return (
    <>
      <Flex justify="space-between" align="center" className="tab-heading">
        <div>
          <Typography.Title level={4}>知识版本与有效性</Typography.Title>
          <Typography.Paragraph type="secondary">
            旧任务保留引用快照；冲突或回归失败时维持上一有效版本。
          </Typography.Paragraph>
        </div>
        <Button
          type="primary"
          onClick={() => message.info("已创建知识版本草稿（演示）。")}
        >
          新建版本草稿
        </Button>
      </Flex>
      <Table
        pagination={false}
        rowKey="id"
        dataSource={knowledgeCitations}
        columns={[
          {
            title: "文档",
            dataIndex: "documentName",
            render: (value) => (
              <Flex gap={8}>
                <FileSearchOutlined />
                <strong>{value}</strong>
              </Flex>
            )
          },
          { title: "版本", dataIndex: "version" },
          { title: "适用范围", dataIndex: "department" },
          {
            title: "状态",
            dataIndex: "validity",
            render: () => <Tag color="green">现行有效</Tag>
          },
          {
            title: "回归状态",
            render: () => <Tag color="blue">引用测试通过</Tag>
          },
          {
            title: "操作",
            render: () => (
              <Button type="link" onClick={() => message.info("查看版本审计。")}>
                查看审计
              </Button>
            )
          }
        ]}
      />
    </>
  );
}

function PermissionTab() {
  return (
    <Row gutter={[20, 20]}>
      <Col span={14}>
        <Table
          pagination={false}
          rowKey="role"
          dataSource={[
            {
              role: "员工／参训人员",
              data: "本人任务与授权知识",
              highRisk: "不可审批"
            },
            {
              role: "培训管理员",
              data: "负责部门与任务",
              highRisk: "可提交，不可批准"
            },
            {
              role: "审核员／管理者",
              data: "授权审批与报告范围",
              highRisk: "可作审批决定"
            },
            {
              role: "系统管理员",
              data: "配置与脱敏诊断",
              highRisk: "不可替代业务审批"
            }
          ]}
          columns={[
            { title: "角色", dataIndex: "role" },
            { title: "数据范围", dataIndex: "data" },
            { title: "高风险边界", dataIndex: "highRisk" }
          ]}
        />
      </Col>
      <Col span={10}>
        <Card title="部门数据隔离">
          <List
            dataSource={[
              {
                title: "智信部",
                detail: "员工、培训、知识与报告按任务授权"
              },
              {
                title: "炼钢生产部",
                detail: "高风险知识与现场培训数据独立控制"
              }
            ]}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<LockOutlined />}
                  title={item.title}
                  description={item.detail}
                />
                <Tag color="green">已隔离</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  );
}

function RulesTab() {
  return (
    <Row gutter={[20, 20]}>
      <Col span={12}>
        <Card title="确定性规则版本 R-0.1">
          <List
            dataSource={[
              "部门与任务数据权限",
              "高风险知识独立达标",
              "高风险正式写入前审批",
              "客观题确定性评分",
              "自动补训循环上限为 2",
              "Skill 调用使用白名单与幂等键"
            ]}
            renderItem={(item) => (
              <List.Item>
                <CheckCircleOutlined className="icon-success" />
                <span>{item}</span>
              </List.Item>
            )}
          />
          <Button
            type="primary"
            block
            onClick={() =>
              message.info("影响分析通过后才允许发布新规则版本。")
            }
          >
            创建新规则版本
          </Button>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="受控 Skill 白名单">
          <List
            dataSource={[
              {
                name: "read_employee_context",
                scope: "授权范围只读",
                enabled: true
              },
              {
                name: "retrieve_authorized_knowledge",
                scope: "版本与权限过滤",
                enabled: true
              },
              {
                name: "publish_training_task",
                scope: "审批通过后幂等写入",
                enabled: true
              },
              {
                name: "write_employee_profile",
                scope: "规则或审批后写入",
                enabled: false
              }
            ]}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Switch key="switch" checked={item.enabled} disabled />
                ]}
              >
                <List.Item.Meta
                  avatar={<ApiOutlined />}
                  title={item.name}
                  description={item.scope}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  );
}

function HealthTab() {
  return (
    <Row gutter={[16, 16]}>
      {[
        {
          icon: <CloudSyncOutlined />,
          title: "培训系统连接",
          detail: "Mock 服务 · 正常",
          color: "green"
        },
        {
          icon: <FileSearchOutlined />,
          title: "知识索引",
          detail: "3 条演示来源 · 正常",
          color: "green"
        },
        {
          icon: <WarningOutlined />,
          title: "失败任务",
          detail: "1 个可恢复演示任务",
          color: "orange"
        },
        {
          icon: <AuditOutlined />,
          title: "Trace 完整性",
          detail: "关键节点已记录",
          color: "blue"
        }
      ].map((item) => (
        <Col span={12} key={item.title}>
          <Card>
            <Flex gap={14} align="center">
              <div className="task-icon">{item.icon}</div>
              <div>
                <strong>{item.title}</strong>
                <div>
                  <Tag color={item.color}>{item.detail}</Tag>
                </div>
              </div>
            </Flex>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

function DesignSystemTab() {
  const colorItems = [
    ["主色", colors.brand],
    ["Agent建议", colors.agent],
    ["成功", colors.success],
    ["警告", colors.warning],
    ["风险／错误", colors.risk],
    ["信息", colors.info]
  ];
  return (
    <Row gutter={[20, 20]}>
      <Col span={12}>
        <Card title="语义色彩">
          <div className="token-grid">
            {colorItems.map(([name, value]) => (
              <div className="color-token" key={name}>
                <span style={{ background: value }} />
                <div>
                  <strong>{name}</strong>
                  <code>{value}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Col>
      <Col span={12}>
        <Card title="基础尺寸">
          <Descriptions
            column={1}
            items={[
              {
                key: "spacing",
                label: "间距",
                children: Object.values(spacing).join(" / ")
              },
              {
                key: "radii",
                label: "圆角",
                children: Object.values(radii).join(" / ")
              },
              {
                key: "hierarchy",
                label: "信息顺序",
                children:
                  "当前任务 → 下一步 → 风险异常 → 业务信息 → Agent依据 → 技术详情"
              }
            ]}
          />
        </Card>
        <Card title="公共组件" style={{ marginTop: 16 }}>
          <Flex gap={8} wrap>
            <Button type="primary">主要操作</Button>
            <Button>次要操作</Button>
            <Button danger>风险操作</Button>
            <Tag color="purple">Agent建议</Tag>
            <Tag color="blue">确定性规则</Tag>
            <Tag color="green">人工已确认</Tag>
            <Tag color="red">高风险</Tag>
          </Flex>
        </Card>
      </Col>
    </Row>
  );
}
