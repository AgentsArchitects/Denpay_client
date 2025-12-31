import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Breadcrumb, Select, Upload, Tabs, DatePicker, Switch } from 'antd';
import { UploadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import './ClientOnboardingCreate.css';

const { Option } = Select;

const ClientOnboardingCreate: React.FC = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const isEditMode = !!clientId;
  const [form] = Form.useForm();
  const [contactForm] = Form.useForm();
  const [licenseForm] = Form.useForm();
  const [accountantForm] = Form.useForm();
  const [itProviderForm] = Form.useForm();
  const [adjustmentForm] = Form.useForm();
  const [pmsForm] = Form.useForm();
  const [denpayForm] = Form.useForm();
  const [fyEndForm] = Form.useForm();
  const [featureForm] = Form.useForm();
  const [expandedLogo, setExpandedLogo] = useState<UploadFile[]>([]);
  const [uploadLogo, setUploadLogo] = useState<UploadFile[]>([]);
  const [activeTab, setActiveTab] = useState('1');
  const [denpayPeriods, setDenpayPeriods] = useState<number[]>([0]);
  const [fyEndPeriods, setFyEndPeriods] = useState<number[]>([0]);
  const [clinicianPayEnabled, setClinicianPayEnabled] = useState(true);
  const [powerBIEnabled, setPowerBIEnabled] = useState(false);
  const [adjustmentTypes, setAdjustmentTypes] = useState<string[]>([
    'Mentoring Fee',
    'Retainer Fee',
    'Therapist - Invoice',
    'Locum - Days',
    'Reconciliation Adjustment',
    'Payment on Account',
    'Previous Period Payment',
    'Training and Other'
  ]);
  const [newAdjustment, setNewAdjustment] = useState('');
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const handleCancel = () => {
    navigate('/onboarding');
  };

  const handleBack = () => {
    const currentTabIndex = parseInt(activeTab);
    if (currentTabIndex > 1) {
      setActiveTab(String(currentTabIndex - 1));
    }
  };

  const handleNext = () => {
    const currentTabIndex = parseInt(activeTab);
    if (currentTabIndex < 10) {
      setActiveTab(String(currentTabIndex + 1));
    }
  };

  const handleTabPrev = () => {
    const currentTabIndex = parseInt(activeTab);
    if (currentTabIndex > 1) {
      setActiveTab(String(currentTabIndex - 1));
    }
  };

  const handleTabNext = () => {
    const currentTabIndex = parseInt(activeTab);
    if (currentTabIndex < 10) {
      setActiveTab(String(currentTabIndex + 1));
    }
  };

  const handleAddAdjustment = () => {
    if (newAdjustment.trim()) {
      setAdjustmentTypes([...adjustmentTypes, newAdjustment.trim()]);
      setNewAdjustment('');
    }
  };

  const handleDeleteAdjustment = (index: number) => {
    setAdjustmentTypes(adjustmentTypes.filter((_, i) => i !== index));
  };

  const handleAddDenpayPeriod = () => {
    setDenpayPeriods([...denpayPeriods, denpayPeriods.length]);
  };

  const handleAddFyEndPeriod = () => {
    setFyEndPeriods([...fyEndPeriods, fyEndPeriods.length]);
  };

  const checkArrowsVisibility = () => {
    const tabsNav = document.querySelector('.client-onboarding-tabs .ant-tabs-nav-list') as HTMLElement;
    if (tabsNav) {
      const scrollLeft = tabsNav.scrollLeft;
      const scrollWidth = tabsNav.scrollWidth;
      const clientWidth = tabsNav.clientWidth;

      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    const tabsNav = document.querySelector('.client-onboarding-tabs .ant-tabs-nav-list') as HTMLElement;
    if (tabsNav) {
      const scrollAmount = 200;
      if (direction === 'left') {
        tabsNav.scrollLeft -= scrollAmount;
      } else {
        tabsNav.scrollLeft += scrollAmount;
      }
      setTimeout(checkArrowsVisibility, 100);
    }
  };

  React.useEffect(() => {
    // Delay to ensure DOM is ready
    setTimeout(() => {
      checkArrowsVisibility();
    }, 100);

    window.addEventListener('resize', checkArrowsVisibility);

    const tabsNav = document.querySelector('.client-onboarding-tabs .ant-tabs-nav-list') as HTMLElement;
    if (tabsNav) {
      tabsNav.addEventListener('scroll', checkArrowsVisibility);
    }

    return () => {
      window.removeEventListener('resize', checkArrowsVisibility);
      if (tabsNav) {
        tabsNav.removeEventListener('scroll', checkArrowsVisibility);
      }
    };
  }, []);

  React.useEffect(() => {
    // Recheck arrows when active tab changes
    checkArrowsVisibility();

    // Force ink bar to update position with multiple attempts
    const updateInkBar = () => {
      const activeTabElement = document.querySelector('.client-onboarding-tabs .ant-tabs-tab-active');
      const inkBar = document.querySelector('.client-onboarding-tabs .ant-tabs-ink-bar') as HTMLElement;
      const navList = document.querySelector('.client-onboarding-tabs .ant-tabs-nav-list') as HTMLElement;

      if (inkBar && activeTabElement && navList) {
        const tabRect = activeTabElement.getBoundingClientRect();
        const navRect = navList.getBoundingClientRect();

        // Calculate position relative to the scrolled container
        const left = activeTabElement.offsetLeft;
        const width = tabRect.width;

        inkBar.style.transform = `translateX(${left}px)`;
        inkBar.style.width = `${width}px`;
        inkBar.style.transition = 'none';

        // Scroll active tab into view
        activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    };

    // Multiple update attempts to ensure it works
    setTimeout(updateInkBar, 0);
    setTimeout(updateInkBar, 50);
    setTimeout(updateInkBar, 150);
    setTimeout(updateInkBar, 300);
  }, [activeTab]);

  // Load existing client data when in edit mode
  React.useEffect(() => {
    if (isEditMode && clientId) {
      // Mock data - In production, fetch from API
      const mockClientData = {
        type: 'ltd-company',
        tradingName: 'Dental Care',
        entityReference: 'DEN2237',
        addressLine1: '123 High Street',
        postCode: 'SW1A 1AA',
        addressLine2: 'Suite 100',
        city: 'London',
        county: 'Greater London',
        country: 'uk',
        companyRegNo: '12345678',
        xeroVatTaxType: 'Standard Rate',
        phoneNumber: '+44 20 1234 5678',
        emailId: 'info@dentalcare.com',
        adminUserFullName: 'John Smith',
        adminUserEmail: 'john.smith@dentalcare.com',
        accountingSystem: 'xero',
        licenseWorkfinUsers: '5',
        licenseCompassConnections: '3',
        licenseFinanceSystemConnections: '2',
        licensePracticeManagementConnections: '1',
        licensePurchasingSystemConnections: '1',
        accountantName: 'ABC Accountants Ltd',
        accountantAddress: '456 Business Park',
        accountantContactNo: '+44 20 9876 5432',
        accountantEmail: 'contact@abcaccountants.com',
        nameOfProvider: 'Tech Solutions Ltd',
        address: '789 Tech Street',
        postCode2: 'EC1A 1BB',
        contactName: 'Jane Doe',
        telephoneNo: '+44 20 1111 2222',
        telephoneNo1: '+44 20 3333 4444',
        email: 'support@techsolutions.com',
        additionalNotes: 'Preferred contact time: 9am-5pm'
      };

      // Populate forms with existing data
      form.setFieldsValue(mockClientData);
      contactForm.setFieldsValue(mockClientData);
      licenseForm.setFieldsValue(mockClientData);
      accountantForm.setFieldsValue(mockClientData);
      itProviderForm.setFieldsValue(mockClientData);
    }
  }, [isEditMode, clientId]);

  const tabItems = [
    {
      key: '1',
      label: 'Client Information',
      children: (
        <div className="tab-content">
          <Form form={form} layout="vertical">
            <div className="form-row">
              <div className="form-col">
                <Form.Item label="Expanded Logo">
                  <Upload
                    fileList={expandedLogo}
                    onChange={({ fileList }) => setExpandedLogo(fileList)}
                    beforeUpload={() => false}
                    maxCount={1}
                  >
                    <Button icon={<UploadOutlined />} className="upload-btn expanded-logo-btn">
                      Expanded Logo
                    </Button>
                  </Upload>
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item label="Upload Logo">
                  <Upload
                    fileList={uploadLogo}
                    onChange={({ fileList }) => setUploadLogo(fileList)}
                    beforeUpload={() => false}
                    maxCount={1}
                  >
                    <Button icon={<UploadOutlined />} className="upload-btn upload-logo-btn">
                      Upload Logo
                    </Button>
                  </Upload>
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Type"
                  name="type"
                  rules={[{ required: true, message: 'Please select type' }]}
                >
                  <Select placeholder="Select" className="form-select">
                    <Option value="">Select</Option>
                    <Option value="sole-trader">Sole Trader</Option>
                    <Option value="partnership">Partnership</Option>
                    <Option value="ltd-company">Ltd Company</Option>
                  </Select>
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Legal Client Trading Name"
                  name="tradingName"
                  rules={[{ required: true, message: 'Please enter trading name' }]}
                >
                  <Input placeholder="Enter legal client trading name" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col-full">
                <Form.Item
                  label="WorkFin Legal Entity Reference"
                  name="entityReference"
                >
                  <Input placeholder="Enter WorkFin legal entity reference" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Address Line 1"
                  name="addressLine1"
                  rules={[{ required: true, message: 'Please enter address line 1' }]}
                >
                  <Input placeholder="Enter address line 1" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Post Code"
                  name="postCode"
                  rules={[{ required: true, message: 'Please enter post code' }]}
                >
                  <Input placeholder="Enter post code" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col-full">
                <Form.Item
                  label="Address Line 2"
                  name="addressLine2"
                >
                  <Input placeholder="Enter address line 2" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="City"
                  name="city"
                  rules={[{ required: true, message: 'Please enter city' }]}
                >
                  <Input placeholder="Enter city" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="County"
                  name="county"
                >
                  <Input placeholder="Enter county" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Country"
                  name="country"
                  rules={[{ required: true, message: 'Please select country' }]}
                >
                  <Select placeholder="Select" className="form-select">
                    <Option value="uk">United Kingdom</Option>
                    <Option value="us">United States</Option>
                    <Option value="ca">Canada</Option>
                  </Select>
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Company House Registration No."
                  name="companyRegNo"
                >
                  <Input placeholder="Enter company house registration no." />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col-full">
                <Form.Item
                  label="Xero VAT Tax Type"
                  name="xeroVatTaxType"
                >
                  <Input placeholder="Enter Xero VAT tax type" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: '2',
      label: 'Contact Information',
      children: (
        <div className="tab-content">
          <Form form={contactForm} layout="vertical">
            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Phone Number"
                  name="phoneNumber"
                >
                  <Input placeholder="Enter phone number" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Email ID"
                  name="emailId"
                >
                  <Input placeholder="Enter email ID" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Admin User Full Name"
                  name="adminUserFullName"
                  rules={[{ required: true, message: 'Please enter admin user full name' }]}
                >
                  <Input placeholder="Enter admin user full name" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Admin User Email"
                  name="adminUserEmail"
                  rules={[
                    { required: true, message: 'Please enter admin user email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input placeholder="Enter admin user email" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: '3',
      label: 'License Information',
      children: (
        <div className="tab-content">
          <Form form={licenseForm} layout="vertical">
            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Accounting System"
                  name="accountingSystem"
                >
                  <Select placeholder="Select" className="form-select">
                    <Option value="">Select</Option>
                    <Option value="xero">xero</Option>
                    <Option value="sage">sage</Option>
                  </Select>
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Xero App"
                  name="xeroApp"
                >
                  <Select placeholder="Select" className="form-select">
                    <Option value="">Select</Option>
                  </Select>
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Number of License Workfin Users"
                  name="licenseWorkfinUsers"
                >
                  <Input type="number" placeholder="Enter number" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Number of License Compass Connections"
                  name="licenseCompassConnections"
                >
                  <Input type="number" placeholder="Enter number" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Number of License Finance System Connections"
                  name="licenseFinanceSystemConnections"
                >
                  <Input type="number" placeholder="Enter number" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Number of Practice Management System Connections"
                  name="licensePracticeManagementConnections"
                >
                  <Input type="number" placeholder="Enter number" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col-full">
                <Form.Item
                  label="Number of License Purchasing System Connections"
                  name="licensePurchasingSystemConnections"
                >
                  <Input type="number" placeholder="Enter number" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: '4',
      label: 'Accountant Details',
      children: (
        <div className="tab-content">
          <Form form={accountantForm} layout="vertical">
            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Accountant Name"
                  name="accountantName"
                >
                  <Input placeholder="Enter accountant name" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Accountant Address"
                  name="accountantAddress"
                >
                  <Input placeholder="Enter accountant address" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Accountant Contact No."
                  name="accountantContactNo"
                >
                  <Input placeholder="Enter contact number" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Accountant Email"
                  name="accountantEmail"
                >
                  <Input type="email" placeholder="Enter accountant email" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: '5',
      label: 'IT Provider Details',
      children: (
        <div className="tab-content">
          <Form form={itProviderForm} layout="vertical">
            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Name Of Provider"
                  name="nameOfProvider"
                >
                  <Input placeholder="Enter provider name" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Address"
                  name="address"
                >
                  <Input placeholder="Enter address" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Post Code"
                  name="postCode"
                >
                  <Input placeholder="Enter post code" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Contact Name"
                  name="contactName"
                >
                  <Input placeholder="Enter contact name" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Telephone No."
                  name="telephoneNo"
                >
                  <Input placeholder="Enter telephone number" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Telephone No. 1"
                  name="telephoneNo1"
                >
                  <Input placeholder="Enter telephone number 1" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Email"
                  name="email"
                >
                  <Input type="email" placeholder="Enter email" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Additional Notes"
                  name="additionalNotes"
                >
                  <Input.TextArea rows={4} placeholder="Enter additional notes" />
                </Form.Item>
              </div>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: '6',
      label: 'Adjustment Types',
      children: (
        <div className="tab-content">
          <Form form={adjustmentForm} layout="vertical">
            <Form.Item
              label="Adjustment Types"
              name="adjustmentTypes"
              rules={[{ required: true, message: 'Please add at least one adjustment type' }]}
            >
              <div className="adjustment-types-container">
                <Input
                  placeholder="Select or add adjustment"
                  value={newAdjustment}
                  onChange={(e) => setNewAdjustment(e.target.value)}
                  onPressEnter={handleAddAdjustment}
                  className="adjustment-input"
                />

                <div className="adjustment-list">
                  {adjustmentTypes.map((adjustment, index) => (
                    <div key={index} className="adjustment-item">
                      <span className="adjustment-name">{adjustment}</span>
                      <Button
                        type="text"
                        className="delete-adjustment-btn"
                        onClick={() => handleDeleteAdjustment(index)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="link"
                  className="add-more-adjustments-btn"
                  onClick={handleAddAdjustment}
                >
                  + Add more adjustments
                </Button>
              </div>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: '7',
      label: 'PMS Integration Details',
      children: (
        <div className="tab-content">
          <Form form={pmsForm} layout="vertical">
            <div className="pms-section">
              <h3 className="pms-section-title">SOE</h3>
              <div className="pms-content">
                <p className="no-data">No data found</p>
                <Button type="link" className="add-more-btn">+ Add More</Button>
              </div>
            </div>

            <div className="pms-section">
              <h3 className="pms-section-title">DENTALLY</h3>
              <div className="pms-content">
                <p className="no-data">No data found</p>
                <Button type="link" className="add-more-btn">+ Add More</Button>
              </div>
            </div>

            <div className="pms-section">
              <h3 className="pms-section-title">SFD</h3>
              <div className="pms-content">
                <p className="no-data">No data found</p>
                <Button type="link" className="add-more-btn">+ Add More</Button>
              </div>
            </div>

            <div className="pms-section">
              <h3 className="pms-section-title">CARESTACK</h3>
              <div className="pms-content">
                <p className="no-data">No data found</p>
                <Button type="link" className="add-more-btn">+ Add More</Button>
              </div>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: '8',
      label: 'Denpay Period',
      children: (
        <div className="tab-content">
          <Form form={denpayForm} layout="vertical">
            {denpayPeriods.map((period, index) => (
              <div key={index} className="period-row">
                <div className="form-row">
                  <div className="form-col">
                    <Form.Item
                      label="Month"
                      name={`denpay_month_${index}`}
                    >
                      <DatePicker
                        picker="month"
                        placeholder="Select month"
                        style={{ width: '100%' }}
                        suffixIcon={<span className="calendar-icon">📅</span>}
                      />
                    </Form.Item>
                  </div>
                  <div className="form-col">
                    <Form.Item
                      label="From"
                      name={`denpay_from_${index}`}
                    >
                      <DatePicker
                        placeholder="Select date"
                        style={{ width: '100%' }}
                        suffixIcon={<span className="calendar-icon">📅</span>}
                      />
                    </Form.Item>
                  </div>
                  <div className="form-col">
                    <Form.Item
                      label="To"
                      name={`denpay_to_${index}`}
                    >
                      <DatePicker
                        placeholder="Select date"
                        style={{ width: '100%' }}
                        suffixIcon={<span className="calendar-icon">📅</span>}
                      />
                    </Form.Item>
                  </div>
                </div>
              </div>
            ))}

            <Button
              className="add-more-period-btn"
              onClick={handleAddDenpayPeriod}
            >
              + Add More
            </Button>
          </Form>
        </div>
      ),
    },
    {
      key: '9',
      label: 'FY End',
      children: (
        <div className="tab-content">
          <Form form={fyEndForm} layout="vertical">
            {fyEndPeriods.map((period, index) => (
              <div key={index} className="period-row">
                <div className="form-row">
                  <div className="form-col">
                    <Form.Item
                      label="Month"
                      name={`fyend_month_${index}`}
                    >
                      <DatePicker
                        picker="month"
                        placeholder="Select month"
                        style={{ width: '100%' }}
                        suffixIcon={<span className="calendar-icon">📅</span>}
                      />
                    </Form.Item>
                  </div>
                  <div className="form-col">
                    <Form.Item
                      label="From"
                      name={`fyend_from_${index}`}
                    >
                      <DatePicker
                        placeholder="Select date"
                        style={{ width: '100%' }}
                        suffixIcon={<span className="calendar-icon">📅</span>}
                      />
                    </Form.Item>
                  </div>
                  <div className="form-col">
                    <Form.Item
                      label="To"
                      name={`fyend_to_${index}`}
                    >
                      <DatePicker
                        placeholder="Select date"
                        style={{ width: '100%' }}
                        suffixIcon={<span className="calendar-icon">📅</span>}
                      />
                    </Form.Item>
                  </div>
                </div>
              </div>
            ))}

            <Button
              className="add-more-period-btn"
              onClick={handleAddFyEndPeriod}
            >
              + Add More
            </Button>
          </Form>
        </div>
      ),
    },
    {
      key: '10',
      label: 'Feature Access',
      children: (
        <div className="tab-content">
          <Form form={featureForm} layout="vertical">
            <div className="feature-access-container">
              <div className="feature-item">
                <span className="feature-label">Clinician Pay System</span>
                <Switch
                  checked={clinicianPayEnabled}
                  onChange={setClinicianPayEnabled}
                  className="feature-switch"
                />
              </div>

              <div className="feature-item">
                <span className="feature-label">Power BI Reports</span>
                <Switch
                  checked={powerBIEnabled}
                  onChange={setPowerBIEnabled}
                  className="feature-switch"
                />
              </div>
            </div>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <div className="client-onboarding-create-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Account Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/onboarding">User Management</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Client Onboarding</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{isEditMode ? 'Edit Client Onboarding' : 'Add Client Onboarding'}</h1>
      </div>

      {/* Main Content Card */}
      <Card className="client-onboarding-create-card">
        <div className="tabs-wrapper" ref={tabsRef}>
          {showLeftArrow && (
            <Button
              type="text"
              icon={<LeftOutlined />}
              className="tab-scroll-btn left-arrow"
              onClick={() => scrollTabs('left')}
            />
          )}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            className="client-onboarding-tabs"
            tabBarStyle={{ marginBottom: 24 }}
            tabBarGutter={16}
          />
          {showRightArrow && (
            <Button
              type="text"
              icon={<RightOutlined />}
              className="tab-scroll-btn right-arrow"
              onClick={() => scrollTabs('right')}
            />
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          {activeTab !== '1' && (
            <Button className="back-btn" onClick={handleBack}>
              Back
            </Button>
          )}
          {activeTab === '1' && (
            <Button className="cancel-btn" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button type="primary" className="next-btn" onClick={handleNext}>
            {activeTab === '10' ? 'Finish' : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ClientOnboardingCreate;
