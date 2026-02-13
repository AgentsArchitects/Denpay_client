import React, { useState } from 'react';
import { Layout } from 'antd';
import SidebarNav from './SidebarNav';
import UserProfilePanel from './UserProfilePanel';
import DashboardHeader from './DashboardHeader';
import './DashboardLayout.css';

const { Content } = Layout;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [userPanelVisible, setUserPanelVisible] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Layout className="dashboard-layout">
      <SidebarNav collapsed={sidebarCollapsed} />
      <Layout className={`dashboard-content-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <DashboardHeader
          onUserClick={() => setUserPanelVisible(true)}
          onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <Content className="dashboard-main-content">
          {children}
        </Content>
      </Layout>
      <UserProfilePanel
        visible={userPanelVisible}
        onClose={() => setUserPanelVisible(false)}
      />
    </Layout>
  );
};

export default DashboardLayout;
