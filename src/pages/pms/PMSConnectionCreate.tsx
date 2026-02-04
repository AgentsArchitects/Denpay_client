import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Select, Button, Card, message, Space } from 'antd';
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
        tenant_id: values.tenant_id,  // Required 8-char alphanumeric
        tenant_name: values.tenant_name,  // Optional
        integration_id: values.integration_id,  // Required 8-char alphanumeric
        pms_type: values.pms_type,
        integration_name: values.integration_name || values.pms_type,
        sync_config: Object.keys(syncConfig).length > 0 ? syncConfig : undefined,
        sync_patients: true,
        sync_appointments: true,
        sync_providers: true,
        sync_treatments: false,
        sync_billing: false,
      };
      const connection = await pmsService.createConnection(data);
      message.success(`PMS connection created (ID: ${connection.integration_id})`);
      navigate(`/pms/connections/${connection.id}`);
    } catch (error: any) {
      message.error(error.message || 'Failed to create PMS connection');
    } finally {
      setLoading(false);
    }
  };

  const handlePMSTypeChange = (value: string) => {
    setSelectedPMSType(value);
    form.setFieldsValue({
      integration_name: undefined,
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
          <Form.Item
            label="Integration Name"
            name="integration_name"
            rules={[{ required: true, message: 'Please enter integration name' }]}
          >
            <Input placeholder="Enter integration name" />
          </Form.Item>
        );

      case 'DENTALLY':
        return (
          <Form.Item
            label="Dentally API Key"
            name="dentally_key"
            rules={[{ required: true, message: 'Please enter Dentally API key' }]}
          >
            <Input.Password
              placeholder="Enter Dentally API key"
              iconRender={(vis) => (vis ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
        );

      case 'SFD':
        return (
          <>
            <Form.Item
              label="Database ID"
              name="database_id"
              rules={[{ required: true, message: 'Please enter Database ID' }]}
            >
              <Input placeholder="Enter Database ID" />
            </Form.Item>
            <Form.Item
              label="Username"
              name="sfd_username"
              rules={[{ required: true, message: 'Please enter username' }]}
            >
              <Input placeholder="Enter username" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="sfd_password"
              rules={[{ required: true, message: 'Please enter password' }]}
            >
              <Input.Password
                placeholder="Enter password"
                iconRender={(vis) => (vis ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
          </>
        );

      case 'CARESTACK':
        return (
          <>
            <Form.Item
              label="SaaS URL"
              name="sass_url"
              rules={[{ required: true, message: 'Please enter SaaS URL' }]}
            >
              <Input placeholder="e.g., https://yourpractice.carestack.com" />
            </Form.Item>
            <Form.Item
              label="Password"
              name="carestack_password"
              rules={[{ required: true, message: 'Please enter password' }]}
            >
              <Input.Password
                placeholder="Enter password"
                iconRender={(vis) => (vis ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
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

          {/* Type-specific fields */}
          {renderTypeSpecificFields()}

          {/* Integration ID - always last, read-only */}
          <Form.Item label="Integration ID">
            <Input disabled placeholder="Auto-generated on save" />
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
