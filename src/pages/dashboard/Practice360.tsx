import React, { useState } from 'react';
import { Card, Select, Table, Tag, Progress, Input, Row, Col } from 'antd';
import { UserOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined } from '@ant-design/icons';
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
import './Practice360.css';

const { Option } = Select;

// Mock Data
const usersByRoleData = [
  { role: 'Support', count: 4 },
  { role: 'Admin', count: 22 },
  { role: 'Finance', count: 5 },
  { role: 'Manager', count: 8 },
  { role: 'Manager2', count: 11 },
  { role: 'Manager3', count: 2 },
  { role: 'HR', count: 6 },
  { role: 'Practitioner', count: 1 },
];

const dailyLoginData = [
  { date: '12/18/2025', count: 0, hour: 0 },
  { date: '12/19/2025', count: 0, hour: 0 },
  { date: '12/20/2025', count: 0, hour: 0 },
  { date: '12/21/2025', count: 0, hour: 0 },
  { date: '12/22/2025', count: 0, hour: 0 },
  { date: '12/23/2025', count: 4, hour: 2 },
  { date: '12/24/2025', count: 0, hour: 0 },
  { date: '12/25/2025', count: 0, hour: 0 },
];

interface RecentUser {
  key: string;
  name: string;
  role: string;
  lastLogin: string;
  status: 'Active' | 'Inactive';
}

const recentUsers: RecentUser[] = [
  { key: '1', name: 'TS', role: 'Admin, Finance, Hr, Manager', lastLogin: '2025-12-24 16:57', status: 'Active' },
  { key: '2', name: 'M S', role: 'Manager', lastLogin: '2025-12-24 16:35', status: 'Active' },
  { key: '3', name: 'Charles Ford', role: 'Admin, Manager, Operation', lastLogin: '2025-12-24 15:53', status: 'Active' },
  { key: '4', name: 'H M', role: 'Dentist', lastLogin: '2025-12-24 12:59', status: 'Active' },
  { key: '5', name: 'P T', role: 'Dentist', lastLogin: '2025-12-24 11:49', status: 'Active' },
  { key: '6', name: 'Peter JL', role: 'Admin, Finance, Hr, Manager', lastLogin: '2025-12-24 11:03', status: 'Active' },
  { key: '7', name: 'B S', role: 'Dentist', lastLogin: '2025-12-24 10:15', status: 'Active' },
  { key: '8', name: 'Jenny Verma', role: 'Admin, Finance, Hr, Operation', lastLogin: '2025-12-24 01:17', status: 'Active' },
];

interface SystemData {
  key: string;
  name: string;
  users: number;
  nhsData: { status: 'Fail' | 'Success'; time: string };
  financeSystem: { status: 'Fail' | 'Success'; time: string };
  pmsConnections: { status: 'Fail' | 'Success'; time: string };
}

const systemData: SystemData[] = [
  {
    key: '1',
    name: 'R C Dental Surgery',
    users: 8,
    nhsData: { status: 'Fail', time: '2025-12-26 00:00' },
    financeSystem: { status: 'Fail', time: '2025-12-26 00:00' },
    pmsConnections: { status: 'Fail', time: '2025-12-26 00:00' }
  },
  {
    key: '2',
    name: 'M B Dental',
    users: 9,
    nhsData: { status: 'Fail', time: '2025-12-26 00:00' },
    financeSystem: { status: 'Fail', time: '2025-12-26 00:00' },
    pmsConnections: { status: 'Fail', time: '2025-12-26 00:00' }
  },
  {
    key: '3',
    name: 'Kit Kat Bigskytime Culture',
    users: 5,
    nhsData: { status: 'Fail', time: '2025-12-26 00:00' },
    financeSystem: { status: 'Fail', time: '2025-12-26 00:00' },
    pmsConnections: { status: 'Fail', time: '2025-12-26 00:00' }
  },
  {
    key: '4',
    name: 'Skyline Dental Clinic',
    users: 2,
    nhsData: { status: 'Fail', time: '2025-12-26 00:00' },
    financeSystem: { status: 'Fail', time: '2025-12-26 00:00' },
    pmsConnections: { status: 'Fail', time: '2025-12-26 00:00' }
  },
  {
    key: '5',
    name: 'Denodent Practice',
    users: 4,
    nhsData: { status: 'Fail', time: '2025-12-26 00:00' },
    financeSystem: { status: 'Fail', time: '2025-12-26 00:00' },
    pmsConnections: { status: 'Fail', time: '2025-12-26 00:00' }
  },
];

interface PermissionData {
  key: string;
  name: string;
  role: string;
  accessScope: string;
  modified: string;
  permissions: string[];
}

const permissionsData: PermissionData[] = [
  { key: '1', name: 'A S', role: 'Dentist', accessScope: 'paysheet, practitioner...', modified: 'N/A', permissions: ['ClinicianViewSummary', 'ClinicianViewSummary', 'WorkInvoiceView'] },
  { key: '2', name: 'CG', role: 'Manager', accessScope: 'clinician, clinicianusers, contract, crosscharge...', modified: 'CG', permissions: ['Add', 'Details', 'Edit', 'List'] },
  { key: '3', name: 'B S', role: 'Dentist', accessScope: 'paysheet, practitioner...', modified: 'B S', permissions: ['ClinicianViewSummary', 'ClinicianViewSummary', 'List', 'WorkInvoiceView'] },
  { key: '4', name: 'P F', role: 'Dentist', accessScope: 'paysheet, practitioner...', modified: 'P F', permissions: ['ClinicianViewSummary', 'ClinicianViewSummary', 'WorkInvoiceView'] },
  { key: '5', name: 'N R', role: 'Dentist', accessScope: 'paysheet, practitioner...', modified: 'N/A', permissions: ['ClinicianViewSummary', 'ClinicianViewSummary'] },
  { key: '6', name: 'Jerry Hensley', role: 'Admin', accessScope: '-', modified: 'N/A', permissions: [] },
  { key: '7', name: 'E T', role: 'Dentist', accessScope: 'paysheet, practitioner...', modified: 'N/A', permissions: ['ClinicianViewSummary', 'ClinicianViewSummary', 'List', 'WorkInvoiceView'] },
  { key: '8', name: 'B J', role: 'Dentist', accessScope: 'paysheet, practitioner...', modified: 'N/A', permissions: ['ClinicianViewSummary', 'ClinicianViewSummary', 'List', 'WorkInvoiceView'] },
];

