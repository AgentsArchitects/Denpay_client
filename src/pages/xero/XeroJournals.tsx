import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Breadcrumb, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import xeroService, { XeroJournalData, XeroTenant } from '../../services/xeroService';
import './XeroList.css';

const { Option } = Select;

const XeroJournals: React.FC = () => {
  const shortId = (id: string) => id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<XeroJournalData[]>([]);
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
    fetchJournals();
  }, [selectedTenant, page, pageSize]);

  const fetchTenants = async () => {
    try {
      const tenantList = await xeroService.getTenants();
      setTenants(tenantList);
    } catch (error: any) {
      console.log('Tenants not available - user may need to connect to Xero');
    }
  };

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const response = await xeroService.getJournals({
        tenant_id: selectedTenant || undefined,
        page,
        page_size: pageSize,
      });
      setData(response.data);
      setTotal(response.total);
    } catch (error) {
      console.log('Failed to fetch journals');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    item.reference?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.source_type?.toLowerCase().includes(searchText.toLowerCase()) ||
    String(item.journal_number).includes(searchText)
  );

  const getSourceTypeColor = (sourceType: string | null) => {
    switch (sourceType) {
      case 'ACCREC': return 'green';
      case 'ACCPAY': return 'orange';
      case 'CASHREC': return 'blue';
      case 'CASHPAID': return 'purple';
      case 'MANJOURNAL': return 'cyan';
      default: return 'default';
    }
  };

  const columns: ColumnsType<XeroJournalData> = [
    {
      title: 'Journal #',
      dataIndex: 'journal_number',
      key: 'journal_number',
      width: 100,
      sorter: (a, b) => (a.journal_number || 0) - (b.journal_number || 0),
    },
    {
      title: 'Date',
      dataIndex: 'journal_date',
      key: 'journal_date',
      width: 110,
      sorter: (a, b) => (a.journal_date || '').localeCompare(b.journal_date || ''),
    },
    {
      title: 'Source Type',
      dataIndex: 'source_type',
      key: 'source_type',
      width: 130,
      render: (type) => (
        <Tag color={getSourceTypeColor(type)}>{type || '-'}</Tag>
      ),
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (ref) => ref || '-',
    },
    {
      title: 'Synced At',
      dataIndex: 'synced_at',
      key: 'synced_at',
      width: 180,
      render: (date) => date ? new Date(date).toLocaleString() : '-',
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
        <Breadcrumb.Item>Journals</Breadcrumb.Item>
      </Breadcrumb>

      <div className="page-header">
        <h1 className="page-title">Journals</h1>
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
            placeholder="Search by journal #, reference, or source type..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 350 }}
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span style={{ color: '#6B7280' }}>Total: {total} journals</span>
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
                <p className="empty-text">No journals found. Please sync data from Xero first.</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default XeroJournals;
