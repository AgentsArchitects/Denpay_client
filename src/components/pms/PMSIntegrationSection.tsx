import React, { useState, useEffect } from 'react';
import { Card, Button, Empty, Space, Spin, message, Tag, Collapse } from 'antd';
import { PlusOutlined, ReloadOutlined, EnvironmentOutlined } from '@ant-design/icons';
import pmsService, { PMSConnection, PMSConnectionCreate } from '../../services/pmsService';
import clientService from '../../services/clientService';
import PMSConnectionModal from './PMSConnectionModal';
import PMSConnectionCard from './PMSConnectionCard';

interface Practice {
  id: string;
  name: string;
  location_id: string;
  status: string;
}

interface PMSIntegrationSectionProps {
  clientId?: string;
  onConnectionsChange?: (connections: PMSConnectionCreate[]) => void;
}

const PMSIntegrationSection: React.FC<PMSIntegrationSectionProps> = ({
  clientId,
  onConnectionsChange,
}) => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [connectionsByPractice, setConnectionsByPractice] = useState<Record<string, PMSConnection[]>>({});
  const [unassignedConnections, setUnassignedConnections] = useState<PMSConnection[]>([]);
  const [pendingConnections, setPendingConnections] = useState<PMSConnectionCreate[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | undefined>();
  const [selectedPMSType, setSelectedPMSType] = useState<
    'SOE' | 'DENTALLY' | 'SFD' | 'CARESTACK' | undefined
  >();

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  useEffect(() => {
    if (onConnectionsChange) {
      onConnectionsChange(pendingConnections);
    }
  }, [pendingConnections, onConnectionsChange]);

  const fetchData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      // Fetch client details to get practices
      const clientData = await clientService.getClient(clientId) as any;
      const clientPractices = (clientData.practices || []).map((p: any) => ({
        id: p.id || p.practice_id,
        name: p.name,
        location_id: p.location_id,
        status: p.status || 'Active',
      }));
      setPractices(clientPractices);

      // Fetch all connections for this client
      const response = await pmsService.listConnections({
        client_id: clientId,
        page: 1,
        page_size: 100,
      });

      // Group connections by practice_id
      const grouped: Record<string, PMSConnection[]> = {};
      const unassigned: PMSConnection[] = [];

      response.data.forEach((conn) => {
        if (conn.practice_id) {
          if (!grouped[conn.practice_id]) {
            grouped[conn.practice_id] = [];
          }
          grouped[conn.practice_id].push(conn);
        } else {
          unassigned.push(conn);
        }
      });

      setConnectionsByPractice(grouped);
      setUnassignedConnections(unassigned);
    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      message.error('Failed to load integration data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConnection = (practiceId?: string) => {
    setSelectedPracticeId(practiceId);
    setSelectedPMSType(undefined);
    setModalVisible(true);
  };

  const handleConnectionCreated = (connection: any) => {
    if (clientId) {
      fetchData();
    } else {
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
    fetchData();
  };

  const getPMSTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SOE: 'SOE',
      DENTALLY: 'Dentally',
      SFD: 'SFD',
      CARESTACK: 'CareStack',
    };
    return labels[type] || type;
  };

  const renderConnectionCard = (conn: PMSConnection) => (
    <PMSConnectionCard
      key={conn.id}
      connection={conn}
      onRefresh={fetchData}
      onDelete={handleConnectionDeleted}
    />
  );

  const renderPendingCard = (conn: PMSConnectionCreate, index: number) => (
    <Card
      key={`pending-${index}`}
      size="small"
      style={{ borderColor: '#1890ff', borderStyle: 'dashed' }}
      title={
        <Space>
          <span>{conn.integration_name}</span>
          <Tag color="blue">{getPMSTypeLabel(conn.pms_type)}</Tag>
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
  );

  const renderPracticeSection = (practice: Practice) => {
    const practiceConnections = connectionsByPractice[practice.id] || [];
    const practicePendingConnections = pendingConnections.filter(
      c => c.practice_id === practice.id
    );

    return (
      <Card
        key={practice.id}
        title={
          <Space>
            <EnvironmentOutlined />
            <span style={{ fontWeight: 600 }}>{practice.name}</span>
            <Tag>{practice.location_id}</Tag>
            <Tag color={practice.status === 'Active' ? 'green' : 'default'}>
              {practice.status}
            </Tag>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            type="link"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => handleAddConnection(practice.id)}
          >
            Add Integration
          </Button>
        }
      >
        {practiceConnections.length > 0 || practicePendingConnections.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {practiceConnections.map(renderConnectionCard)}
            {practicePendingConnections.map((conn, index) => renderPendingCard(conn, index))}
          </Space>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No integrations for this location"
          />
        )}
      </Card>
    );
  };

  // If no client yet (create mode), show the simple flat PMS type sections
  if (!clientId) {
    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
          <h3>PMS Integration Details</h3>
        </div>

        {(['SOE', 'DENTALLY', 'SFD', 'CARESTACK'] as const).map((pmsType) => {
          const typePending = pendingConnections.filter(c => c.pms_type === pmsType);
          return (
            <Card
              key={pmsType}
              title={getPMSTypeLabel(pmsType)}
              size="small"
              style={{ marginBottom: 16 }}
              extra={
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setSelectedPMSType(pmsType);
                    setSelectedPracticeId(undefined);
                    setModalVisible(true);
                  }}
                >
                  Add More
                </Button>
              }
            >
              {typePending.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  {typePending.map((conn, index) => renderPendingCard(conn, index))}
                </Space>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No data found"
                />
              )}
            </Card>
          );
        })}

        <PMSConnectionModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setSelectedPMSType(undefined);
            setSelectedPracticeId(undefined);
          }}
          onSuccess={handleConnectionCreated}
          pmsType={selectedPMSType}
          clientId={clientId}
          practiceId={selectedPracticeId}
        />
      </div>
    );
  }

  // Edit mode - show location-based hierarchy
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Integrations by Location</h3>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAddConnection()}
          >
            Add Integration
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          {/* Render practices/locations with their integrations */}
          {practices.length > 0 ? (
            practices.map(renderPracticeSection)
          ) : (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No locations (practices) found for this client. Add practices in the Client Information tab first."
              />
            </Card>
          )}

          {/* Unassigned connections (not linked to any practice) */}
          {unassignedConnections.length > 0 && (
            <Card
              title={
                <Space>
                  <span style={{ fontWeight: 600 }}>Unassigned Integrations</span>
                  <Tag color="orange">No Location</Tag>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
              extra={
                <Button
                  type="link"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddConnection()}
                >
                  Add Integration
                </Button>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {unassignedConnections.map(renderConnectionCard)}
              </Space>
            </Card>
          )}

          {/* Show flat view if no practices but there are unassigned connections */}
          {practices.length === 0 && unassignedConnections.length === 0 && (
            <Empty
              description="No integrations configured yet. Click 'Add Integration' to get started."
            />
          )}
        </>
      )}

      <PMSConnectionModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedPMSType(undefined);
          setSelectedPracticeId(undefined);
        }}
        onSuccess={handleConnectionCreated}
        pmsType={selectedPMSType}
        clientId={clientId}
        practiceId={selectedPracticeId}
      />
    </div>
  );
};

export default PMSIntegrationSection;
