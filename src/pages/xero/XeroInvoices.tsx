import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Select, Breadcrumb, Tag, Tabs, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import xeroService, { XeroInvoiceData, XeroTenant } from '../../services/xeroService';
import './XeroList.css';

const { Option } = Select;

const XeroInvoices: React.FC = () => {
  const shortId = (id: string) => id.replace(/-/g, '').substring(0, 8).toUpperCase();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<XeroInvoiceData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [tenants, setTenants] = useState<XeroTenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [selectedTenant, page, pageSize, activeTab, statusFilter]);

  const fetchTenants = async () => {
    try {
      const tenantList = await xeroService.getTenants();
      setTenants(tenantList);
    } catch (error: any) {
      // Silently handle - user needs to connect to Xero first
      console.log('Tenants not available - user may need to connect to Xero');
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params: any = {
        tenant_id: selectedTenant || undefined,
        page,
        page_size: pageSize,
      };

      if (activeTab === 'receivable') {
        params.type = 'ACCREC';
      } else if (activeTab === 'payable') {
        params.type = 'ACCPAY';
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await xeroService.getInvoices(params);
      setData(response.data);
      setTotal(response.total);
    } catch (error) {
      message.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item =>
    item.invoice_number?.toLowerCase().includes(searchText.toLowerCase()) ||
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
      case 'PAID': return 'green';
      case 'AUTHORISED': return 'blue';
      case 'DRAFT': return 'default';
      case 'SUBMITTED': return 'orange';
      case 'VOIDED': return 'red';
      default: return 'default';
    }
  };

  const columns: ColumnsType<XeroInvoiceData> = [
    {
      title: 'Invoice #',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 120,
      sorter: (a, b) => (a.invoice_number || '').localeCompare(b.invoice_number || ''),
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
      width: 120,
      render: (type) => (
        <Tag color={type === 'ACCREC' ? 'green' : 'orange'}>
          {type === 'ACCREC' ? 'Receivable' : 'Payable'}
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
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      width: 110,
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
      title: 'Amount Due',
      dataIndex: 'amount_due',
      key: 'amount_due',
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

  const tabItems = [
    { key: 'all', label: `All ${total}` },
    { key: 'receivable', label: 'Accounts Receivable' },
    { key: 'payable', label: 'Accounts Payable' },
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
        <Breadcrumb.Item>Invoices</Breadcrumb.Item>
      </Breadcrumb>

      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <div className="header-actions">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            size="large"
            placeholder="Status"
            allowClear
          >
            <Option value="PAID">Paid</Option>
            <Option value="AUTHORISED">Authorised</Option>
            <Option value="DRAFT">Draft</Option>
            <Option value="SUBMITTED">Submitted</Option>
            <Option value="VOIDED">Voided</Option>
          </Select>
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
            placeholder="Search by invoice #, contact, or reference..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            style={{ width: 350 }}
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <span style={{ color: '#6B7280' }}>Total: {total} invoices</span>
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
                <div className="empty-icon">📄</div>
                <p className="empty-text">No invoices found. Please sync data from Xero first.</p>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default XeroInvoices;
