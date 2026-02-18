import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import { Tooltip } from 'antd';
import {
  HomeOutlined,
  DollarOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  CalendarOutlined,
  LogoutOutlined,
  DownOutlined,
  ApiOutlined
} from '@ant-design/icons';
import './SidebarNav.css';

interface SidebarNavProps {
  collapsed: boolean;
}

interface SubmenuItem {
  key: string;
  label: string;
}

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  hasSubmenu?: boolean;
  submenu?: SubmenuItem[];
  external?: boolean;
  externalUrl?: string;
}

interface MenuSection {
  section: string;
  items: MenuItem[];
}

const SidebarNav: React.FC<SidebarNavProps> = ({ collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const menuItems: MenuSection[] = [
    {
      section: 'OVERVIEW',
      items: [
        { key: '/dashboard', icon: <HomeOutlined />, label: 'Home' }
      ]
    },
    {
      section: 'CLIENT PORTAL',
      items: [
        { key: '/client-portal', icon: <DollarOutlined />, label: 'Go To Client Portal', external: true, externalUrl: 'https://api-uat-uk-workfin-03.azurewebsites.net' }
      ]
    },
    {
      section: 'POWER BI REPORTS',
      items: [
        { key: '/powerbi', icon: <BarChartOutlined />, label: 'Go To Power BI Reports' }
      ]
    },
    {
      section: 'CONNECTIONS',
      items: [
        {
          key: '/xero',
          icon: <SettingOutlined />,
          label: 'Xero',
          hasSubmenu: true,
          submenu: [
            { key: '/xero/list', label: 'Connections' },
            { key: '/xero/accounts', label: 'Accounts (CoA)' },
            { key: '/xero/contacts', label: 'Contacts' },
            { key: '/xero/contact-groups', label: 'Contact Groups' },
            { key: '/xero/invoices', label: 'Invoices' },
            { key: '/xero/credit-notes', label: 'Credit Notes' },
            { key: '/xero/payments', label: 'Payments' },
            { key: '/xero/bank-transactions', label: 'Bank Transactions' },
            { key: '/xero/bank-transfers', label: 'Bank Transfers' },
            { key: '/xero/journals', label: 'Journals' },
            { key: '/xero/journal-lines', label: 'Journal Lines' },
            { key: '/xero/bank-transactions-new', label: 'Bank Transactions New' },
            { key: '/xero/invoices-new', label: 'Invoices New' },
            { key: '/xero/invoices-new-jenc', label: 'Invoices New JENC' },
            { key: '/xero/journal2', label: 'Journal 2' },
            { key: '/xero/journal2-budget-template', label: 'Journal 2 Budget Template' },
            { key: '/xero/demo-journal2', label: 'Demo Journal 2' },
            { key: '/xero/vw-data', label: 'Data View' },
            { key: '/xero/vw-cash-sheet', label: 'Cash Sheet' },
            { key: '/xero/vw-related-accounts', label: 'Related Accounts' }
          ]
        },
        {
          key: '/pms',
          icon: <ApiOutlined />,
          label: 'PMS Integrations',
          hasSubmenu: true,
          submenu: [
            { key: '/pms/connections', label: 'Connections' }
          ]
        }
      ]
    },
    {
      section: 'ACCOUNT MGMT.',
      items: [
        {
          key: '/onboarding',
          icon: <TeamOutlined />,
          label: 'Client Onboarding',
          hasSubmenu: true,
          submenu: [
            { key: '/onboarding', label: 'List' },
            { key: '/onboarding/create', label: 'Create' }
          ]
        }
      ]
    },
    {
      section: 'WORKFIN USERS',
      items: [
        {
          key: '/users',
          icon: <UserOutlined />,
          label: 'WorkFin Users',
          hasSubmenu: true,
          submenu: [
            { key: '/users/list', label: 'List' },
            { key: '/users/create', label: 'Create' }
          ]
        }
      ]
    },
    {
      section: 'ACCOUNTS',
      items: [
        {
          key: '/compass',
          icon: <CalendarOutlined />,
          label: 'Compass Dates',
          hasSubmenu: true,
          submenu: [
            { key: '/compass/list', label: 'List' },
            { key: '/compass/create', label: 'Create' }
          ]
        }
      ]
    }
  ];

  const handleNavigation = (key: string) => {
    navigate(key);
  };

  const toggleSubmenu = (key: string) => {
    setExpandedMenus(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.hasSubmenu && !collapsed) {
      toggleSubmenu(item.key);
    } else if (item.external && item.externalUrl) {
      window.location.href = item.externalUrl;
    } else if (!item.hasSubmenu) {
      handleNavigation(item.key);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Clear storage even if API call fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  return (
    <div className={`sidebar-nav ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <img src="/workfin_logo_full.svg" alt="WorkFin" className="sidebar-logo" />}
        {collapsed && (
          <div className="sidebar-logo-icon">
            <img src="/workfin_logo_full.svg" alt="W" className="sidebar-logo-mini" />
          </div>
        )}
      </div>

      <div className="sidebar-menu">
        {menuItems.map((section, index) => (
          <div key={index} className="menu-section">
            {!collapsed && <div className="menu-section-title">{section.section}</div>}
            {section.items.map((item) => {
              const isExpanded = expandedMenus.includes(item.key);
              const menuItemContent = (
                <div key={item.key}>
                  <div
                    className={`menu-item ${location.pathname === item.key ? 'active' : ''}`}
                    onClick={() => handleMenuItemClick(item)}
                  >
                    <span className="menu-item-icon">{item.icon}</span>
                    {!collapsed && <span className="menu-item-label">{item.label}</span>}
                    {!collapsed && item.hasSubmenu && (
                      <DownOutlined
                        className={`menu-item-arrow ${isExpanded ? 'expanded' : ''}`}
                      />
                    )}
                  </div>
                  {!collapsed && item.hasSubmenu && isExpanded && item.submenu && (
                    <div className="submenu">
                      {item.submenu.map((subItem: any) => (
                        <div
                          key={subItem.key}
                          className={`submenu-item ${location.pathname === subItem.key ? 'active' : ''}`}
                          onClick={() => handleNavigation(subItem.key)}
                        >
                          {subItem.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );

              return collapsed ? (
                <Tooltip key={item.key} title={item.label} placement="right">
                  {menuItemContent}
                </Tooltip>
              ) : (
                menuItemContent
              );
            })}
          </div>
        ))}

        <div className="menu-section">
          {collapsed ? (
            <Tooltip title="Logout" placement="right">
              <div
                className="menu-item logout-item"
                onClick={handleLogout}
              >
                <span className="menu-item-icon"><LogoutOutlined /></span>
              </div>
            </Tooltip>
          ) : (
            <div
              className="menu-item logout-item"
              onClick={handleLogout}
            >
              <span className="menu-item-icon"><LogoutOutlined /></span>
              <span className="menu-item-label">Logout</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarNav;
