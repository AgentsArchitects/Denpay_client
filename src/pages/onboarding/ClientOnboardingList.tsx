import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Breadcrumb, Tag, message, Modal } from 'antd';
import { SearchOutlined, PlusOutlined, UserOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, UndoOutlined, MailOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import clientService from '../../services/clientService';
import './ClientOnboardingList.css';

interface ClientData {
  key: string;
  tenantId: string;
  tradingName: string;
  entityReference: string;
  date: string;
  status: 'Active' | 'Inactive' | 'Pending Invite';
}

interface ClientFromAPI {
  id: string;
  tenant_id: string;
  legal_trading_name: string;
  workfin_reference: string;
  status: string;
  contact_email: string;
  contact_phone: string;
  client_type: string | null;
  created_at: string;
}

const ClientOnboardingList: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch clients from database
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await clientService.getClients() as any;

      // Transform API response to match table data structure
      const transformedData: ClientData[] = response.map((client: ClientFromAPI) => ({
        key: client.id,
        tenantId: client.tenant_id || '-',
        tradingName: client.legal_trading_name,
        entityReference: client.workfin_reference,
        date: formatDate(client.created_at),
        status: client.status as 'Active' | 'Inactive' | 'Pending Invite'
      }));

      setClients(transformedData);
    } catch (error: any) {
      console.error('Failed to fetch clients:', error);
      message.error('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleStatusToggle = (clientId: string, clientName: string, currentStatus: 'Active' | 'Inactive') => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const action = currentStatus === 'Active' ? 'deactivate' : 'activate';

    Modal.confirm({
      title: `${currentStatus === 'Active' ? 'Deactivate' : 'Activate'} Client`,
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to ${action} "${clientName}"?`,
      okText: currentStatus === 'Active' ? 'Deactivate' : 'Activate',
      okType: currentStatus === 'Active' ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await clientService.deleteClient(clientId);
          message.success(`Client status changed to ${newStatus} successfully`);
          // Refresh the client list
          fetchClients();
        } catch (error: any) {
          console.error('Failed to change client status:', error);
          message.error('Failed to change client status. Please try again.');
        }
      }
    });
  };

  const handleResendInvitation = (clientId: string, clientName: string) => {
    Modal.confirm({
      title: 'Resend Invitation',
      icon: <MailOutlined />,
      content: `Resend invitation email to the contact for "${clientName}"?`,
      okText: 'Resend',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await clientService.resendInvitation(clientId);
          message.success('Invitation email resent successfully');
        } catch (error: any) {
          message.error(error?.response?.data?.detail || 'Failed to resend invitation');
        }
      }
    });
  };

  const columns: ColumnsType<ClientData> = [
    {
      title: 'Tenant ID',
      dataIndex: 'tenantId',
      key: 'tenantId',
      width: 110,
      render: (text) => (
        <Tag color="purple" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: 'Legal Client Trading Name',
      dataIndex: 'tradingName',
      key: 'tradingName',
      render: (text) => <span className="client-name-link">{text}</span>,
    },
    {
      title: 'WorkFin Legal Entity Reference',
      dataIndex: 'entityReference',
      key: 'entityReference',
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'Active' ? 'success' : status === 'Pending Invite' ? 'warning' : 'error';
        return <Tag color={color} className="status-tag">{status}</Tag>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      align: 'center',
      render: (_, record) => (
        <div className="action-buttons">
          <Button
            type="text"
            icon={<UserOutlined />}
            className="action-btn user-btn"
            onClick={() => navigate(`/onboarding/${record.key}/users`)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            className="action-btn edit-btn"
            onClick={() => navigate(`/onboarding/edit/${record.key}`)}
          />
          {record.status === 'Pending Invite' && (
            <Button
              type="text"
              icon={<MailOutlined />}
              className="action-btn"
              title="Resend invitation email"
              onClick={() => handleResendInvitation(record.key, record.tradingName)}
            />
          )}
          <Button
            type="text"
            icon={record.status === 'Active' ? <DeleteOutlined /> : <UndoOutlined />}
            className={`action-btn ${record.status === 'Active' ? 'delete-btn' : 'restore-btn'}`}
            onClick={() => handleStatusToggle(record.key, record.tradingName, record.status as 'Active' | 'Inactive')}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="client-onboarding-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Account Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/onboarding">User Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Client Management</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Client Management Listing</h1>
        <div className="header-actions">
          <Input
            placeholder="Search"
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 250 }}
            className="search-input"
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="add-client-btn"
            onClick={() => navigate('/onboarding/create')}
          >
            Add Client
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="client-onboarding-card">
        {/* Tab */}
        <div className="client-tab">
          <span className="tab-item active">All <span className="tab-count">{clients.length}</span></span>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={clients}
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            position: ['bottomRight'],
          }}
        />
      </Card>
    </div>
  );
};

export default ClientOnboardingList;
