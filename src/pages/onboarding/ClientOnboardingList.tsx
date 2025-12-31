import React, { useState } from 'react';
import { Card, Table, Input, Button, Breadcrumb, Tag } from 'antd';
import { SearchOutlined, PlusOutlined, UserOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import './ClientOnboardingList.css';

interface ClientData {
  key: string;
  tradingName: string;
  entityReference: string;
  date: string;
  status: 'Active' | 'Inactive';
}

const ClientOnboardingList: React.FC = () => {
  const navigate = useNavigate();

  const columns: ColumnsType<ClientData> = [
    {
      title: 'Legal Client Trading Name',
      dataIndex: 'tradingName',
      key: 'tradingName',
      render: (text) => <span className="client-name-link">{text}</span>,
    },
    {
      title: 'WorkFin Legal Entity Reference',
      dataIndex: 'entityReference',
      key: 'entityReference',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="success" className="status-tag">
          {status}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <div className="action-buttons">
          <Button
            type="text"
            icon={<UserOutlined />}
            className="action-btn user-btn"
            onClick={() => navigate(`/onboarding/${record.key}/users`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            className="action-btn edit-btn"
            onClick={() => navigate(`/onboarding/edit/${record.key}`)}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            className="action-btn delete-btn"
          />
        </div>
      ),
    },
  ];

  const data: ClientData[] = [
    { key: '1', tradingName: 'Dental Care', entityReference: 'DEN2237', date: '24/12/2025', status: 'Active' },
    { key: '2', tradingName: 'SIXSIGMA Hospital', entityReference: 'SIX3390', date: '24/12/2025', status: 'Active' },
    { key: '3', tradingName: 'Horizon Hospital', entityReference: 'HOR8377', date: '24/12/2025', status: 'Active' },
    { key: '4', tradingName: 'Bright Orthodontics Ltd', entityReference: 'BRI7081', date: '18/11/2025', status: 'Active' },
    { key: '5', tradingName: 'Six Sigma Hospital', entityReference: 'SIX7216', date: '12/11/2025', status: 'Active' },
    { key: '6', tradingName: 'Umega Textiles', entityReference: 'UME8890', date: '12/11/2025', status: 'Active' },
    { key: '7', tradingName: 'ESK Healthcare Group Ltd', entityReference: 'ESK8603', date: '22/08/2025', status: 'Active' },
  ];

  return (
    <div className="client-onboarding-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Account Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/onboarding">User Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Client Management</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Client Management Listing</h1>
        <div className="header-actions">
          <Input
            placeholder="Search"
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 250 }}
            className="search-input"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="add-client-btn"
            onClick={() => navigate('/onboarding/create')}
          >
            Add Client
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="client-onboarding-card">
        {/* Tab */}
        <div className="client-tab">
          <span className="tab-item active">All <span className="tab-count">{data.length}</span></span>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            position: ['bottomRight'],
          }}
        />
      </Card>
    </div>
  );
};

export default ClientOnboardingList;
