import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, Switch, Button, Card, message, Space, Divider } from 'antd';
import { ArrowLeftOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import pmsService, { PMSConnectionCreate } from '../../services/pmsService';

const PMSConnectionCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedPMSType, setSelectedPMSType] = useState<string>('SOE');

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Build sync_config from type-specific credential fields
      const syncConfig: Record<string, any> = {};
      if (values.pms_type === 'DENTALLY') {
        if (values.dentally_key) syncConfig.dentally_key = values.dentally_key;
      } else if (values.pms_type === 'SFD') {
        if (values.database_id) syncConfig.database_id = values.database_id;
        if (values.sfd_username) syncConfig.username = values.sfd_username;
        if (values.sfd_password) syncConfig.password = values.sfd_password;
      } else if (values.pms_type === 'CARESTACK') {
        if (values.sass_url) syncConfig.sass_url = values.sass_url;
        if (values.carestack_password) syncConfig.password = values.carestack_password;
      }

      const data: PMSConnectionCreate = {
        client_id: values.client_id,
        practice_id: values.practice_id || undefined,
        pms_type: values.pms_type,
        integration_name: values.integration_name,
        external_practice_id: values.external_practice_id || undefined,
        external_site_code: values.external_site_code || undefined,
        data_source: values.data_source || undefined,
        sync_frequency: values.sync_frequency || undefined,
        sync_config: Object.keys(syncConfig).length > 0 ? syncConfig : undefined,
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

  const handlePMSTypeChange = (value: string) => {
    setSelectedPMSType(value);
    // Clear type-specific fields when switching
    form.setFieldsValue({
      integration_name: undefined,
      external_practice_id: undefined,
      external_site_code: undefined,
      dentally_key: undefined,
      database_id: undefined,
      sfd_username: undefined,
      sfd_password: undefined,
      sass_url: undefined,
      carestack_password: undefined,
    });
  };

  const renderTypeSpecificFields = () => {
    switch (selectedPMSType) {
      case 'SOE':
        return (
          <>
            <Divider>SOE Configuration</Divider>
            <Form.Item
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Please enter integration name' }]}
              tooltip="A friendly name for this SOE integration"
            >
              <Input placeholder="e.g., Charsfield SOE Integration" />
            </Form.Item>
            <Form.Item
              label="External Practice ID"
              name="external_practice_id"
              rules={[{ required: true, message: 'Please enter external practice ID' }]}
              tooltip="The integration_id from SOE data (e.g., 'EB3AE06' for MARD, '33F91ECD' for Charsfield)"
            >
              <Input placeholder="e.g., EB3AE06 or 33F91ECD" />
            </Form.Item>
            <Form.Item
              label="External Site Code (Optional)"
              name="external_site_code"
              tooltip="Site code if multiple sites share the same practice ID"
            >
              <Input placeholder="Optional site code" />
            </Form.Item>
            <Form.Item label="Data Source" name="data_source" tooltip="Where the data is sourced from">
              <Select>
                <Select.Option value="azure_blob">Azure Gold Layer</Select.Option>
                <Select.Option value="direct_api">Direct API</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Sync Frequency" name="sync_frequency" tooltip="How often data should be synced">
              <Select>
                <Select.Option value="manual">Manual Only</Select.Option>
                <Select.Option value="hourly">Hourly</Select.Option>
                <Select.Option value="daily">Daily</Select.Option>
                <Select.Option value="weekly">Weekly</Select.Option>
              </Select>
            </Form.Item>
          </>
        );

      case 'DENTALLY':
        return (
          <>
            <Divider>Dentally Configuration</Divider>
            <Form.Item
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Please enter integration name' }]}
              tooltip="A friendly name for this Dentally integration"
            >
              <Input placeholder="e.g., Main Practice Dentally" />
            </Form.Item>
            <Form.Item
              label="Dentally API Key"
              name="dentally_key"
              rules={[{ required: true, message: 'Please enter Dentally API key' }]}
              tooltip="The API key provided by Dentally for this practice"
            >
              <Input.Password
                placeholder="Enter Dentally API key"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
          </>
        );

      case 'SFD':
        return (
          <>
            <Divider>SFD Configuration</Divider>
            <Form.Item
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Please enter integration name' }]}
              tooltip="A friendly name for this SFD integration"
            >
              <Input placeholder="e.g., Clinic SFD Integration" />
            </Form.Item>
            <Form.Item
              label="Database ID"
              name="database_id"
              rules={[{ required: true, message: 'Please enter Database ID' }]}
              tooltip="The SFD database identifier"
            >
              <Input placeholder="Enter Database ID" />
            </Form.Item>
            <Form.Item
              label="Username"
              name="sfd_username"
              rules={[{ required: true, message: 'Please enter username' }]}
              tooltip="SFD login username"
            >
              <Input placeholder="Enter username" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="sfd_password"
              rules={[{ required: true, message: 'Please enter password' }]}
              tooltip="SFD login password"
            >
              <Input.Password
                placeholder="Enter password"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
          </>
        );

      case 'CARESTACK':
        return (
          <>
            <Divider>CareStack Configuration</Divider>
            <Form.Item
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Please enter integration name' }]}
              tooltip="A friendly name for this CareStack integration"
            >
              <Input placeholder="e.g., Practice CareStack Integration" />
            </Form.Item>
            <Form.Item
              label="SaaS URL"
              name="sass_url"
              rules={[{ required: true, message: 'Please enter SaaS URL' }]}
              tooltip="The CareStack SaaS URL for this practice"
            >
              <Input placeholder="e.g., https://yourpractice.carestack.com" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="carestack_password"
              rules={[{ required: true, message: 'Please enter password' }]}
              tooltip="CareStack API password"
            >
              <Input.Password
                placeholder="Enter password"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
          </>
        );

      default:
        return null;
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
          {/* PMS Type - FIRST field */}
          <Form.Item
            label="PMS Type"
            name="pms_type"
            rules={[{ required: true, message: 'Please select PMS type' }]}
          >
            <Select onChange={handlePMSTypeChange}>
              <Select.Option value="SOE">SOE (Software of Excellence)</Select.Option>
              <Select.Option value="DENTALLY">Dentally</Select.Option>
              <Select.Option value="SFD">SFD (Smile for Dentists)</Select.Option>
              <Select.Option value="CARESTACK">CareStack</Select.Option>
            </Select>
          </Form.Item>

          <Divider>Client Details</Divider>

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

          {/* Type-specific credential fields */}
          {renderTypeSpecificFields()}

          <Divider>Sync Settings</Divider>

          <Form.Item label="Sync Patients" name="sync_patients" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Sync Appointments" name="sync_appointments" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Sync Providers" name="sync_providers" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Sync Treatments" name="sync_treatments" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item label="Sync Billing" name="sync_billing" valuePropName="checked">
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
