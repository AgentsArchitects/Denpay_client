import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Tag,
  message,
  Select,
  Input,
  Card,
  Popconfirm,
  Tooltip,
  Badge,
} from 'antd';
import {
  SyncOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import pmsService, { PMSConnection } from '../../services/pmsService';

const { Search } = Input;

const PMSConnectionList: React.FC = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<PMSConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState<{
    client_id?: string;
    pms_type?: string;
    status?: string;
  }>({});

  useEffect(() => {
    fetchConnections();
  }, [pagination.current, pagination.pageSize, filters]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const response = await pmsService.listConnections({
        ...filters,
        page: pagination.current,
        page_size: pagination.pageSize,
      });
      setConnections(response.data);
      setPagination({
        ...pagination,
        total: response.total,
      });
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch PMS connections');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      ...pagination,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleSync = async (connection: PMSConnection) => {
    try {
      message.loading({ content: 'Starting sync...', key: 'sync' });
      await pmsService.syncConnection(connection.id);
      message.success({ content: 'Sync started successfully', key: 'sync' });
      fetchConnections();
    } catch (error: any) {
      message.error({ content: error.message || 'Failed to start sync', key: 'sync' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pmsService.deleteConnection(id);
      message.success('Connection deactivated successfully');
      fetchConnections();
    } catch (error: any) {
      message.error(error.message || 'Failed to deactivate connection');
    }
  };

  const getPMSTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      SOE: 'blue',
      DENTALLY: 'green',
      SFD: 'orange',
      CARESTACK: 'purple',
    };
    return colors[type] || 'default';
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'inactive':
        return <CloseCircleOutlined style={{ color: '#d9d9d9' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'syncing':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
  };

  const columns: ColumnsType<PMSConnection> = [
    {
      title: 'Status',
      dataIndex: 'connection_status',
      key: 'connection_status',
      width: 80,
      render: (status) => (
        <Tooltip title={status || 'active'}>
          {getStatusIcon(status)}
        </Tooltip>
      ),
    },
    {
      title: 'Integration Name',
      dataIndex: 'integration_name',
      key: 'integration_name',
      render: (text, record) => (
        <a onClick={() => navigate(`/pms/connections/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: 'Tenant Name',
      dataIndex: 'tenant_name',
      key: 'tenant_name',
      width: 180,
      render: (text) => text || '-',
    },
    {
      title: 'PMS Type',
      dataIndex: 'pms_type',
      key: 'pms_type',
      width: 120,
      render: (type) => <Tag color={getPMSTypeColor(type)}>{type}</Tag>,
    },
    {
      title: 'Sync Entities',
      key: 'sync_entities',
      width: 180,
      render: (_, record) => {
        const entities = [];
        if (record.sync_patients) entities.push('Patients');
        if (record.sync_appointments) entities.push('Appointments');
        if (record.sync_providers) entities.push('Providers');
        if (record.sync_treatments) entities.push('Treatments');
        return entities.join(', ') || '-';
      },
    },
    {
      title: 'Last Sync',
      key: 'last_sync',
      width: 200,
      render: (_, record) => {
        if (!record.last_sync_at) return '-';
        const date = new Date(record.last_sync_at).toLocaleString();
        const statusColor =
          record.last_sync_status === 'success' ? 'success' : 'error';
        return (
          <div>
            <div>{date}</div>
            <Tag color={statusColor}>{record.last_sync_status}</Tag>
            {record.last_sync_records_count && (
              <small>{record.last_sync_records_count} records</small>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/pms/connections/${record.id}`)}
            />
          </Tooltip>
          <Tooltip title="Sync Now">
            <Button
              type="text"
              icon={<SyncOutlined />}
              onClick={() => handleSync(record)}
              disabled={record.connection_status === 'inactive'}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to deactivate this connection?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Deactivate">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <h2>PMS Connections</h2>
          </div>

          <Space style={{ marginBottom: 16 }}>
            <Select
              placeholder="Filter by PMS Type"
              style={{ width: 200 }}
              allowClear
              onChange={(value) => setFilters({ ...filters, pms_type: value })}
            >
              <Select.Option value="SOE">SOE</Select.Option>
              <Select.Option value="DENTALLY">Dentally</Select.Option>
              <Select.Option value="SFD">SFD</Select.Option>
              <Select.Option value="CARESTACK">CareStack</Select.Option>
            </Select>

            <Select
              placeholder="Filter by Status"
              style={{ width: 200 }}
              allowClear
              onChange={(value) => setFilters({ ...filters, status: value })}
            >
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
              <Select.Option value="error">Error</Select.Option>
              <Select.Option value="syncing">Syncing</Select.Option>
            </Select>

            <Button onClick={fetchConnections}>Refresh</Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={connections}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} connections`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default PMSConnectionList;
