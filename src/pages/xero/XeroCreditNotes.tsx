import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Breadcrumb, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import xeroService, { XeroTenant, XeroCreditNoteData } from '../../services/xeroService';
import './XeroList.css';

const { Option } = Select;

const XeroCreditNotes: React.FC = () => {
  const shortId = (id: string) => id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<XeroCreditNoteData[]>([]);
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
    fetchCreditNotes();
  }, [selectedTenant, page, pageSize]);

  const fetchTenants = async () => {
    try {
      const tenantList = await xeroService.getTenants();
      setTenants(tenantList);
    } catch (error: any) {
      console.log('Tenants not available - user may need to connect to Xero');
    }
  };

  const fetchCreditNotes = async () => {
    setLoading(true);
    try {
      const response = await xeroService.getCreditNotes({
        tenant_id: selectedTenant || undefined,
        page,
        page_size: pageSize,
      });
      setData(response.data);
      setTotal(response.total);
    } catch (error) {
      console.log('Failed to fetch credit notes');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    item.credit_note_number?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.contact_name?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.reference?.toLowerCase().includes(searchText.toLowerCase())
  );

  const formatCurrency = (amount: number, currency?: string | null) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'AUTHORISED': return 'green';
      case 'PAID': return 'blue';
      case 'DRAFT': return 'default';
      case 'VOIDED': return 'red';
      default: return 'default';
    }
  };

  const columns: ColumnsType<XeroCreditNoteData> = [
    {
      title: 'Credit Note #',
      dataIndex: 'credit_note_number',
      key: 'credit_note_number',
      width: 130,
      sorter: (a, b) => (a.credit_note_number || '').localeCompare(b.credit_note_number || ''),
    },
    {
      title: 'Contact',
      dataIndex: 'contact_name',
      key: 'contact_name',
      render: (name) => name || '-',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type) => (
        <Tag color={type === 'ACCRECCREDIT' ? 'green' : 'orange'}>
          {type === 'ACCRECCREDIT' ? 'Receivable' : 'Payable'}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
      sorter: (a, b) => (a.date || '').localeCompare(b.date || ''),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (total, record) => formatCurrency(total, record.currency_code),
      sorter: (a, b) => a.total - b.total,
    },
    {
      title: 'Remaining',
      dataIndex: 'remaining_credit',
      key: 'remaining_credit',
      width: 120,
      align: 'right',
      render: (amount, record) => formatCurrency(amount, record.currency_code),
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
        <Breadcrumb.Item>Credit Notes</Breadcrumb.Item>
      </Breadcrumb>

      <div className="page-header">
        <h1 className="page-title">Credit Notes</h1>
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
            placeholder="Search by credit note #, contact, or reference..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 350 }}
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span style={{ color: '#6B7280' }}>Total: {total} credit notes</span>
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
                <div className="empty-icon">📝</div>
                <p className="empty-text">No credit notes found. Please sync data from Xero first.</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default XeroCreditNotes;
