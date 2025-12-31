import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Breadcrumb, Tag, Modal, message } from 'antd';
import { PlusOutlined, EditOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import './CompassDatesList.css';

interface CompassData {
  key: string;
  month: string;
  scheduledPeriod: string;
  lastDayAdjustments: string;
  processingCutOffDate: string;
  payStatementsAvailable: string;
  payDate: string;
  status: 'Active' | 'Inactive';
}

const { confirm } = Modal;

const CompassDatesList: React.FC = () => {
  const navigate = useNavigate();
  const [compassDates, setCompassDates] = useState<CompassData[]>([]);

  // Initial default compass dates
  const defaultDates: CompassData[] = [
    {
      key: '1',
      month: 'Dec 25',
      scheduledPeriod: '2025601',
      lastDayAdjustments: 'Wed 24 Dec',
      processingCutOffDate: 'Wed 24 Dec',
      payStatementsAvailable: 'Fri 26 Dec',
      payDate: 'Fri 9 Jan',
      status: 'Active'
    },
    {
      key: '2',
      month: 'Apr 24',
      scheduledPeriod: '2025602',
      lastDayAdjustments: 'Thu 17 Apr',
      processingCutOffDate: 'Tue 22 Apr',
      payStatementsAvailable: 'Wed 30 Apr',
      payDate: 'Thu 1 May',
      status: 'Active'
    },
    {
      key: '3',
      month: 'May 25',
      scheduledPeriod: '2025603',
      lastDayAdjustments: 'Mon 16 Jun',
      processingCutOffDate: 'Tue 17 Jun',
      payStatementsAvailable: 'Mon 30 Jun',
      payDate: 'Tue 1 Jul',
      status: 'Active'
    }
  ];

  // Load compass dates from localStorage on mount
  useEffect(() => {
    const storedDates = localStorage.getItem('compassDates');
    if (storedDates) {
      setCompassDates(JSON.parse(storedDates));
    } else {
      localStorage.setItem('compassDates', JSON.stringify(defaultDates));
      setCompassDates(defaultDates);
    }
  }, []);

  const handleDelete = (record: CompassData) => {
    confirm({
      title: 'Delete Compass Date',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete ${record.month}?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        const updatedDates = compassDates.filter(date => date.key !== record.key);
        setCompassDates(updatedDates);
        localStorage.setItem('compassDates', JSON.stringify(updatedDates));
        message.success('Compass date deleted successfully');
      },
    });
  };

  const columns: ColumnsType<CompassData> = [
    {
      title: 'Month',
      dataIndex: 'month',
      key: 'month',
      width: 100,
    },
    {
      title: 'Scheduled Period',
      dataIndex: 'scheduledPeriod',
      key: 'scheduledPeriod',
      width: 150,
    },
    {
      title: 'Last Day of Adjustments',
      dataIndex: 'lastDayAdjustments',
      key: 'lastDayAdjustments',
      width: 180,
    },
    {
      title: 'Processing Cut Off Date',
      dataIndex: 'processingCutOffDate',
      key: 'processingCutOffDate',
      width: 180,
    },
    {
      title: 'Pay Statements Available',
      dataIndex: 'payStatementsAvailable',
      key: 'payStatementsAvailable',
      width: 180,
    },
    {
      title: 'Pay Date',
      dataIndex: 'payDate',
      key: 'payDate',
      width: 120,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color="success" className="status-tag">
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          className="action-btn edit-btn"
          onClick={() => navigate(`/compass/edit/${record.key}`)}
        />
      ),
    },
  ];

  return (
    <div className="compass-dates-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Accounts</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/compass/list">Users</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>List</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Compass Dates Listing</h1>
        <div className="header-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="add-new-btn"
            onClick={() => navigate('/compass/create')}
          >
            Add New
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="compass-dates-card">
        <Table
          columns={columns}
          dataSource={compassDates}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            position: ['bottomRight'],
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default CompassDatesList;
