import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, message, Alert } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';
import './AcceptInvitation.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: values.email,
      });
      setEmailSent(true);
    } catch (error: any) {
      // Still show success to prevent email enumeration
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="accept-invitation-container">
        <Card className="accept-invitation-card">
          <div className="invitation-header">
            <img src="/workfin_logo_full.svg" alt="Workfin" className="logo" />
            <h1>Check Your Email</h1>
          </div>
          <Alert
            message="Reset Link Sent"
            description="If an account exists with that email address, we've sent a password reset link. Please check your inbox and spam folder."
            type="success"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Button
            type="primary"
            block
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/login')}
          >
            Back to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="accept-invitation-container">
      <Card className="accept-invitation-card">
        <div className="invitation-header">
          <img src="/workfin_logo_full.svg" alt="Workfin" className="logo" />
          <h1>Forgot Password</h1>
        </div>

        <div className="invitation-info">
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="accept-invitation-form"
        >
          <Form.Item
            label="Email Address"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Enter your email address"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
            >
              Send Reset Link
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

export default ForgotPasswordPage;
