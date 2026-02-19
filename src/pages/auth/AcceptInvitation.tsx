import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Input, Button, message, Spin, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import axios from 'axios';
import { CLIENT_PORTAL_URL } from '../../config/constants';
import './AcceptInvitation.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface InvitationInfo {
  email: string;
  role_type: string;
  expires_at: string;
}

const AcceptInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitationValid, setInvitationValid] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');
  const userType = searchParams.get('type');

  // Validate invitation token on page load
  useEffect(() => {
    if (!token) {
      setErrorMessage('No invitation token provided');
      setValidating(false);
      return;
    }

    // For now, we'll skip validation and proceed directly
    // In production, you'd want to validate the token first via an API call
    setValidating(false);
    setInvitationValid(true);
  }, [token]);

  const handleSubmit = async (values: any) => {
    if (!token) {
      message.error('Invalid invitation link');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/accept-invitation`,
        {
          token: token,
          password: values.password,
          confirm_password: values.confirmPassword
        }
      );

      if (response.data.success) {
        message.success('Account created successfully! Redirecting...');

        // Redirect based on user type
        setTimeout(() => {
          // CLIENT_ADMIN and CLINICIAN users go to Client Portal
          // WORKFIN_ADMIN users can login to onboarding portal
          if (userType === 'client_admin' || userType === 'clinician') {
            window.location.href = CLIENT_PORTAL_URL;
          } else {
            navigate('/login');
          }
        }, 2000);
      } else {
        message.error(response.data.message || 'Failed to create account');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      if (error.response?.data?.detail) {
        message.error(error.response.data.detail);
      } else {
        message.error('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getUserTypeDisplay = () => {
    switch (userType) {
      case 'workfin_admin':
        return 'Workfin Admin';
      case 'client_admin':
        return 'Client Administrator';
      case 'practice_user':
        return 'Practice User';
      case 'clinician':
        return 'Clinician';
      default:
        return 'User';
    }
  };

  if (validating) {
    return (
      <div className="accept-invitation-container">
        <div className="validation-spinner">
          <Spin size="large" tip="Validating invitation..." />
        </div>
      </div>
    );
  }

  if (!invitationValid || errorMessage) {
    return (
      <div className="accept-invitation-container">
        <Card className="accept-invitation-card">
          <div className="invitation-header">
            <img src="/workfin_logo_full.svg" alt="Workfin" className="logo" />
          </div>
          <Alert
            message="Invalid Invitation"
            description={errorMessage || 'This invitation link is invalid or has expired.'}
            type="error"
            showIcon
          />
          <Button
            type="primary"
            block
            onClick={() => navigate('/login')}
            style={{ marginTop: '20px' }}
          >
            Go to Login
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
          <h1>Welcome to Workfin Denpay</h1>
          <p className="role-badge">{getUserTypeDisplay()}</p>
        </div>

        <div className="invitation-info">
          <p>You've been invited to join Workfin Denpay. Create your password to activate your account.</p>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="accept-invitation-form"
        >
          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 8, message: 'Password must be at least 8 characters' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Password must contain uppercase, lowercase, and number'
              }
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Create your password"
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
              placeholder="Confirm your password"
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
              Create Account
            </Button>
          </Form.Item>
        </Form>

        <div className="accept-invitation-footer">
          <p>Already have an account? <a href="/login">Login here</a></p>
        </div>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
