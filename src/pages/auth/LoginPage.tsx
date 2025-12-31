import React, { useState } from 'react';
import { Button, Form, Input, Alert, Divider } from 'antd';
import { GoogleOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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

    // Demo credentials
    const DEMO_EMAIL = 'ajay.lad@workfin.com';
    const DEMO_PASSWORD = 'Demo@123';

    // Simulate login
    setTimeout(() => {
      if (values.email === DEMO_EMAIL && values.password === DEMO_PASSWORD) {
        setLoading(false);
        navigate('/dashboard');
      } else {
        setError('Invalid email or password. Use: ajay.lad@workfin.com / Demo@123');
        setLoading(false);
      }
    }, 1000);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    // Simulate Google login
    setTimeout(() => {
      setGoogleLoading(false);
      navigate('/dashboard');
    }, 1500);
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
              initialValue="ajay.lad@workfin.com"
            >
              <Input
                placeholder="ajay.lad@workfin.com"
                size="large"
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
              initialValue="Demo@123"
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
