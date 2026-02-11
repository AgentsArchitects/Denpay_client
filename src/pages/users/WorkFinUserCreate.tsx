import React, { useState } from 'react';
import { Card, Form, Input, Button, Breadcrumb, Checkbox, message } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './WorkFinUserCreate.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface UserData {
  key: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

const WorkFinUserCreate: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const isEditMode = !!userId;
  const [form] = Form.useForm();
  const [adminRole, setAdminRole] = useState(true); // Default to admin for Workfin Admin creation
  const [loading, setLoading] = useState(false);

  const handleCancel = () => {
    navigate('/users/list');
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);

    try {
      if (isEditMode && userId) {
        // Update existing user (localStorage for now)
        const existingUsers = JSON.parse(localStorage.getItem('workfinUsers') || '[]') as UserData[];
        const updatedUsers = existingUsers.map(user =>
          user.key === userId
            ? { ...user, name: `${values.firstName} ${values.lastName}`, email: values.email, role: adminRole ? 'Admin' : 'User' }
            : user
        );
        localStorage.setItem('workfinUsers', JSON.stringify(updatedUsers));
        message.success('User updated successfully');
        navigate('/users/list');
      } else {
        // Create new Workfin Admin - Send invitation via API
        const invitationData = {
          email: values.email,
          first_name: values.firstName,
          last_name: values.lastName
        };

        const token = localStorage.getItem('access_token');
        const response = await axios.post(
          `${API_BASE_URL}/users/workfin-admin/invite`,
          invitationData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.success) {
          message.success(response.data.message || 'Invitation sent successfully!');
          navigate('/users/list');
        } else {
          message.warning(response.data.message || 'Invitation created but email not sent');
          navigate('/users/list');
        }
      }
    } catch (error: any) {
      console.error('Error creating Workfin Admin:', error);
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Failed to send invitation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pre-populate form in edit mode
  React.useEffect(() => {
    if (isEditMode && userId) {
      // Get user data from localStorage
      const existingUsers = JSON.parse(localStorage.getItem('workfinUsers') || '[]') as UserData[];
      const userData = existingUsers.find(user => user.key === userId);

      if (userData) {
        // Split name into first and last name
        const nameParts = userData.name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        form.setFieldsValue({
          firstName: firstName,
          lastName: lastName,
          email: userData.email
        });
        setAdminRole(userData.role === 'Admin');
      }
    }
  }, [isEditMode, userId, form]);

  return (
    <div className="workfin-user-create-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/users/list">User</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{isEditMode ? 'Edit user' : 'New user'}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{isEditMode ? 'Edit workfin admin' : 'Create workfin admin'}</h1>
      </div>

      {/* Main Content Card */}
      <Card className="workfin-user-create-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="First name"
              name="firstName"
              rules={[{ required: true, message: 'Please enter first name' }]}
            >
              <Input placeholder="Enter first name" className="form-input" />
            </Form.Item>

            <Form.Item
              label="Last name"
              name="lastName"
              rules={[{ required: true, message: 'Please enter last name' }]}
            >
              <Input placeholder="Enter last name" className="form-input" />
            </Form.Item>
          </div>

          <Form.Item
            label="Email address"
            name="email"
            rules={[
              { required: true, message: 'Please enter email address' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter email address" className="form-input" />
          </Form.Item>

          <Form.Item label="Roles" className="roles-section">
            <Checkbox
              checked={adminRole}
              onChange={(e) => setAdminRole(e.target.checked)}
              className="role-checkbox"
            >
              My WorkFin Management - Admin
            </Checkbox>
          </Form.Item>

          <div className="form-actions">
            <Button className="cancel-btn" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" className="submit-btn" loading={loading}>
              {isEditMode ? 'Update user' : 'Create user'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default WorkFinUserCreate;
