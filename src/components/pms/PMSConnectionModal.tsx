import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import pmsService, { PMSConnectionCreate } from '../../services/pmsService';

interface PMSConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (connection: any) => void;
  pmsType?: 'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK' | 'XERO' | 'COMPASS';
  tenantId?: string;  // Changed from clientId to tenantId (8-char alphanumeric)
  tenantName?: string;  // Optional tenant name
  practiceId?: string;
}

const PMSConnectionModal: React.FC<PMSConnectionModalProps> = ({
  visible,
  onClose,
  onSuccess,
  pmsType,
  tenantId,
  tenantName,
  practiceId,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedPMSType, setSelectedPMSType] = useState<string>(pmsType || 'SOE');
  const [soeIntegrations, setSOEIntegrations] = useState<Array<{ integration_id: string; integration_name: string }>>([]);

  useEffect(() => {
    if (visible) {
      form.resetFields();
      const effectiveType = pmsType || 'SOE';
      setSelectedPMSType(effectiveType);
      if (pmsType) {
        form.setFieldsValue({ pms_type: pmsType });
      }

      // Fetch SOE integrations for the dropdown
      if (effectiveType === 'SOE') {
        pmsService.getSOEIntegrations()
          .then(response => {
            setSOEIntegrations(response.integrations || []);
          })
          .catch(err => {
            console.error('Failed to fetch SOE integrations:', err);
            message.warning('Failed to load SOE integrations. You may need to sync them first.');
          });
      }
    }
  }, [visible, pmsType, form]);

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

      // Validate required fields based on backend schema
      if (!tenantId) {
        message.error('Tenant ID is required');
        return;
      }

      // For SOE, integration_id comes from the dropdown selection
      // For other PMS types, we can generate or use a placeholder
      const integrationId = effectiveType === 'SOE'
        ? values.soe_integration_id
        : values.integration_id || `${effectiveType}-${Date.now().toString(36).toUpperCase().substr(-8)}`;

      if (!integrationId) {
        message.error('Integration ID is required');
        return;
      }

      const data: PMSConnectionCreate = {
        tenant_id: tenantId,  // Required 8-char alphanumeric
        tenant_name: tenantName,  // Optional
        practice_id: practiceId,  // Optional UUID
        pms_type: effectiveType,  // Required
        integration_id: integrationId,  // Required 8-char alphanumeric
        integration_name: values.integration_name || effectiveType,  // Required
        sync_config: Object.keys(syncConfig).length > 0 ? syncConfig : undefined,
        sync_patients: true,
        sync_appointments: true,
        sync_providers: true,
        sync_treatments: false,
        sync_billing: false,
      };

      if (tenantId) {
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
      dentally_key: undefined,
      database_id: undefined,
      sfd_username: undefined,
      sfd_password: undefined,
      sass_url: undefined,
      carestack_password: undefined,
    });
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
              label="SOE Integration"
              name="soe_integration_id"
              rules={[{ required: true, message: 'Please select an SOE integration' }]}
              help="Select from Gold Layer integrations"
            >
              <Select
                placeholder="Select SOE integration"
                loading={soeIntegrations.length === 0}
                notFoundContent={soeIntegrations.length === 0 ? 'Loading...' : 'No integrations found'}
                onChange={(value) => {
                  const selected = soeIntegrations.find(i => i.integration_id === value);
                  if (selected) {
                    form.setFieldsValue({ integration_name: selected.integration_name });
                  }
                }}
              >
                {soeIntegrations.map(integration => (
                  <Select.Option key={integration.integration_id} value={integration.integration_id}>
                    {integration.integration_name} ({integration.integration_id})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="Integration Name"
              name="integration_name"
              rules={[{ required: true, message: 'Integration name is required' }]}
            >
              <Input placeholder="Auto-filled from selection" disabled />
            </Form.Item>
          </>
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

        {/* Integration ID - always last, read-only */}
        <Form.Item label="Integration ID">
          <Input disabled placeholder="Auto-generated on save" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PMSConnectionModal;
