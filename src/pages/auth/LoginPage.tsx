import React, { useState } from 'react';
import { Button, Form, Input, Alert, Divider, message } from 'antd';
import { GoogleOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { API_ENDPOINTS } from '../../config/constants';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      // Call real authentication API
      const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, {
        email: values.email,
        password: values.password,
      });

      const { access_token, refresh_token, user } = response.data;

      // Store tokens and user info in localStorage
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      // Check user role and redirect accordingly
      const userRole = user.role || user.role_type;

      // CLIENT_ADMIN and CLINICIAN users should use the Client Portal, not the onboarding portal
      if (userRole === 'CLIENT_ADMIN' || userRole === 'CLINICIAN' || userRole === 'Clinician') {
        message.info('Redirecting to Client Portal...');
        setTimeout(() => {
          window.location.href = 'https://api-uat-uk-workfin-03.azurewebsites.net';
        }, 1000);
      } else {
        message.success('Login successful!');
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || err.response?.data?.detail || '';

      // Non-WorkFin users: show alert and redirect to Client Portal
      if (err.status === 403 || errorMessage === 'Login to Client Portal') {
        setError('This portal is for WorkFin Admin users only. Redirecting you to the Client Portal...');
        setLoading(false);
        window.setTimeout(() => {
          window.location.replace('https://api-uat-uk-workfin-03.azurewebsites.net');
        }, 2000);
        return;
      }

      setError(errorMessage || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    // TODO: Implement Google OAuth when ready
    message.info('Google login not yet implemented');
    setGoogleLoading(false);
  };

  return (
    <div className="login-container">
      {/* Left Side - Animated Hero */}
      <div className="login-hero">
        <div className="hero-content">
          {/* Logo */}
          <div className="hero-logo">
            <img
              src="/workfin_logo_full.svg"
              alt="WorkFin Logo"
              style={{ height: '50px', width: 'auto' }}
            />
          </div>

          {/* Hero Image */}
          <div className="hero-illustration">
            <img
              src="/hero-image.png"
              alt="DenPay Healthcare"
              className="hero-main-image"
            />
          </div>
        </div>

        {/* Decorative Grid */}
        <div className="grid-overlay"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-form-section">
        <div className="login-card">
          <h1 className="login-title">
            Sign in to your<br />account denpay
          </h1>

          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              className="login-error"
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            requiredMark={false}
            className="login-form"
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                placeholder="your-email@workfin.com"
                size="large"
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                placeholder="••••••••"
                size="large"
                className="login-input"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                className="login-button"
                block
              >
                {loading ? 'Signing in...' : 'SIGN IN'}
              </Button>
            </Form.Item>
          </Form>

          <div className="forgot-password">
            <a href="/forgot-password">Forgot password?</a>
          </div>

          <div className="signup-link">
            <span>Don't have an account? </span>
            <a href="/signup">Sign up</a>
          </div>

          <Divider className="login-divider">
            <span>OR</span>
          </Divider>

          <Button
            size="large"
            icon={<GoogleOutlined />}
            onClick={handleGoogleLogin}
            loading={googleLoading}
            className="google-button"
            block
          >
            {googleLoading ? 'Signing in...' : 'Login with Google'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
