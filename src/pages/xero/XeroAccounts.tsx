import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Breadcrumb, Tag, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import xeroService, { XeroAccountData, XeroTenant } from '../../services/xeroService';
import './XeroList.css';

const { Option } = Select;

const XeroAccounts: React.FC = () => {
  const shortId = (id: string) => id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<XeroAccountData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tenants, setTenants] = useState<XeroTenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [selectedTenant, page, pageSize]);

  const fetchTenants = async () => {
    try {
      const tenantList = await xeroService.getTenants();
      setTenants(tenantList);
    } catch (error: any) {
      // Silently handle - user needs to connect to Xero first
      console.log('Tenants not available - user may need to connect to Xero');
    }
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await xeroService.getAccounts({
        tenant_id: selectedTenant || undefined,
        page,
        page_size: pageSize,
      });
      setData(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    item.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.code?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnsType<XeroAccountData> = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      sorter: (a, b) => (a.code || '').localeCompare(b.code || ''),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Class',
      dataIndex: 'class',
      key: 'class',
      width: 120,
      render: (cls) => cls ? <Tag color="purple">{cls}</Tag> : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Currency',
      dataIndex: 'currency_code',
      key: 'currency_code',
      width: 100,
    },
    {
      title: 'Tax Type',
      dataIndex: 'tax_type',
      key: 'tax_type',
      width: 120,
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

  return (
    <div className="xero-list-container">
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Dashboard</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/xero/list">Xero</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Accounts</Breadcrumb.Item>
      </Breadcrumb>

      <div className="page-header">
        <h1 className="page-title">Chart of Accounts</h1>
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
        <div className="table-toolbar">
          <Input
            placeholder="Search by name or code..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 300 }}
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span style={{ color: '#6B7280' }}>Total: {total} accounts</span>
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
                <div className="empty-icon">📊</div>
                <p className="empty-text">No accounts found. Please sync data from Xero first.</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default XeroAccounts;
