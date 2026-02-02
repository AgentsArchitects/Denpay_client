import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message, Divider } from 'antd';
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
      if (pmsType) {
        form.setFieldsValue({ pms_type: pmsType });
        setSelectedPMSType(pmsType);
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

      const data: PMSConnectionCreate = {
        ...values,
        // Explicitly set clientId and pmsType since their form fields may be hidden
        ...(clientId && { client_id: clientId }),
        ...(pmsType && { pms_type: pmsType }),
        // Use form value for practice_id if present, otherwise use prop
        practice_id: values.practice_id || practiceId || undefined,
        sync_patients: values.sync_patients ?? true,
        sync_appointments: values.sync_appointments ?? true,
        sync_providers: values.sync_providers ?? true,
        sync_treatments: values.sync_treatments ?? false,
        sync_billing: values.sync_billing ?? false,
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

  const getPMSTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SOE: 'SOE (Software of Excellence)',
      DENTALLY: 'Dentally',
      SFD: 'SFD (Smile for Dentists)',
      CARESTACK: 'CareStack',
    };
    return labels[type] || type;
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
        {!simplified && <Divider>Basic Information</Divider>}

        <Form.Item
          label="Integration Name"
          name="integration_name"
          rules={[{ required: true, message: 'Please enter integration name' }]}
          tooltip="A friendly name for this integration"
        >
          <Input placeholder="e.g., Charsfield SOE Integration" />
        </Form.Item>

        {!pmsType && (
          <Form.Item
            label="PMS Type"
            name="pms_type"
            rules={[{ required: true, message: 'Please select PMS type' }]}
          >
            <Select onChange={(value) => setSelectedPMSType(value)}>
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
            <Select
              placeholder="Select a location (optional)"
              allowClear
            >
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

        {(selectedPMSType === 'SOE' || pmsType === 'SOE') && (
          <>
            {!simplified && <Divider>SOE Configuration</Divider>}

            <Form.Item
              label="External Practice ID"
              name="external_practice_id"
              rules={[
                { required: true, message: 'Please enter external practice ID' },
              ]}
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
                    <Select.Option value="azure_blob">
                      Azure Gold Layer
                    </Select.Option>
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
        )}

        {!simplified && <Divider>Sync Settings</Divider>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
        </div>
      </Form>
    </Modal>
  );
};

export default PMSConnectionModal;
