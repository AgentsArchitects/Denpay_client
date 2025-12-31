import React, { useState } from 'react';
import { Card, Table, Input, Select, Button, Tabs, Dropdown, Menu, Breadcrumb } from 'antd';
import { SearchOutlined, PlusOutlined, PrinterOutlined, DownloadOutlined, UploadOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import './XeroList.css';

const { Option } = Select;

interface XeroIntegration {
  key: string;
  id: string;
  integrationName: string;
  status: 'Active' | 'Unauthenticated' | 'Removed';
}

const XeroList: React.FC = () => {
  const [selectedDental, setSelectedDental] = useState('dental-care');
  const [activeTab, setActiveTab] = useState('all');

  const dentalOptions = [
    { value: 'dental-care', label: 'Dental Care' },
    { value: 'sixsigma-hospital', label: 'SIXSIGMA Hospital' },
    { value: 'horizon-hospital', label: 'Horizon Hospital' },
    { value: 'bright-orthodontics', label: 'Bright Orthodontics Ltd' },
    { value: 'six-sigma-hospital', label: 'Six Sigma Hospital' },
    { value: 'umega-textiles', label: 'Umega Textiles' },
    { value: 'esk-healthcare', label: 'ESK Healthcare Group Ltd' }
  ];

  const actionMenuItems = [
    {
      key: 'print',
      icon: <PrinterOutlined />,
      label: 'Print',
    },
    {
      key: 'import',
      icon: <UploadOutlined />,
      label: 'Import',
    },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: 'Export',
    }
  ];

  const columns: ColumnsType<XeroIntegration> = [
    {
      title: 'Id',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: 'Integration Name',
      dataIndex: 'integrationName',
      key: 'integrationName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <span className={`status-badge status-${status.toLowerCase()}`}>
          {status}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      align: 'center',
      render: () => (
        <Dropdown menu={{ items: actionMenuItems }} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // Mock data - empty for now
  const data: XeroIntegration[] = [];

  const tabItems = [
    {
      key: 'all',
      label: `All ${data.length}`,
    },
    {
      key: 'active',
      label: `Active 0`,
    },
    {
      key: 'unauthenticated',
      label: `Unauthenticated 0`,
    },
    {
      key: 'removed',
      label: `Removed 0`,
    },
  ];

  return (
    <div className="xero-list-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Dashboard</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/xero">Xero</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>List</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">List</h1>
        <div className="header-actions">
          <Select
            value={selectedDental}
            onChange={setSelectedDental}
            style={{ width: 250 }}
            size="large"
          >
            {dentalOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="connect-btn"
          >
            Connect to Xero
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="xero-list-card">
        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="xero-tabs"
        />

        {/* Search and Actions */}
        <div className="table-toolbar">
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 300 }}
            className="search-input"
          />
          <Dropdown menu={{ items: actionMenuItems }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} className="action-dots-btn" />
          </Dropdown>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data}
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            position: ['bottomRight'],
          }}
          locale={{
            emptyText: (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p className="empty-text">No data</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default XeroList;
