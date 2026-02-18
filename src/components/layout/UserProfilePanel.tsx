import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { Avatar, Divider, Button } from 'antd';
import {
  HomeOutlined,
  LockOutlined,
  CloseOutlined
} from '@ant-design/icons';
import './UserProfilePanel.css';

interface UserProfilePanelProps {
  visible: boolean;
  onClose: () => void;
}

interface UserData {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: Array<{
    role_type: string;
    tenant_id: string;
    practice_id: string | null;
    clinician_id: string | null;
    is_primary_role: boolean;
  }>;
  permissions: string[];
}

const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ visible, onClose }) => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    // Load user data from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserData(user);
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, [visible]); // Reload when panel becomes visible

  // Generate initials from name
  const getInitials = () => {
    if (!userData) return 'U';
    const firstInitial = userData.first_name?.charAt(0) || '';
    const lastInitial = userData.last_name?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  };

  // Get display name
  const getDisplayName = () => {
    if (!userData) return 'User';
    return `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'User';
  };

  // Get primary role
  const getPrimaryRole = () => {
    if (!userData || !userData.roles || userData.roles.length === 0) return 'No Role';
    const primaryRole = userData.roles.find(r => r.is_primary_role) || userData.roles[0];
    // Format role type: WORKFIN_ADMIN -> WorkFin Admin
    return primaryRole.role_type
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  return (
    <>
      {visible && <div className="user-panel-overlay" onClick={onClose} />}
      <div className={`user-profile-panel ${visible ? 'visible' : ''}`}>
        <div className="user-panel-header">
          <CloseOutlined className="close-icon" onClick={onClose} />
        </div>

        <div className="user-panel-content">
          <div className="user-profile-section">
            <Avatar size={80} className="user-avatar">
              {getInitials()}
            </Avatar>
            <h3 className="user-name">{getDisplayName()}</h3>
            <p className="user-email">{userData?.email || 'No email'}</p>
          </div>

          <Divider />

          <div className="user-menu-section">
            <div className="user-menu-item">
              <HomeOutlined className="menu-icon" />
              <span>Home</span>
            </div>
            <div className="user-menu-item">
              <LockOutlined className="menu-icon" />
              <span>Change Password</span>
            </div>
          </div>

          <Divider />

          <div className="user-info-section">
            <div className="info-label">User Roles:</div>
            <div className="info-value">{getPrimaryRole()}</div>
          </div>

          <div className="user-info-section">
            <div className="info-label">User ID:</div>
            <div className="info-value">{userData?.user_id || 'N/A'}</div>
          </div>

          <Divider />

          <Button
            type="primary"
            danger
            block
            size="large"
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </Button>
        </div>
      </div>
    </>
  );
};

export default UserProfilePanel;
