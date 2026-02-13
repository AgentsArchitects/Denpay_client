import React, { useState } from 'react';
import { Card, Table, Input, Breadcrumb, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link, useParams } from 'react-router-dom';
import './ClientOnboardingUsers.css';

interface UserData {
  key: string;
  name: string;
  email: string;
  roles: string;
  status: 'Active' | 'Inactive';
}

const ClientOnboardingUsers: React.FC = () => {
  const { clientId } = useParams();

  const columns: ColumnsType<UserData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div className="user-name">{text}</div>
          <div className="user-email">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
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
  ];

  const data: UserData[] = [
    {
      key: '1',
      name: 'John Deo',
      email: 'Johnd12356@mailinator.com',
      roles: 'Client Admin',
      status: 'Active'
    },
  ];

  return (
    <div className="client-users-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/onboarding">Client Onboarding</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/onboarding">Users</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>List</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Client Onboarding List</h1>
      </div>

      {/* Main Content Card */}
      <Card className="client-users-card">
        {/* Tab and Search */}
        <div className="users-header">
          <div className="users-tab">
            <span className="tab-item active">All <span className="tab-count">{data.length}</span></span>
          </div>
          <Input
            placeholder="Search"
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 250 }}
            className="search-input"
          />
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

export default ClientOnboardingUsers;
