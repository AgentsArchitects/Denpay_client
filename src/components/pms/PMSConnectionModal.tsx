import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message, Divider } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import pmsService, { PMSConnectionCreate } from '../../services/pmsService';

interface Practice {
  id: string;
  name: string;
  location_id: string;
  status: string;
}

interface PMSConnectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (connection: any) => void;
  pmsType?: 'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK';
  clientId?: string;
  practiceId?: string;
  practices?: Practice[];
  simplified?: boolean;
}

const PMSConnectionModal: React.FC<PMSConnectionModalProps> = ({
  visible,
  onClose,
  onSuccess,
  pmsType,
  clientId,
  practiceId,
  practices = [],
  simplified = false,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedPMSType, setSelectedPMSType] = useState<string>(pmsType || 'SOE');

  useEffect(() => {
    if (visible) {
      form.resetFields();
      const effectiveType = pmsType || 'SOE';
      setSelectedPMSType(effectiveType);
      if (pmsType) {
        form.setFieldsValue({ pms_type: pmsType });
      }
      if (practiceId) {
        form.setFieldsValue({ practice_id: practiceId });
      }
    }
  }, [visible, pmsType, practiceId, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Build sync_config from type-specific credential fields
      const effectiveType = values.pms_type || pmsType || selectedPMSType;
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
        ...values,
        ...(clientId && { client_id: clientId }),
        ...(pmsType && { pms_type: pmsType }),
        pms_type: effectiveType,
        practice_id: values.practice_id || practiceId || undefined,
        sync_config: Object.keys(syncConfig).length > 0 ? syncConfig : undefined,
        sync_patients: values.sync_patients ?? true,
        sync_appointments: values.sync_appointments ?? true,
        sync_providers: values.sync_providers ?? true,
        sync_treatments: values.sync_treatments ?? false,
        sync_billing: values.sync_billing ?? false,
      };

      // Remove UI-only fields that aren't part of the API
      delete (data as any).dentally_key;
      delete (data as any).database_id;
      delete (data as any).sfd_username;
      delete (data as any).sfd_password;
      delete (data as any).sass_url;
      delete (data as any).carestack_password;

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
            {!simplified && <Divider>SOE Configuration</Divider>}
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
            {!simplified && (
              <>
                <Form.Item
                  label="External Site Code (Optional)"
                  name="external_site_code"
                  tooltip="Site code if multiple sites share the same practice ID"
                >
                  <Input placeholder="Optional site code" />
                </Form.Item>
                <Form.Item label="Data Source" name="data_source">
                  <Select>
                    <Select.Option value="azure_blob">Azure Gold Layer</Select.Option>
                    <Select.Option value="direct_api">Direct API</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Sync Frequency" name="sync_frequency">
                  <Select>
                    <Select.Option value="manual">Manual Only</Select.Option>
                    <Select.Option value="hourly">Hourly</Select.Option>
                    <Select.Option value="daily">Daily</Select.Option>
                    <Select.Option value="weekly">Weekly</Select.Option>
                  </Select>
                </Form.Item>
              </>
            )}
          </>
        );

      case 'DENTALLY':
        return (
          <>
            {!simplified && <Divider>Dentally Configuration</Divider>}
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
                iconRender={(vis) => (vis ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
          </>
        );

      case 'SFD':
        return (
          <>
            {!simplified && <Divider>SFD Configuration</Divider>}
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
                iconRender={(vis) => (vis ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>
          </>
        );

      case 'CARESTACK':
        return (
          <>
            {!simplified && <Divider>CareStack Configuration</Divider>}
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
      width={simplified ? 500 : 700}
      okText="Create Integration"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          pms_type: pmsType || 'SOE',
          practice_id: practiceId || undefined,
          data_source: 'azure_blob',
          sync_frequency: 'daily',
          sync_patients: true,
          sync_appointments: true,
          sync_providers: true,
          sync_treatments: false,
          sync_billing: false,
        }}
      >
        {/* PMS Type - FIRST field (shown when not pre-set) */}
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

        {/* Location/Practice dropdown - shown when practices are available */}
        {!simplified && practices.length > 0 && (
          <Form.Item
            label="Location (Practice)"
            name="practice_id"
            tooltip="Select which practice/location this integration belongs to"
          >
            <Select placeholder="Select a location (optional)" allowClear>
              {practices.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} ({p.location_id})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Show raw practice_id field only if no practices list and not simplified */}
        {!simplified && practices.length === 0 && !practiceId && (
          <Form.Item
            label="Practice ID (Optional)"
            name="practice_id"
            tooltip="The UUID of the practice/location in WorkFin"
          >
            <Input placeholder="00000000-0000-0000-0000-000000000002" />
          </Form.Item>
        )}

        {/* Type-specific credential fields */}
        {renderTypeSpecificFields()}

        {!simplified && <Divider>Sync Settings</Divider>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
        </div>
      </Form>
    </Modal>
  );
};

export default PMSConnectionModal;
