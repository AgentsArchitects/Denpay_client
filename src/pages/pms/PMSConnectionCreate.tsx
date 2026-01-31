import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, Switch, Button, Card, message, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import pmsService, { PMSConnectionCreate } from '../../services/pmsService';

const PMSConnectionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data: PMSConnectionCreate = {
        ...values,
        sync_patients: values.sync_patients ?? true,
        sync_appointments: values.sync_appointments ?? true,
        sync_providers: values.sync_providers ?? true,
        sync_treatments: values.sync_treatments ?? false,
        sync_billing: values.sync_billing ?? false,
      };
      const connection = await pmsService.createConnection(data);
      message.success('PMS connection created successfully');
      navigate(`/pms/connections/${connection.id}`);
    } catch (error: any) {
      message.error(error.message || 'Failed to create PMS connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: 24 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/pms/connections')}
            style={{ marginBottom: 16 }}
          >
            Back to Connections
          </Button>
          <h2>Create New PMS Connection</h2>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            pms_type: 'SOE',
            data_source: 'azure_blob',
            sync_frequency: 'daily',
            sync_patients: true,
            sync_appointments: true,
            sync_providers: true,
            sync_treatments: false,
            sync_billing: false,
          }}
          style={{ maxWidth: 600 }}
        >
          <Divider >Basic Information</Divider>

          <Form.Item
            label="Integration Name"
            name="integration_name"
            rules={[{ required: true, message: 'Please enter integration name' }]}
            tooltip="A friendly name for this connection (e.g., 'Charsfield SOE Integration')"
          >
            <Input placeholder="e.g., Charsfield SOE Integration" />
          </Form.Item>

          <Form.Item
            label="PMS Type"
            name="pms_type"
            rules={[{ required: true, message: 'Please select PMS type' }]}
          >
            <Select>
              <Select.Option value="SOE">SOE</Select.Option>
              <Select.Option value="DENTALLY">Dentally</Select.Option>
              <Select.Option value="SFD">SFD</Select.Option>
              <Select.Option value="CARESTACK">CareStack</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Client ID"
            name="client_id"
            rules={[{ required: true, message: 'Please enter client ID' }]}
            tooltip="The UUID of the client in WorkFin"
          >
            <Input placeholder="00000000-0000-0000-0000-000000000001" />
          </Form.Item>

          <Form.Item
            label="Practice ID (Optional)"
            name="practice_id"
            tooltip="The UUID of the practice/location in WorkFin"
          >
            <Input placeholder="00000000-0000-0000-0000-000000000002" />
          </Form.Item>

          <Divider >SOE Configuration</Divider>

          <Form.Item
            label="External Practice ID"
            name="external_practice_id"
            tooltip="The integration_id from SOE data (e.g., 'EB3AE06' for MARD, '33F91ECD' for Charsfield)"
          >
            <Input placeholder="e.g., EB3AE06" />
          </Form.Item>

          <Form.Item
            label="External Site Code (Optional)"
            name="external_site_code"
            tooltip="Site code if multiple sites share the same practice ID"
          >
            <Input placeholder="Optional site code" />
          </Form.Item>

          <Form.Item
            label="Data Source"
            name="data_source"
            tooltip="Where the data is sourced from"
          >
            <Select>
              <Select.Option value="azure_blob">Azure Gold Layer</Select.Option>
              <Select.Option value="direct_api">Direct API</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Sync Frequency"
            name="sync_frequency"
            tooltip="How often data should be synced"
          >
            <Select>
              <Select.Option value="manual">Manual Only</Select.Option>
              <Select.Option value="hourly">Hourly</Select.Option>
              <Select.Option value="daily">Daily</Select.Option>
              <Select.Option value="weekly">Weekly</Select.Option>
            </Select>
          </Form.Item>

          <Divider >Sync Settings</Divider>

          <Form.Item
            label="Sync Patients"
            name="sync_patients"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="Sync Appointments"
            name="sync_appointments"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="Sync Providers"
            name="sync_providers"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="Sync Treatments"
            name="sync_treatments"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="Sync Billing"
            name="sync_billing"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Create Connection
              </Button>
              <Button onClick={() => navigate('/pms/connections')}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default PMSConnectionCreatePage;
