import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Breadcrumb, Tag, Modal, message } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import './WorkFinUserList.css';

interface UserData {
  key: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

const { confirm } = Modal;

const WorkFinUserList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);

  // Initial default users
  const defaultUsers: UserData[] = [
    { key: '1', name: 'Chirag Nathwani', email: 'chirag.nathwani@workfin.co.uk', role: 'Admin', status: 'Active' },
    { key: '2', name: 'Ajay Lad', email: 'ajay.lad@workfin.co.uk', role: 'Admin', status: 'Active' },
    { key: '3', name: 'Shoaib Shaikh', email: 'shoaib.shaikh@workfin.co.uk', role: 'Admin', status: 'Active' },
    { key: '4', name: 'Avinash Choudhary', email: 'avinash.choudhary@workfin.co.uk', role: 'Admin', status: 'Active' },
    { key: '5', name: 'John Cooper', email: 'john.cooper@workfin.co.uk', role: 'Admin', status: 'Active' },
  ];

  // Load users from localStorage on mount
  useEffect(() => {
    const storedUsers = localStorage.getItem('workfinUsers');
    if (storedUsers) {
      const parsedUsers = JSON.parse(storedUsers);
      setUsers(parsedUsers);
      setFilteredUsers(parsedUsers);
    } else {
      // Initialize with default users
      localStorage.setItem('workfinUsers', JSON.stringify(defaultUsers));
      setUsers(defaultUsers);
      setFilteredUsers(defaultUsers);
    }
  }, []);

  const handleDelete = (record: UserData) => {
    confirm({
      title: 'Delete User',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete ${record.name}?`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        const updatedUsers = users.filter(user => user.key !== record.key);
        setUsers(updatedUsers);
        setFilteredUsers(updatedUsers);
        localStorage.setItem('workfinUsers', JSON.stringify(updatedUsers));
        message.success('User deleted successfully');
      },
    });
  };

  const handleSearch = (value: string) => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(value.toLowerCase()) ||
      user.email.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const columns: ColumnsType<UserData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <div className="user-name">{text}</div>
          <div className="user-email">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Roles',
      dataIndex: 'role',
      key: 'role',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color="success" className="status-tag">
          {status}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <div className="action-buttons">
          <Button
            type="text"
            icon={<EditOutlined />}
            className="action-btn edit-btn"
            onClick={() => navigate(`/users/edit/${record.key}`)}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            className="action-btn delete-btn"
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="workfin-user-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/users/list">User</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>List</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">User List</h1>
        <div className="header-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="add-user-btn"
            onClick={() => navigate('/users/create')}
          >
            New user
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="workfin-user-card">
        {/* Tab */}
        <div className="user-tab">
          <span className="tab-item active">All <span className="tab-count">{filteredUsers.length}</span></span>
        </div>

        {/* Search */}
        <div className="search-wrapper">
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
            className="search-input"
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filteredUsers}
          pagination={{
            pageSize: 5,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
            position: ['bottomRight'],
          }}
        />
      </Card>
    </div>
  );
};

export default WorkFinUserList;
