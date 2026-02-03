import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message, Spin } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import pmsService, { PMSConnectionCreate } from '../../services/pmsService';

interface PMSConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (connection: any) => void;
  pmsType?: 'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK';
  clientId?: string;
  practiceId?: string;
}

interface SOEIntegration {
  integration_id: string;
  integration_name: string;
}

const PMSConnectionModal: React.FC<PMSConnectionModalProps> = ({
  visible,
  onClose,
  onSuccess,
  pmsType,
  clientId,
  practiceId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedPMSType, setSelectedPMSType] = useState<string>(pmsType || 'SOE');
  const [soeIntegrations, setSOEIntegrations] = useState<SOEIntegration[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      const effectiveType = pmsType || 'SOE';
      setSelectedPMSType(effectiveType);
      if (pmsType) {
        form.setFieldsValue({ pms_type: pmsType });
      }
      // Fetch SOE integrations when opening
      if (effectiveType === 'SOE') {
        fetchSOEIntegrations();
      }
    }
  }, [visible, pmsType, form]);

  const fetchSOEIntegrations = async () => {
    setLoadingIntegrations(true);
    try {
      const data = await pmsService.getSOEIntegrations();
      setSOEIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Failed to fetch SOE integrations:', error);
      setSOEIntegrations([]);
    } finally {
      setLoadingIntegrations(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const effectiveType = values.pms_type || pmsType || selectedPMSType;

      // Build sync_config for non-SOE types
      const syncConfig: Record<string, any> = {};
      if (effectiveType === 'DENTALLY') {
        if (values.dentally_key) syncConfig.dentally_key = values.dentally_key;
      } else if (effectiveType === 'SFD') {
        if (values.database_id) syncConfig.database_id = values.database_id;
        if (values.sfd_username) syncConfig.username = values.sfd_username;
        if (values.sfd_password) syncConfig.password = values.sfd_password;
      } else if (effectiveType === 'CARESTACK') {
        if (values.sass_url) syncConfig.sass_url = values.sass_url;
        if (values.carestack_password) syncConfig.password = values.carestack_password;
      }

      const data: PMSConnectionCreate = {
        ...(clientId && { client_id: clientId }),
        ...(practiceId && { practice_id: practiceId }),
        pms_type: effectiveType,
        integration_name: values.integration_name,
        external_practice_id: values.integration_id || undefined,
        sync_config: Object.keys(syncConfig).length > 0 ? syncConfig : undefined,
        sync_patients: true,
        sync_appointments: true,
        sync_providers: true,
        sync_treatments: false,
        sync_billing: false,
      };

      if (clientId) {
        const connection = await pmsService.createConnection(data);
        message.success(`Integration created (ID: ${connection.integration_id})`);
        form.resetFields();
        onSuccess(connection);
      } else {
        message.success('Connection added (will be created when client is saved)');
        form.resetFields();
        onSuccess(data);
      }
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(error.message || 'Failed to create PMS connection');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handlePMSTypeChange = (value: string) => {
    setSelectedPMSType(value);
    form.setFieldsValue({
      integration_name: undefined,
      integration_id: undefined,
      dentally_key: undefined,
      database_id: undefined,
      sfd_username: undefined,
      sfd_password: undefined,
      sass_url: undefined,
      carestack_password: undefined,
    });
    if (value === 'SOE') {
      fetchSOEIntegrations();
    }
  };

  const handleIntegrationNameChange = (value: string) => {
    // Auto-populate integration_id when an integration name is selected
    const selected = soeIntegrations.find((i) => i.integration_name === value);
    if (selected) {
      form.setFieldsValue({ integration_id: selected.integration_id });
    }
  };

  const getPMSTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SOE: 'SOE (Software of Excellence)',
      DENTALLY: 'Dentally',
      SFD: 'SFD (Smile for Dentists)',
      CARESTACK: 'CareStack',
    };
    return labels[type] || type;
  };

  const renderTypeSpecificFields = () => {
    const effectiveType = selectedPMSType || pmsType || 'SOE';

    switch (effectiveType) {
      case 'SOE':
        return (
          <>
            <Form.Item
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Please select an integration' }]}
            >
              <Select
                showSearch
                placeholder={loadingIntegrations ? 'Loading integrations...' : 'Select an integration'}
                loading={loadingIntegrations}
                notFoundContent={loadingIntegrations ? <Spin size="small" /> : 'No integrations found'}
                onChange={handleIntegrationNameChange}
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {soeIntegrations.map((integration) => (
                  <Select.Option key={integration.integration_id} value={integration.integration_name}>
                    {integration.integration_name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="Integration ID"
              name="integration_id"
            >
              <Input disabled placeholder="Auto-populated from selection above" />
            </Form.Item>
          </>
        );

      case 'DENTALLY':
        return (
          <>
            <Form.Item
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Please enter integration name' }]}
            >
              <Input placeholder="e.g., Main Practice Dentally" />
            </Form.Item>
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
          </>
        );

      case 'SFD':
        return (
          <>
            <Form.Item
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Please enter integration name' }]}
            >
              <Input placeholder="e.g., Clinic SFD Integration" />
            </Form.Item>
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
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Please enter integration name' }]}
            >
              <Input placeholder="e.g., Practice CareStack Integration" />
            </Form.Item>
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
    <Modal
      title={`Add ${pmsType ? getPMSTypeLabel(pmsType) : 'PMS'} Integration`}
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      width={500}
      okText="Create Integration"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          pms_type: pmsType || 'SOE',
        }}
      >
        {/* PMS Type - FIRST field */}
        {!pmsType && (
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
        )}

        {/* Type-specific fields */}
        {renderTypeSpecificFields()}
      </Form>
    </Modal>
  );
};

export default PMSConnectionModal;
