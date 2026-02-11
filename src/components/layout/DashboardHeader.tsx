import React, { useState, useEffect } from 'react';
import { Avatar } from 'antd';
import { MenuOutlined, MenuFoldOutlined } from '@ant-design/icons';
import './DashboardHeader.css';

interface DashboardHeaderProps {
  onUserClick: () => void;
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

interface UserData {
  first_name: string;
  last_name: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onUserClick, onMenuClick, sidebarCollapsed }) => {
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserData(user);
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, []);

  // Generate initials from name
  const getInitials = () => {
    if (!userData) return 'U';
    const firstInitial = userData.first_name?.charAt(0) || '';
    const lastInitial = userData.last_name?.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  };

  return (
    <div className="dashboard-header-bar">
      <div className="header-left">
        <div className="menu-trigger" onClick={onMenuClick}>
          {sidebarCollapsed ? <MenuOutlined /> : <MenuFoldOutlined />}
        </div>
      </div>
      <div className="header-right">
        <div className="user-trigger" onClick={onUserClick}>
          <Avatar size={40} className="header-avatar">
            {getInitials()}
          </Avatar>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
