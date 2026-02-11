import React, { useState, useEffect } from 'react';
import { Card, Table, Input, Button, Breadcrumb, Tag, Modal, message, Spin } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './WorkFinUserList.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface UserData {
  key: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Invited';
}

const { confirm } = Modal;

const WorkFinUserList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API_BASE_URL}/users/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const usersData = response.data.map((user: any) => ({
        key: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status
      }));

      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = (record: UserData) => {
    const actionText = record.status === 'Invited' ? 'Cancel Invitation' : 'Delete User';
    const contentText = record.status === 'Invited'
      ? `Are you sure you want to cancel the invitation for ${record.email}?`
      : `Are you sure you want to delete ${record.name}?`;

    confirm({
      title: actionText,
      icon: <ExclamationCircleOutlined />,
      content: contentText,
      okText: actionText,
      okType: 'danger',
      cancelText: 'Cancel',
      async onOk() {
        try {
          const token = localStorage.getItem('access_token');
          await axios.delete(`${API_BASE_URL}/users/${record.key}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          message.success(record.status === 'Invited' ? 'Invitation cancelled' : 'User deleted successfully');
          fetchUsers(); // Refresh the list
        } catch (error) {
          message.error('Failed to delete user');
        }
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
      render: (status: string) => {
        let color = 'success';
        if (status === 'Invited') color = 'warning';
        if (status === 'Inactive') color = 'default';

        return (
          <Tag color={color} className="status-tag">
            {status}
          </Tag>
        );
      },
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
            disabled={record.status === 'Invited'}
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
          loading={loading}
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
