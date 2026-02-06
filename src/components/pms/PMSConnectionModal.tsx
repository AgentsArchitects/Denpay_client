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
  const [existingIntegrationNames, setExistingIntegrationNames] = useState<string[]>([]);

  useEffect(() => {
    if (visible && tenantId) {
      form.resetFields();
      const effectiveType = pmsType || 'SOE';
      setSelectedPMSType(effectiveType);
      if (pmsType) {
        form.setFieldsValue({ pms_type: pmsType });
      }

      // Fetch existing integration names for this tenant to prevent duplicates
      pmsService.listConnections({ tenant_id: tenantId, page: 1, page_size: 100 })
        .then(response => {
          const names = response.data.map((conn: any) => conn.integration_name.toLowerCase());
          setExistingIntegrationNames(names);
        })
        .catch(err => {
          console.error('Failed to fetch existing integrations:', err);
        });
    }
  }, [visible, tenantId, pmsType, form]);

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

      // Check for duplicate integration name within this tenant (only in edit mode)
      const integrationName = values.integration_name || effectiveType;
      if (tenantId && existingIntegrationNames.includes(integrationName.toLowerCase())) {
        message.error(`Integration name "${integrationName}" already exists for this client. Please use a different name.`);
        setLoading(false);
        return;
      }

      // Generate integration_id: 8-char alphanumeric from timestamp + random
      const generateIntegrationId = () => {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 4).toUpperCase();
        return (timestamp + random).slice(-8).padStart(8, '0');
      };

      const integrationId = generateIntegrationId();

      const data: PMSConnectionCreate = {
        tenant_id: tenantId || '',  // Will be set when client is saved (for pending connections)
        tenant_name: tenantName,  // Optional
        practice_id: practiceId,  // Optional UUID
        pms_type: effectiveType,  // Required
        integration_id: integrationId,  // Required 8-char alphanumeric
        integration_name: values.integration_name || effectiveType,  // Required
        sync_config: Object.keys(syncConfig).length > 0 ? syncConfig : undefined,
        // Sync entities hidden for now - client doesn't need syncing yet
        sync_patients: false,
        sync_appointments: false,
        sync_providers: false,
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
          <Form.Item
            label="Integration Name"
            name="integration_name"
            rules={[{ required: true, message: 'Please enter integration name' }]}
          >
            <Input placeholder="Enter integration name (e.g., Charsfield Practice)" />
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
