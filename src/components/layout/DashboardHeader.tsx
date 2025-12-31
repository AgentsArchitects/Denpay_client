import React from 'react';
import { Avatar } from 'antd';
import { MenuOutlined, MenuFoldOutlined } from '@ant-design/icons';
import './DashboardHeader.css';

interface DashboardHeaderProps {
  onUserClick: () => void;
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onUserClick, onMenuClick, sidebarCollapsed }) => {
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
            AL
          </Avatar>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
