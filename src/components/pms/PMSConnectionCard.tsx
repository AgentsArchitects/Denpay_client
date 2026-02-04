import React, { useState } from 'react';
import { Card, Tag, Button, Space, Popconfirm, message, Descriptions, Badge } from 'antd';
import {
  SyncOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import pmsService, { PMSConnection } from '../../services/pmsService';

interface PMSConnectionCardProps {
  connection: PMSConnection;
  onSync?: (connection: PMSConnection) => void;
  onDelete?: (connectionId: string) => void;
  onRefresh?: () => void;
}

const PMSConnectionCard: React.FC<PMSConnectionCardProps> = ({
  connection,
  onSync,
  onDelete,
  onRefresh,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      message.loading({ content: 'Starting sync...', key: 'sync' });
      await pmsService.syncConnection(connection.id);
      message.success({ content: 'Sync started. Check sync history for progress.', key: 'sync' });
      if (onSync) onSync(connection);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      message.error({
        content: error.message || 'Sync failed',
        key: 'sync',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await pmsService.deleteConnection(connection.id);
      message.success('Connection deleted successfully');
      if (onDelete) onDelete(connection.id);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      message.error(error.message || 'Failed to delete connection');
      setDeleting(false);
    }
  };

  const getStatusBadge = () => {
    const status = connection.connection_status || 'active';
    const statusConfig: Record<
      string,
      { status: 'success' | 'error' | 'default' | 'processing'; text: string }
    > = {
      active: { status: 'success', text: 'Active' },
      inactive: { status: 'default', text: 'Inactive' },
      error: { status: 'error', text: 'Error' },
      syncing: { status: 'processing', text: 'Syncing' },
    };
    const config = statusConfig[status] || statusConfig.active;
    return <Badge status={config.status} text={config.text} />;
  };

  const getSyncEntities = () => {
    const entities = [];
    if (connection.sync_patients) entities.push('Patients');
    if (connection.sync_appointments) entities.push('Appointments');
    if (connection.sync_providers) entities.push('Providers');
    if (connection.sync_treatments) entities.push('Treatments');
    return entities;
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>{connection.integration_name}</span>
          {getStatusBadge()}
        </Space>
      }
      extra={
        <Space>
          <Button
            type="text"
            size="small"
            icon={<SyncOutlined spin={syncing} />}
            onClick={handleSync}
            loading={syncing}
            disabled={connection.connection_status === 'inactive'}
          >
            Sync
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this connection?"
            onConfirm={handleDelete}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={deleting}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <Descriptions size="small" column={1}>
        <Descriptions.Item label="Integration ID">
          <Tag color="purple" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
            {connection.integration_id}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="PMS Type">
          <Tag color="blue">{connection.pms_type}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Sync Entities">
          {getSyncEntities().map((entity) => (
            <Tag key={entity} style={{ marginRight: 4 }}>
              {entity}
            </Tag>
          ))}
        </Descriptions.Item>
        {connection.last_sync_at && (
          <Descriptions.Item label="Last Sync">
            <Space direction="vertical" size={0}>
              <span>{new Date(connection.last_sync_at).toLocaleString()}</span>
              <Tag
                color={connection.last_sync_status === 'success' ? 'success' : 'error'}
              >
                {connection.last_sync_status}
              </Tag>
              {connection.last_sync_records_count && (
                <small>{connection.last_sync_records_count} records</small>
              )}
            </Space>
          </Descriptions.Item>
        )}
        {connection.last_sync_error && (
          <Descriptions.Item label="Last Error">
            <span style={{ color: '#ff4d4f', fontSize: '12px' }}>
              {connection.last_sync_error}
            </span>
          </Descriptions.Item>
        )}
      </Descriptions>
    </Card>
  );
};

export default PMSConnectionCard;
