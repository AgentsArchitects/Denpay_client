import React, { useState } from 'react';
import { Card, Form, Input, Button, Breadcrumb, Checkbox, message } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './WorkFinUserCreate.css';

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
  const [adminRole, setAdminRole] = useState(false);

  const handleCancel = () => {
    navigate('/users/list');
  };

  const handleSubmit = (values: any) => {
    // Get existing users from localStorage
    const existingUsers = JSON.parse(localStorage.getItem('workfinUsers') || '[]') as UserData[];

    if (isEditMode && userId) {
      // Update existing user
      const updatedUsers = existingUsers.map(user =>
        user.key === userId
          ? { ...user, name: values.fullName, email: values.email, role: adminRole ? 'Admin' : 'User' }
          : user
      );
      localStorage.setItem('workfinUsers', JSON.stringify(updatedUsers));
      message.success('User updated successfully');
    } else {
      // Create new user
      const newUser: UserData = {
        key: Date.now().toString(),
        name: values.fullName,
        email: values.email,
        role: adminRole ? 'Admin' : 'User',
        status: 'Active'
      };
      existingUsers.push(newUser);
      localStorage.setItem('workfinUsers', JSON.stringify(existingUsers));
      message.success('User created successfully');
    }

    navigate('/users/list');
  };

  // Pre-populate form in edit mode
  React.useEffect(() => {
    if (isEditMode && userId) {
      // Get user data from localStorage
      const existingUsers = JSON.parse(localStorage.getItem('workfinUsers') || '[]') as UserData[];
      const userData = existingUsers.find(user => user.key === userId);

      if (userData) {
        form.setFieldsValue({
          fullName: userData.name,
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
        <h1 className="page-title">{isEditMode ? 'Edit management user' : 'Create a management user'}</h1>
      </div>

      {/* Main Content Card */}
      <Card className="workfin-user-create-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Full name"
            name="fullName"
            rules={[{ required: true, message: 'Please enter full name' }]}
          >
            <Input placeholder="Enter full name" className="form-input" />
          </Form.Item>

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
            <Button type="primary" htmlType="submit" className="submit-btn">
              {isEditMode ? 'Update user' : 'Create user'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default WorkFinUserCreate;
