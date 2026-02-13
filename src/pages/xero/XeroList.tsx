import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Button, Tabs, Dropdown, Breadcrumb, message, Tag } from 'antd';
import { SearchOutlined, PlusOutlined, PrinterOutlined, DownloadOutlined, UploadOutlined, MoreOutlined, LoadingOutlined, SyncOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link, useSearchParams } from 'react-router-dom';
import xeroService from '../../services/xeroService';
import clientService, { Client } from '../../services/clientService';
import './XeroList.css';

const { Option } = Select;

interface XeroIntegration {
  key: string;
  id: string;
  integrationName: string;
  tenantId: string;
  status: 'Active' | 'Unauthenticated' | 'Removed';
}

const XeroList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [connecting, setConnecting] = useState(false);
  const [_loading, setLoading] = useState(false);
  const [data, setData] = useState<XeroIntegration[]>([]);

  // Fetch clients and tenants on mount
  useEffect(() => {
    fetchClients();
    fetchTenants();
  }, []);

  // Refetch tenants when selected client changes
  useEffect(() => {
    if (selectedClient) {
      fetchTenants();
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const clientList = await clientService.getClients();
      setClients(clientList);
      if (clientList.length > 0 && !selectedClient) {
        setSelectedClient(clientList[0].id || '');
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      setClients([]);
    }
  };

  // Check URL params for connection status after fetching tenants
  useEffect(() => {
    const xeroStatus = searchParams.get('xero');
    if (xeroStatus === 'connected') {
      message.success('Successfully connected to Xero!');
      window.history.replaceState({}, '', '/xero/list');
      fetchTenants();
    } else if (xeroStatus === 'error') {
      // Only show error if we don't have any connected tenants
      // (the error might be a transient DB issue but Xero connection still worked)
      if (data.length === 0) {
        const errorMsg = searchParams.get('message') || 'Unknown error';
        // Don't show technical errors to users
        if (!errorMsg.includes('getaddrinfo') && !errorMsg.includes('prepared statement')) {
          message.error(`Failed to connect: ${errorMsg}`);
        }
      }
      window.history.replaceState({}, '', '/xero/list');
    }
  }, [searchParams, data.length]);

  const fetchTenants = async (retryCount = 0) => {
    setLoading(true);
    try {
      const tenants = await xeroService.getTenants(selectedClient);
      const integrations: XeroIntegration[] = tenants.map((tenant, index) => ({
        key: tenant.tenant_id,
        id: String(index + 1).padStart(3, '0'),
        integrationName: tenant.tenant_name,
        tenantId: tenant.tenant_id,
        status: 'Active' as const,
      }));
      setData(integrations);
    } catch (error: any) {
      // Retry once after a short delay (handles transient DB issues)
      if (retryCount === 0 && error?.status !== 401) {
        setTimeout(() => fetchTenants(1), 500);
        return;
      }
      if (error?.status !== 401) {
        console.error('Failed to fetch tenants:', error);
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectToXero = async () => {
    try {
      setConnecting(true);
      await xeroService.connectToXero(selectedClient || undefined);
    } catch (error) {
      console.error('Failed to connect to Xero:', error);
      message.error('Failed to initiate Xero connection. Please try again.');
      setConnecting(false);
    }
  };

  const handleSyncData = async (tenantId: string, tenantName: string, fullSync: boolean = false) => {
    try {
      message.loading({ content: `Syncing data from ${tenantName}...`, key: 'sync' });
      const results = fullSync
        ? await xeroService.syncAll(tenantId)
        : await xeroService.syncQuick(tenantId, 20);
      const successCount = results.filter(r => r.status === 'success').length;
      const totalRecords = results.reduce((sum, r) => sum + r.synced_count, 0);
      message.success({ content: `Synced ${totalRecords} records (${successCount} entities) from ${tenantName}!`, key: 'sync' });
    } catch (error) {
      message.error({ content: 'Failed to sync data', key: 'sync' });
    }
  };

  const clientOptions = clients.map((c: any) => ({
    value: c.id || '',
    label: c.legal_client_trading_name || c.legal_trading_name || c.id,
  }));

  const getActionMenuItems = (record: XeroIntegration) => [
    {
      key: 'quick-sync',
      icon: <SyncOutlined />,
      label: 'Quick Sync (Top 20)',
      onClick: () => handleSyncData(record.tenantId, record.integrationName, false),
    },
    {
      key: 'full-sync',
      icon: <SyncOutlined />,
      label: 'Full Sync (All Data)',
      onClick: () => handleSyncData(record.tenantId, record.integrationName, true),
    },
    {
      key: 'print',
      icon: <PrinterOutlined />,
      label: 'Print',
    },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: 'Export',
    }
  ];

  const tableActionMenuItems = [
    {
      key: 'print',
      icon: <PrinterOutlined />,
      label: 'Print',
    },
    {
      key: 'import',
      icon: <UploadOutlined />,
      label: 'Import',
    },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: 'Export',
    }
  ];

  const columns: ColumnsType<XeroIntegration> = [
    {
      title: 'Id',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: 'Integration Name',
      dataIndex: 'integrationName',
      key: 'integrationName',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : status === 'Unauthenticated' ? 'orange' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Dropdown menu={{ items: getActionMenuItems(record) }} trigger={['click']} placement="bottomRight">
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const activeCount = data.filter(d => d.status === 'Active').length;
  const unauthCount = data.filter(d => d.status === 'Unauthenticated').length;
  const removedCount = data.filter(d => d.status === 'Removed').length;

  const tabItems = [
    {
      key: 'all',
      label: `All ${data.length}`,
    },
    {
      key: 'active',
      label: `Active ${activeCount}`,
    },
    {
      key: 'unauthenticated',
      label: `Unauthenticated ${unauthCount}`,
    },
    {
      key: 'removed',
      label: `Removed ${removedCount}`,
    },
  ];

  return (
    <div className="xero-list-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Dashboard</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/xero">Xero</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>List</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">List</h1>
        <div className="header-actions">
          <Select
            value={selectedClient || undefined}
            onChange={setSelectedClient}
            placeholder="Select Client"
            style={{ width: 250 }}
            size="large"
          >
            {clientOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
          <Button
            type="primary"
            icon={connecting ? <LoadingOutlined /> : <PlusOutlined />}
            size="large"
            className="connect-btn"
            onClick={handleConnectToXero}
            loading={connecting}
          >
            Connect to Xero
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="xero-list-card">
        {/* Tabs */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="xero-tabs"
        />

        {/* Search and Actions */}
        <div className="table-toolbar">
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 300 }}
            className="search-input"
          />
          <Dropdown menu={{ items: tableActionMenuItems }} trigger={['click']} placement="bottomRight">
            <Button type="text" icon={<MoreOutlined />} className="action-dots-btn" />
          </Dropdown>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={data}
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            position: ['bottomRight'],
          }}
          locale={{
            emptyText: (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p className="empty-text">No data</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default XeroList;
