import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  message,
  Table,
  Tabs,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  Switch,
} from 'antd';
import {
  ArrowLeftOutlined,
  SyncOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import pmsService, { PMSConnection, SyncHistory } from '../../services/pmsService';

const { TabPane } = Tabs;

const PMSConnectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [connection, setConnection] = useState<PMSConnection | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (id) {
      fetchConnection();
      fetchSyncHistory();
    }
  }, [id]);

  const fetchConnection = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await pmsService.getConnection(id);
      setConnection(data);
      form.setFieldsValue(data);
    } catch (error: any) {
      message.error(error.message || 'Failed to fetch connection');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncHistory = async () => {
    if (!id) return;
    try {
      const response = await pmsService.getSyncHistory(id, { page: 1, page_size: 10 });
      setSyncHistory(response.data);
    } catch (error: any) {
      console.error('Failed to fetch sync history:', error);
    }
  };

  const handleSync = async (entityType?: string) => {
    if (!id) return;
    setSyncing(true);
    try {
      message.loading({ content: 'Starting sync...', key: 'sync' });
      if (entityType) {
        await pmsService.syncEntity(id, entityType as any);
      } else {
        await pmsService.syncConnection(id);
      }
      message.success({ content: 'Sync started successfully', key: 'sync' });
      fetchConnection();
      fetchSyncHistory();
    } catch (error: any) {
      message.error({ content: error.message || 'Failed to start sync', key: 'sync' });
    } finally {
      setSyncing(false);
    }
  };

  const handleTest = async () => {
    if (!id) return;
    try {
      message.loading({ content: 'Testing connection...', key: 'test' });
      const result = await pmsService.testConnection(id);
      message.success({
        content: result.message,
        key: 'test',
      });
    } catch (error: any) {
      message.error({ content: error.message || 'Connection test failed', key: 'test' });
    }
  };

  const handleUpdate = async (values: any) => {
    if (!id) return;
    setLoading(true);
    try {
      await pmsService.updateConnection(id, values);
      message.success('Connection updated successfully');
      setEditModalVisible(false);
      fetchConnection();
    } catch (error: any) {
      message.error(error.message || 'Failed to update connection');
    } finally {
      setLoading(false);
    }
  };

  const syncHistoryColumns: ColumnsType<SyncHistory> = [
    {
      title: 'Started At',
      dataIndex: 'started_at',
      key: 'started_at',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Type',
      dataIndex: 'sync_type',
      key: 'sync_type',
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'success' ? 'success' : 'error'}>{status}</Tag>
      ),
    },
    {
      title: 'Records',
      key: 'records',
      render: (_, record) => (
        <div>
          <div>Processed: {record.records_processed || 0}</div>
          <div>Created: {record.records_created || 0}</div>
          <div>Updated: {record.records_updated || 0}</div>
          {(record.records_failed || 0) > 0 && (
            <div style={{ color: '#ff4d4f' }}>Failed: {record.records_failed}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Duration',
      dataIndex: 'duration_seconds',
      key: 'duration_seconds',
      render: (seconds) => (seconds ? `${seconds}s` : '-'),
    },
  ];

  if (!connection) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/pms/connections')}
        style={{ marginBottom: 16 }}
      >
        Back to Connections
      </Button>

      <Card title={connection.integration_name} loading={loading}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Connection Status"
                  value={connection.connection_status || 'active'}
                  prefix={
                    connection.connection_status === 'active' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    )
                  }
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Last Sync"
                  value={
                    connection.last_sync_at
                      ? new Date(connection.last_sync_at).toLocaleDateString()
                      : 'Never'
                  }
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Records Synced"
                  value={connection.last_sync_records_count || 0}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Sync Status"
                  value={connection.last_sync_status || 'N/A'}
                  valueStyle={{
                    color: connection.last_sync_status === 'success' ? '#3f8600' : '#cf1322',
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title="Actions"
            extra={
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setEditModalVisible(true)}
                >
                  Edit
                </Button>
                <Button onClick={handleTest}>Test Connection</Button>
              </Space>
            }
          >
            <Space>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                onClick={() => handleSync()}
                loading={syncing}
              >
                Sync All
              </Button>
              {connection.sync_patients && (
                <Button onClick={() => handleSync('patients')} loading={syncing}>
                  Sync Patients
                </Button>
              )}
              {connection.sync_appointments && (
                <Button onClick={() => handleSync('appointments')} loading={syncing}>
                  Sync Appointments
                </Button>
              )}
              {connection.sync_providers && (
                <Button onClick={() => handleSync('providers')} loading={syncing}>
                  Sync Providers
                </Button>
              )}
            </Space>
          </Card>

          <Tabs defaultActiveKey="details">
            <TabPane tab="Connection Details" key="details">
              <Descriptions bordered column={2}>
                <Descriptions.Item label="PMS Type">
                  <Tag color="blue">{connection.pms_type}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="External Practice ID">
                  {connection.external_practice_id || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Tenant ID">
                  {connection.tenant_id}
                </Descriptions.Item>
                <Descriptions.Item label="Tenant Name">
                  {connection.tenant_name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Practice ID">
                  {connection.practice_id || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Data Source">
                  {connection.data_source || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sync Frequency">
                  {connection.sync_frequency || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sync Patients">
                  {connection.sync_patients ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Sync Appointments">
                  {connection.sync_appointments ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Sync Providers">
                  {connection.sync_providers ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Sync Treatments">
                  {connection.sync_treatments ? 'Yes' : 'No'}
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  {connection.created_at
                    ? new Date(connection.created_at).toLocaleString()
                    : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Updated At">
                  {connection.updated_at
                    ? new Date(connection.updated_at).toLocaleString()
                    : '-'}
                </Descriptions.Item>
              </Descriptions>
            </TabPane>

            <TabPane tab="Sync History" key="history">
              <Table
                columns={syncHistoryColumns}
                dataSource={syncHistory}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </TabPane>

            <TabPane tab="Synced Data" key="data">
              <Space direction="vertical">
                <Button onClick={() => navigate(`/pms/soe-data?connection_id=${id}&type=patients`)}>
                  View Patients
                </Button>
                <Button onClick={() => navigate(`/pms/soe-data?connection_id=${id}&type=appointments`)}>
                  View Appointments
                </Button>
                <Button onClick={() => navigate(`/pms/soe-data?connection_id=${id}&type=providers`)}>
                  View Providers
                </Button>
              </Space>
            </TabPane>
          </Tabs>
        </Space>
      </Card>

      <Modal
        title="Edit Connection"
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => setEditModalVisible(false)}
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdate}>
          <Form.Item label="Integration Name" name="integration_name">
            <Input />
          </Form.Item>
          <Form.Item label="External Practice ID" name="external_practice_id">
            <Input />
          </Form.Item>
          <Form.Item label="Sync Frequency" name="sync_frequency">
            <Select>
              <Select.Option value="manual">Manual</Select.Option>
              <Select.Option value="hourly">Hourly</Select.Option>
              <Select.Option value="daily">Daily</Select.Option>
              <Select.Option value="weekly">Weekly</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Sync Patients" name="sync_patients" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Sync Appointments" name="sync_appointments" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Sync Providers" name="sync_providers" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PMSConnectionDetail;
