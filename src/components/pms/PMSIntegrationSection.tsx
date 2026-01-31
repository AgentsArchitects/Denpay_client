import React, { useState, useEffect } from 'react';
import { Card, Button, Empty, Space, Spin, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import pmsService, { PMSConnection, PMSConnectionCreate } from '../../services/pmsService';
import PMSConnectionModal from './PMSConnectionModal';
import PMSConnectionCard from './PMSConnectionCard';

interface PMSIntegrationSectionProps {
  clientId?: string;
  practiceId?: string;
  onConnectionsChange?: (connections: PMSConnectionCreate[]) => void;
}

const PMSIntegrationSection: React.FC<PMSIntegrationSectionProps> = ({
  clientId,
  practiceId,
  onConnectionsChange,
}) => {
  const [savedConnections, setSavedConnections] = useState<{
    SOE: PMSConnection[];
    DENTALLY: PMSConnection[];
    SFD: PMSConnection[];
    CARESTACK: PMSConnection[];
  }>({
    SOE: [],
    DENTALLY: [],
    SFD: [],
    CARESTACK: [],
  });

  const [pendingConnections, setPendingConnections] = useState<PMSConnectionCreate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPMSType, setSelectedPMSType] = useState<
    'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK' | undefined
  >();

  useEffect(() => {
    if (clientId) {
      fetchConnections();
    }
  }, [clientId]);

  useEffect(() => {
    // Notify parent of pending connections changes
    if (onConnectionsChange) {
      onConnectionsChange(pendingConnections);
    }
  }, [pendingConnections, onConnectionsChange]);

  const fetchConnections = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const response = await pmsService.listConnections({
        client_id: clientId,
        page: 1,
        page_size: 100,
      });

      // Group connections by PMS type
      const grouped: any = {
        SOE: [],
        DENTALLY: [],
        SFD: [],
        CARESTACK: [],
      };

      response.data.forEach((conn) => {
        if (grouped[conn.pms_type]) {
          grouped[conn.pms_type].push(conn);
        }
      });

      setSavedConnections(grouped);
    } catch (error: any) {
      console.error('Failed to fetch connections:', error);
      message.error('Failed to load PMS connections');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConnection = (pmsType: 'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK') => {
    setSelectedPMSType(pmsType);
    setModalVisible(true);
  };

  const handleConnectionCreated = (connection: any) => {
    if (clientId) {
      // Client is saved - connection was created in backend, reload list
      fetchConnections();
    } else {
      // Client not saved yet - add to pending connections
      setPendingConnections([...pendingConnections, connection]);
      message.success('Connection will be created when client is saved');
    }
  };

  const handleDeletePending = (index: number) => {
    const updated = pendingConnections.filter((_, i) => i !== index);
    setPendingConnections(updated);
    message.success('Pending connection removed');
  };

  const handleConnectionDeleted = () => {
    fetchConnections();
  };

  const renderPMSSection = (
    pmsType: 'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK',
    title: string
  ) => {
    const savedPMSConnections = savedConnections[pmsType];
    const pendingPMSConnections = pendingConnections.filter(c => c.pms_type === pmsType);
    const hasData = savedPMSConnections.length > 0 || pendingPMSConnections.length > 0;

    return (
      <Card
        title={title}
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleAddConnection(pmsType)}
          >
            Add More
          </Button>
        }
      >
        {loading && clientId ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Spin />
          </div>
        ) : hasData ? (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {/* Saved connections (from database) */}
            {savedPMSConnections.map((conn) => (
              <PMSConnectionCard
                key={conn.id}
                connection={conn}
                onRefresh={fetchConnections}
                onDelete={handleConnectionDeleted}
              />
            ))}

            {/* Pending connections (not yet saved) */}
            {pendingPMSConnections.map((conn, index) => (
              <Card
                key={`pending-${index}`}
                size="small"
                style={{ borderColor: '#1890ff', borderStyle: 'dashed' }}
                title={
                  <Space>
                    <span>{conn.integration_name}</span>
                    <span style={{ color: '#1890ff', fontSize: '12px' }}>
                      (Pending - will be created on save)
                    </span>
                  </Space>
                }
                extra={
                  <Button
                    type="text"
                    danger
                    size="small"
                    onClick={() => handleDeletePending(pendingConnections.indexOf(conn))}
                  >
                    Remove
                  </Button>
                }
              >
                <Space direction="vertical" size="small">
                  <div>PMS Type: {conn.pms_type}</div>
                  <div>External Practice ID: {conn.external_practice_id || '-'}</div>
                  <div>
                    Sync: {[
                      conn.sync_patients && 'Patients',
                      conn.sync_appointments && 'Appointments',
                      conn.sync_providers && 'Providers',
                      conn.sync_treatments && 'Treatments',
                    ].filter(Boolean).join(', ')}
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No data found"
          />
        )}
      </Card>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3>PMS Integration Details</h3>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchConnections}
          loading={loading}
          disabled={!clientId}
        >
          Refresh
        </Button>
      </div>

      {renderPMSSection('SOE', 'SOE')}
      {renderPMSSection('DENTALLY', 'DENTALLY')}
      {renderPMSSection('SFD', 'SFD')}
      {renderPMSSection('CARESTACK', 'CARESTACK')}

      <PMSConnectionModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedPMSType(undefined);
        }}
        onSuccess={handleConnectionCreated}
        pmsType={selectedPMSType}
        clientId={clientId}
        practiceId={practiceId}
        simplified={true}
      />
    </div>
  );
};

export default PMSIntegrationSection;
