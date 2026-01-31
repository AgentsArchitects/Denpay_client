import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Breadcrumb, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import xeroService, { XeroJournalLineData, XeroTenant } from '../../services/xeroService';
import './XeroList.css';

const { Option } = Select;

const XeroJournalLines: React.FC = () => {
  const shortId = (id: string) => id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<XeroJournalLineData[]>([]);
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
    fetchJournalLines();
  }, [selectedTenant, page, pageSize]);

  const fetchTenants = async () => {
    try {
      const tenantList = await xeroService.getTenants();
      setTenants(tenantList);
    } catch (error: any) {
      console.log('Tenants not available - user may need to connect to Xero');
    }
  };

  const fetchJournalLines = async () => {
    setLoading(true);
    try {
      const response = await xeroService.getJournalLines({
        tenant_id: selectedTenant || undefined,
        page,
        page_size: pageSize,
      });
      setData(response.data);
      setTotal(response.total);
    } catch (error) {
      console.log('Failed to fetch journal lines:', error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    item.account_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.account_code?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const columns: ColumnsType<XeroJournalLineData> = [
    {
      title: 'Account Code',
      dataIndex: 'account_code',
      key: 'account_code',
      width: 120,
      render: (code) => code || '-',
    },
    {
      title: 'Account Name',
      dataIndex: 'account_name',
      key: 'account_name',
      render: (name) => name || '-',
    },
    {
      title: 'Account Type',
      dataIndex: 'account_type',
      key: 'account_type',
      width: 120,
      render: (type) => type ? (
        <Tag color="blue">{type}</Tag>
      ) : '-',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc) => desc || '-',
    },
    {
      title: 'Net Amount',
      dataIndex: 'net_amount',
      key: 'net_amount',
      width: 130,
      align: 'right',
      render: (amount) => (
        <span style={{ color: amount >= 0 ? 'green' : 'red' }}>
          {formatCurrency(amount)}
        </span>
      ),
      sorter: (a, b) => a.net_amount - b.net_amount,
    },
    {
      title: 'Gross Amount',
      dataIndex: 'gross_amount',
      key: 'gross_amount',
      width: 130,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Tax Amount',
      dataIndex: 'tax_amount',
      key: 'tax_amount',
      width: 110,
      align: 'right',
      render: (amount) => formatCurrency(amount),
    },
    {
      title: 'Tax Type',
      dataIndex: 'tax_type',
      key: 'tax_type',
      width: 100,
      render: (type) => type || '-',
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
        <Breadcrumb.Item>Journal Lines</Breadcrumb.Item>
      </Breadcrumb>

      <div className="page-header">
        <h1 className="page-title">Journal Lines</h1>
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
            placeholder="Search by account name, code, or description..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 400 }}
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span style={{ color: '#6B7280' }}>Total: {total} lines</span>
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
              setPageSize(ps || 20);
            },
          }}
          locale={{
            emptyText: (
              <div className="empty-state">
                <div className="empty-icon">📒</div>
                <p className="empty-text">No journal lines found. Please sync data from Xero first.</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default XeroJournalLines;
