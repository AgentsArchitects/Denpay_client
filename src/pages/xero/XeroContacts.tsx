import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Breadcrumb, Tag, Tabs, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import xeroService, { XeroContactData, XeroTenant } from '../../services/xeroService';
import './XeroList.css';

const { Option } = Select;

const XeroContacts: React.FC = () => {
  const shortId = (id: string) => id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<XeroContactData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tenants, setTenants] = useState<XeroTenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [selectedTenant, page, pageSize, activeTab]);

  const fetchTenants = async () => {
    try {
      const tenantList = await xeroService.getTenants();
      setTenants(tenantList);
    } catch (error: any) {
      // Silently handle - user needs to connect to Xero first
      console.log('Tenants not available - user may need to connect to Xero');
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params: any = {
        tenant_id: selectedTenant || undefined,
        page,
        page_size: pageSize,
      };

      if (activeTab === 'customers') {
        params.is_customer = true;
      } else if (activeTab === 'suppliers') {
        params.is_supplier = true;
      }

      const response = await xeroService.getContacts(params);
      setData(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error('Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.email_address?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<XeroContactData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'email_address',
      key: 'email_address',
      render: (email) => email || '-',
    },
    {
      title: 'Status',
      dataIndex: 'contact_status',
      key: 'contact_status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Type',
      key: 'type',
      width: 180,
      render: (_, record) => (
        <span>
          {record.is_customer && <Tag color="blue">Customer</Tag>}
          {record.is_supplier && <Tag color="orange">Supplier</Tag>}
        </span>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'default_currency',
      key: 'default_currency',
      width: 100,
      render: (currency) => currency || '-',
    },
    {
      title: 'Tax Number',
      dataIndex: 'tax_number',
      key: 'tax_number',
      width: 150,
      render: (tax) => tax || '-',
    },
    {
      title: 'Tenant',
      dataIndex: 'tenant_name',
      key: 'tenant_name',
      width: 150,
      render: (name: string) => name || '-',
    },
    {
      title: 'Integration ID',
      dataIndex: 'integration_id',
      key: 'integration_id',
      width: 120,
      render: (id: string) => id || '-',
    },
    {
      title: 'Tenant ID',
      dataIndex: 'tenant_id',
      key: 'tenant_id',
      width: 120,
      render: (id: string) => id ? shortId(id) : '-',
    },
  ];

  const customerCount = data.filter(c => c.is_customer).length;
  const supplierCount = data.filter(c => c.is_supplier).length;

  const tabItems = [
    { key: 'all', label: `All ${total}` },
    { key: 'customers', label: `Customers` },
    { key: 'suppliers', label: `Suppliers` },
  ];

  return (
    <div className="xero-list-container">
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Dashboard</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/xero/list">Xero</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Contacts</Breadcrumb.Item>
      </Breadcrumb>

      <div className="page-header">
        <h1 className="page-title">Contacts</h1>
        <div className="header-actions">
          <Select
            value={selectedTenant}
            onChange={setSelectedTenant}
            style={{ width: 250 }}
            size="large"
            placeholder="Select Organization"
          >
            <Option key="all" value="">All Organizations</Option>
            {tenants.map(tenant => (
              <Option key={tenant.tenant_id} value={tenant.tenant_id}>
                {tenant.tenant_name} ({shortId(tenant.tenant_id)})
              </Option>
            ))}
          </Select>
        </div>
      </div>

      <Card className="xero-list-card">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setPage(1);
          }}
          items={tabItems}
          className="xero-tabs"
        />

        <div className="table-toolbar">
          <Input
            placeholder="Search by name or email..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 300 }}
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span style={{ color: '#6B7280' }}>Total: {total} contacts</span>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps || 50);
            },
          }}
          locale={{
            emptyText: (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p className="empty-text">No contacts found. Please sync data from Xero first.</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default XeroContacts;
