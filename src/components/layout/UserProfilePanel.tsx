import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Divider, Button } from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  LockOutlined,
  CloseOutlined
} from '@ant-design/icons';
import './UserProfilePanel.css';

interface UserProfilePanelProps {
  visible: boolean;
  onClose: () => void;
}

const UserProfilePanel: React.FC<UserProfilePanelProps> = ({ visible, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
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
              AL
            </Avatar>
            <h3 className="user-name">Ajay Lay</h3>
            <p className="user-email">ajay.lad@workfin.co.uk</p>
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
            <div className="info-value">WorkFin Admin</div>
          </div>

          <div className="user-info-section">
            <div className="info-label">WorkFin Admin ID:</div>
            <div className="info-value">00000000</div>
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
