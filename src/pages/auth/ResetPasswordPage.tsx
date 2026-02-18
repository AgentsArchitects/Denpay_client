import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, message, Alert } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import './AcceptInvitation.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const token = searchParams.get('token');

  if (!token) {
    return (
      <div className="accept-invitation-container">
        <Card className="accept-invitation-card">
          <div className="invitation-header">
            <img src="/workfin_logo_full.svg" alt="Workfin" className="logo" />
          </div>
          <Alert
            message="Invalid Reset Link"
            description="No reset token provided. Please request a new password reset."
            type="error"
            showIcon
          />
          <Button
            type="primary"
            block
            onClick={() => navigate('/forgot-password')}
            style={{ marginTop: 20 }}
          >
            Request New Reset Link
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (values: { password: string; confirmPassword: string }) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token: token,
        new_password: values.password,
        confirm_password: values.confirmPassword,
      });
      message.success(response.data.message || 'Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Failed to reset password. The link may have expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="accept-invitation-container">
      <Card className="accept-invitation-card">
        <div className="invitation-header">
          <img src="/workfin_logo_full.svg" alt="Workfin" className="logo" />
          <h1>Reset Your Password</h1>
        </div>

        <div className="invitation-info">
          <p>Enter your new password below.</p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="accept-invitation-form"
        >
          <Form.Item
            label="New Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Password must contain uppercase, lowercase, and number',
              },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter new password"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Confirm Password"
            name="confirmPassword"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm new password"
              size="large"
            />
          </Form.Item>

          <div className="password-requirements">
            <p>Password requirements:</p>
            <ul>
              <li>At least 8 characters long</li>
              <li>Contains uppercase and lowercase letters</li>
              <li>Contains at least one number</li>
            </ul>
          </div>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              Reset Password
            </Button>
          </Form.Item>
        </Form>

        <div className="accept-invitation-footer">
          <p><a href="/login"><ArrowLeftOutlined /> Back to Login</a></p>
        </div>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
