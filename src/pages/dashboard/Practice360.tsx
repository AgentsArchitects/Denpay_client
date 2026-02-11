import React, { useState, useEffect } from 'react';
import { Card, Select, Table, Tag, Progress, Row, Col, Spin, Alert, Button } from 'antd';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import dashboardService from '../../services/dashboardService';
import type {
  DashboardData,
  RecentClient,
  PracticeSystemOverview,
  InvitationInfo,
} from '../../services/dashboardService';
import './Practice360.css';

const { Option } = Select;

const Practice360: React.FC = () => {
  const [selectedClient, setSelectedClient] = useState('all');
  const [loginMetric, setLoginMetric] = useState<'count' | 'hour'>('count');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getStats(
        selectedClient === 'all' ? undefined : selectedClient
      );
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedClient]);

  const recentClientColumns: ColumnsType<RecentClient> = [
    {
      title: 'Client Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Contact',
      dataIndex: 'contact_name',
      key: 'contact_name',
    },
    {
      title: 'Email',
      dataIndex: 'contact_email',
      key: 'contact_email',
      render: (text) => <span style={{ color: '#6B7280', fontSize: 13 }}>{text}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          'Active': 'success',
          'Accepted': 'success',
          'Pending Invite': 'processing',
          'Expired': 'error',
          'Inactive': 'default',
        };
        return (
          <Tag color={colorMap[status] || 'default'} style={{ borderRadius: 6 }}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Onboarded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => <span style={{ color: '#6B7280', fontSize: 13 }}>{text || 'N/A'}</span>,
    },
  ];

  const systemColumns: ColumnsType<PracticeSystemOverview> = [
    {
      title: 'Practice',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Client',
      dataIndex: 'tenant_name',
      key: 'tenant_name',
      render: (text) => <span style={{ color: '#6B7280', fontSize: 13 }}>{text}</span>,
    },
    {
      title: 'Users',
      dataIndex: 'users',
      key: 'users',
      render: (count) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6366F1' }}>
          <UserOutlined />
          <span>{count}</span>
        </div>
      ),
    },
    {
      title: 'Xero / Finance',
      dataIndex: 'xero_connection',
      key: 'xero_connection',
      render: (data) => (
        <div>
          <Tag
            color={data.status === 'Success' ? 'success' : 'error'}
            icon={data.status === 'Success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            style={{ borderRadius: 6 }}
          >
            {data.status}
          </Tag>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{data.time}</div>
        </div>
      ),
    },
    {
      title: 'PMS Connections',
      dataIndex: 'pms_connection',
      key: 'pms_connection',
      render: (data) => (
        <div>
          <Tag
            color={data.status === 'Success' ? 'success' : 'error'}
            icon={data.status === 'Success' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            style={{ borderRadius: 6 }}
          >
            {data.status}
          </Tag>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{data.time}</div>
        </div>
      ),
    },
  ];

  const invitationColumns: ColumnsType<InvitationInfo> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <span style={{ color: '#6B7280', fontSize: 13 }}>{text}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role_type',
      key: 'role_type',
      render: (text) => (
        <Tag color="purple" style={{ borderRadius: 6, fontSize: 11 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          'Accepted': 'success',
          'Pending': 'processing',
          'Expired': 'error',
        };
        return (
          <Tag color={colorMap[status] || 'default'} style={{ borderRadius: 6 }}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Invited',
      dataIndex: 'invited_at',
      key: 'invited_at',
      render: (text) => <span style={{ color: '#6B7280', fontSize: 13 }}>{text || 'N/A'}</span>,
    },
    {
      title: 'Expires',
      dataIndex: 'expires_at',
      key: 'expires_at',
      render: (text) => <span style={{ color: '#6B7280', fontSize: 13 }}>{text || 'N/A'}</span>,
    },
  ];

  if (loading && !dashboardData) {
    return (
      <div className="practice360-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spin size="large" tip="Loading dashboard..." />
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="practice360-container">
        <Alert
          type="error"
          message="Dashboard Error"
          description={error}
          action={<Button icon={<ReloadOutlined />} onClick={fetchDashboardData}>Retry</Button>}
          showIcon
        />
      </div>
    );
  }

  const stats = dashboardData?.client_stats;
  const xeroPct = dashboardData?.system_overview_summary.xero_connected_pct ?? 0;
  const pmsPct = dashboardData?.system_overview_summary.pms_connected_pct ?? 0;

  return (
    <div className="practice360-container">
      {/* Header */}
      <div className="practice360-header">
        <h1 className="practice360-title">Practice 360</h1>
        <Select
          value={selectedClient}
          onChange={setSelectedClient}
          style={{ width: 250 }}
          size="large"
          loading={loading}
        >
          <Option value="all">All Clients</Option>
          {dashboardData?.clients.map((c) => (
            <Option key={c.tenant_id} value={c.tenant_id}>
              {c.legal_trading_name}
            </Option>
          ))}
        </Select>
      </div>

      {/* Client Management Summary */}
      <Card className="summary-card" title="Client Management Summary">
        <Row gutter={24}>
          <Col xs={24} sm={8}>
            <div className="stat-box">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.2))' }}>
                <TeamOutlined style={{ color: '#6366F1', fontSize: 24 }} />
              </div>
              <div>
                <div className="stat-label">Total Clients</div>
                <div className="stat-value">{stats?.total_clients ?? 0}</div>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className="stat-box">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.2))' }}>
                <CheckCircleOutlined style={{ color: '#22C55E', fontSize: 24 }} />
              </div>
              <div>
                <div className="stat-label">Active</div>
                <div className="stat-value" style={{ color: '#22C55E' }}>{stats?.active_clients ?? 0}</div>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <div className="stat-box">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.2))' }}>
                <CloseCircleOutlined style={{ color: '#EF4444', fontSize: 24 }} />
              </div>
              <div>
                <div className="stat-label">Inactive</div>
                <div className="stat-value" style={{ color: '#EF4444' }}>{stats?.inactive_clients ?? 0}</div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Charts Section */}
      <Row gutter={24} className="charts-row">
        <Col xs={24} lg={12}>
          <Card title="Users By Role" className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData?.users_by_role || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="role" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Daily Login Activity"
            className="chart-card"
            extra={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Tag color={loginMetric === 'count' ? 'purple' : 'default'} style={{ cursor: 'pointer', borderRadius: 6 }} onClick={() => setLoginMetric('count')}>
                  Count
                </Tag>
                <Tag color={loginMetric === 'hour' ? 'success' : 'default'} style={{ cursor: 'pointer', borderRadius: 6 }} onClick={() => setLoginMetric('hour')}>
                  Hour
                </Tag>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dashboardData?.daily_login_activity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey={loginMetric} stroke="#22C55E" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Recent Client Onboarding */}
      <Card
        title="Recent Client Onboarding"
        className="table-card"
        extra={
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={fetchDashboardData}
            loading={loading}
          >
            Refresh
          </Button>
        }
      >
        <Table
          columns={recentClientColumns}
          dataSource={dashboardData?.recent_clients || []}
          pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
          size="middle"
          rowKey="key"
        />
      </Card>

      {/* System Overview */}
      <Card
        title="System Overview"
        className="table-card"
      >
        <Row gutter={24} className="system-progress-row">
          <Col xs={24} md={12}>
            <div className="progress-circle-container">
              <Progress
                type="circle"
                percent={xeroPct}
                strokeColor={xeroPct > 50 ? '#22C55E' : '#EF4444'}
                format={() => `${xeroPct}%`}
                width={120}
              />
              <div className="progress-label">Xero / Finance</div>
            </div>
          </Col>
          <Col xs={24} md={12}>
            <div className="progress-circle-container">
              <Progress
                type="circle"
                percent={pmsPct}
                strokeColor={pmsPct > 50 ? '#22C55E' : '#EF4444'}
                format={() => `${pmsPct}%`}
                width={120}
              />
              <div className="progress-label">PMS Connections</div>
            </div>
          </Col>
        </Row>
        <Table
          columns={systemColumns}
          dataSource={dashboardData?.practice_system_overview || []}
          pagination={{ pageSize: 5, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
          size="middle"
          rowKey="key"
        />
      </Card>

      {/* Invitations */}
      <Card
        title="Invitations"
        className="table-card"
      >
        <Table
          columns={invitationColumns}
          dataSource={dashboardData?.invitations || []}
          pagination={{ pageSize: 8, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
          size="middle"
          rowKey="key"
        />
      </Card>
    </div>
  );
};

export default Practice360;