const Practice360: React.FC = () => {
  const [selectedClient, setSelectedClient] = useState('all');
  const [loginMetric, setLoginMetric] = useState<'count' | 'hour'>('count');

  const recentUserColumns: ColumnsType<RecentUser> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: 'Active' | 'Inactive') => (
        <Tag color={status === 'Active' ? 'success' : 'default'} style={{ borderRadius: 6 }}>
          {status}
        </Tag>
      ),
    },
  ];

  const systemColumns: ColumnsType<SystemData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
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
      title: 'NHS Data',
      dataIndex: 'nhsData',
      key: 'nhsData',
      render: (data) => (
        <div>
          <Tag color="error" icon={<CloseCircleOutlined />} style={{ borderRadius: 6 }}>
            {data.status}
          </Tag>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{data.time}</div>
        </div>
      ),
    },
    {
      title: 'Financial Systems',
      dataIndex: 'financeSystem',
      key: 'financeSystem',
      render: (data) => (
        <div>
          <Tag color="error" icon={<CloseCircleOutlined />} style={{ borderRadius: 6 }}>
            {data.status}
          </Tag>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{data.time}</div>
        </div>
      ),
    },
    {
      title: 'PMS Connections',
      dataIndex: 'pmsConnections',
      key: 'pmsConnections',
      render: (data) => (
        <div>
          <Tag color="error" icon={<CloseCircleOutlined />} style={{ borderRadius: 6 }}>
            {data.status}
          </Tag>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{data.time}</div>
        </div>
      ),
    },
  ];

  const permissionColumns: ColumnsType<PermissionData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Access Scope',
      dataIndex: 'accessScope',
      key: 'accessScope',
      render: (text) => <span style={{ color: '#6B7280', fontSize: 13 }}>{text}</span>,
    },
    {
      title: 'Modified',
      dataIndex: 'modified',
      key: 'modified',
    },
    {
      title: 'Permissions',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (permissions: string[]) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {permissions.map((perm, idx) => (
            <Tag key={idx} color="purple" style={{ borderRadius: 6, fontSize: 11 }}>
              {perm}
            </Tag>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="practice360-container">
      {/* Header */}
      <div className="practice360-header">
        <h1 className="practice360-title">Practice 360</h1>
        <Select
          value={selectedClient}
          onChange={setSelectedClient}
          style={{ width: 200 }}
          size="large"
        >
          <Option value="all">All Clients</Option>
          <Option value="client1">Client 1</Option>
          <Option value="client2">Client 2</Option>
        </Select>
      </div>

      {/* User Management Summary */}
      <Card className="summary-card" title="User Management Summary">
        <Row gutter={24}>
          <Col xs={24} sm={8}>
            <div className="stat-box">
              <div className="stat-icon" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.2))' }}>
                <UserOutlined style={{ color: '#6366F1', fontSize: 24 }} />
              </div>
              <div>
                <div className="stat-label">Total Users</div>
                <div className="stat-value">40</div>
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
                <div className="stat-value" style={{ color: '#22C55E' }}>39</div>
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
                <div className="stat-value" style={{ color: '#EF4444' }}>1</div>
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
              <BarChart data={usersByRoleData}>
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
              <LineChart data={dailyLoginData}>
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

      {/* Recent User Activity */}
      <Card
        title="Recent User Activity"
        className="table-card"
        extra={
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 250 }}
          />
        }
      >
        <Table
          columns={recentUserColumns}
          dataSource={recentUsers}
          pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
          size="middle"
        />
      </Card>

      {/* System Overview */}
      <Card
        title="System Overview"
        className="table-card"
        extra={
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 250 }}
          />
        }
      >
        <Row gutter={24} className="system-progress-row">
          <Col xs={24} md={8}>
            <div className="progress-circle-container">
              <Progress
                type="circle"
                percent={100}
                strokeColor="#EF4444"
                format={() => '100%'}
                width={120}
              />
              <div className="progress-label">NHS Data</div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="progress-circle-container">
              <Progress
                type="circle"
                percent={100}
                strokeColor="#EF4444"
                format={() => '100%'}
                width={120}
              />
              <div className="progress-label">Finance System</div>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div className="progress-circle-container">
              <Progress
                type="circle"
                percent={100}
                strokeColor="#EF4444"
                format={() => '100%'}
                width={120}
              />
              <div className="progress-label">PMS Connections</div>
            </div>
          </Col>
        </Row>
        <Table
          columns={systemColumns}
          dataSource={systemData}
          pagination={{ pageSize: 5, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
          size="middle"
        />
      </Card>

      {/* Permissions */}
      <Card
        title="Permissions"
        className="table-card"
        extra={
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 250 }}
          />
        }
      >
        <Table
          columns={permissionColumns}
          dataSource={permissionsData}
          pagination={{ pageSize: 8, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default Practice360;
