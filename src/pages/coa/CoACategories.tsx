import React, { useState } from 'react';
import { Card, Table, Input, Button, Dropdown, Breadcrumb, Checkbox } from 'antd';
import { SearchOutlined, PrinterOutlined, DownloadOutlined, UploadOutlined, MoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import './CoACategories.css';

interface CoACategory {
  key: string;
  coaName: string;
  categoryNumber: number;
  values: number;
}

const CoACategories: React.FC = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

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

  const columns: ColumnsType<CoACategory> = [
    {
      title: 'CoA Name',
      dataIndex: 'coaName',
      key: 'coaName',
      render: (text) => <span className="coa-name-link">{text}</span>,
    },
    {
      title: 'Category Number',
      dataIndex: 'categoryNumber',
      key: 'categoryNumber',
    },
    {
      title: 'Values',
      dataIndex: 'values',
      key: 'values',
    },
    {
      title: '',
      key: 'action',
      width: 60,
      align: 'center',
      render: () => (
        <Dropdown menu={{ items: actionMenuItems }} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} className="row-action-btn" />
        </Dropdown>
      ),
    },
  ];

  const data: CoACategory[] = [
    { key: '1', coaName: 'Category 1', categoryNumber: 1, values: 1 },
    { key: '2', coaName: 'Category 2', categoryNumber: 2, values: 2 },
    { key: '3', coaName: 'Category 3', categoryNumber: 3, values: 3 },
    { key: '4', coaName: 'Category 4', categoryNumber: 4, values: 4 },
    { key: '5', coaName: 'Category 5', categoryNumber: 5, values: 5 },
    { key: '6', coaName: 'Category 6', categoryNumber: 6, values: 6 },
    { key: '7', coaName: 'Category 7', categoryNumber: 7, values: 7 },
    { key: '8', coaName: 'Category 8', categoryNumber: 8, values: 8 },
    { key: '9', coaName: 'Category 9', categoryNumber: 9, values: 9 },
    { key: '10', coaName: 'Category 10', categoryNumber: 10, values: 10 },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="coa-categories-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Dashboard</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>CoA</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">CoA Categories</h1>
      </div>

      {/* Main Content Card */}
      <Card className="coa-categories-card">
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
          rowSelection={rowSelection}
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

export default CoACategories;
