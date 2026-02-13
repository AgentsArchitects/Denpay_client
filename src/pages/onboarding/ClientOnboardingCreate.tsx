import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Breadcrumb, Select, Upload, Tabs, DatePicker, Switch, message } from 'antd';
import { UploadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { UploadFile } from 'antd/es/upload/interface';
import clientService from '../../services/clientService';
import pmsService, { PMSConnectionCreate } from '../../services/pmsService';
import PMSIntegrationSection from '../../components/pms/PMSIntegrationSection';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingPMSConnections, setPendingPMSConnections] = useState<PMSConnectionCreate[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
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

  const handleNext = async () => {
    const currentTabIndex = parseInt(activeTab);

    // Validate current tab before moving to next
    try {
      if (currentTabIndex === 1) {
        // Tab 1: Client Information - validate required fields
        await form.validateFields(['type', 'tradingName', 'addressLine1', 'city', 'postCode']);
      } else if (currentTabIndex === 2) {
        // Tab 2: Contact Information - validate required fields
        await contactForm.validateFields(['phoneNumber', 'emailId', 'firstName', 'lastName']);
      }
      // Other tabs don't have mandatory fields, so we don't need to validate them

      // If validation passes, move to next tab
      if (currentTabIndex < 10) {
        setActiveTab(String(currentTabIndex + 1));
      } else {
        // Last tab - submit the form
        handleSubmit();
      }
    } catch (error) {
      // Validation failed - show error message
      message.error('Please fill in all required fields before continuing');
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

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    // Declare payload outside try block for error logging
    let payload: any = null;

    try {
      setIsSubmitting(true);

      // Validate required forms
      await Promise.all([
        form.validateFields(),
        contactForm.validateFields(),
      ]);

      // Gather all form values
      const clientInfo = form.getFieldsValue();
      const contactInfo = contactForm.getFieldsValue();
      const licenseInfo = licenseForm.getFieldsValue();
      const accountantInfo = accountantForm.getFieldsValue();
      const itProviderInfo = itProviderForm.getFieldsValue();
      const denpayValues = denpayForm.getFieldsValue();
      const fyEndValues = fyEndForm.getFieldsValue();

      // Build API request payload
      payload = {
        // Tab 1: Client Information
        legal_client_trading_name: clientInfo.tradingName,
        workfin_legal_entity_reference: clientInfo.entityReference || `REF-${Date.now()}`,
        client_type: clientInfo.type || null,
        company_registration: clientInfo.companyRegNo || null,
        xero_vat_type: clientInfo.xeroVatTaxType || null,
        expanded_logo_url: null, // TODO: Implement file upload
        logo_url: null, // TODO: Implement file upload

        // Address (nested object)
        address: {
          line1: clientInfo.addressLine1,
          line2: clientInfo.addressLine2 || null,
          city: clientInfo.city,
          postcode: clientInfo.postCode,
          country: clientInfo.country || 'United Kingdom'
        },

        // Tab 2: Contact Information
        phone: contactInfo.phoneNumber,
        email: contactInfo.emailId,
        admin_user: {
          name: `${contactInfo.firstName} ${contactInfo.lastName}`.trim(),
          email: contactInfo.emailId
        },

        // Tab 3: License Information
        accounting_system: licenseInfo.accountingSystem || null,
        xero_app: licenseInfo.xeroApp || null,
        workfin_users_count: parseInt(licenseInfo.licenseWorkfinUsers) || 0,
        compass_connections_count: parseInt(licenseInfo.licenseCompassConnections) || 0,
        finance_system_connections_count: parseInt(licenseInfo.licenseFinanceSystemConnections) || 0,
        pms_connections_count: parseInt(licenseInfo.licensePracticeManagementConnections) || 0,
        purchasing_system_connections_count: parseInt(licenseInfo.licensePurchasingSystemConnections) || 0,

        // Tab 4: Accountant Details
        accountant_name: accountantInfo.accountantName || null,
        accountant_address: accountantInfo.accountantAddress || null,
        accountant_contact: accountantInfo.accountantContactNo || null,
        accountant_email: accountantInfo.accountantEmail || null,

        // Tab 5: IT Provider Details
        it_provider_name: itProviderInfo.nameOfProvider || null,
        it_provider_address: itProviderInfo.address || null,
        it_provider_postcode: itProviderInfo.postCode || null,
        it_provider_contact_name: itProviderInfo.contactName || null,
        it_provider_phone_1: itProviderInfo.telephoneNo || null,
        it_provider_phone_2: itProviderInfo.telephoneNo1 || null,
        it_provider_email: itProviderInfo.email || null,
        it_provider_notes: itProviderInfo.additionalNotes || null,

        // Tab 6: Adjustment Types
        adjustment_types: adjustmentTypes.map(name => ({ name })),

        // Tab 8: Denpay Period
        denpay_periods: denpayPeriods
          .map((_, index) => {
            const month = denpayValues[`denpay_month_${index}`];
            const from = denpayValues[`denpay_from_${index}`];
            const to = denpayValues[`denpay_to_${index}`];

            if (month && from && to) {
              return {
                month: month.format('YYYY-MM-01'),
                from_date: from.format('YYYY-MM-DD'),
                to_date: to.format('YYYY-MM-DD')
              };
            }
            return null;
          })
          .filter(p => p !== null),

        // Tab 9: FY End
        fy_end_periods: fyEndPeriods
          .map((_, index) => {
            const month = fyEndValues[`fyend_month_${index}`];
            const from = fyEndValues[`fyend_from_${index}`];
            const to = fyEndValues[`fyend_to_${index}`];

            if (month && from && to) {
              return {
                month: month.format('YYYY-MM-01'),
                from_date: from.format('YYYY-MM-DD'),
                to_date: to.format('YYYY-MM-DD')
              };
            }
            return null;
          })
          .filter(p => p !== null),

        // Tab 10: Feature Access
        clinician_pay_system_enabled: clinicianPayEnabled,
        power_bi_reports_enabled: powerBIEnabled
      };

      // Submit to API
      if (isEditMode && clientId) {
        message.loading({ content: 'Updating client...', key: 'submit', duration: 0 });
        const response = await clientService.updateClient(clientId, payload);
        message.success({ content: 'Client updated successfully!', key: 'submit', duration: 2 });
      } else {
        message.loading({ content: 'Creating client...', key: 'submit', duration: 0 });
        const response = await clientService.createClient(payload);
        const newClientId = response?.id;
        const newTenantId = response?.tenant_id;  // Get tenant_id from response
        const newTenantName = response?.legal_trading_name || response?.name;

        // Save pending PMS connections if any
        if (newClientId && newTenantId && pendingPMSConnections.length > 0) {
          message.loading({
            content: `Creating ${pendingPMSConnections.length} PMS connection(s)...`,
            key: 'submit',
            duration: 0
          });

          let successCount = 0;
          let failedCount = 0;

          for (const connData of pendingPMSConnections) {
            try {
              await pmsService.createConnection({
                ...connData,
                tenant_id: newTenantId,  // Use tenant_id instead of client_id
                tenant_name: newTenantName,
              });
              successCount++;
            } catch (error: any) {
              console.error('Failed to create PMS connection:', error);
              failedCount++;
            }
          }

          if (failedCount === 0) {
            message.success({
              content: `Client and ${successCount} PMS connection(s) created successfully!`,
              key: 'submit',
              duration: 2
            });
          } else {
            message.warning({
              content: `Client created. ${successCount} PMS connection(s) created, ${failedCount} failed.`,
              key: 'submit',
              duration: 3
            });
          }
        } else {
          message.success({ content: 'Client onboarding completed successfully!', key: 'submit', duration: 2 });
        }
      }

      // Navigate back to onboarding list after showing success message
      setTimeout(() => {
        navigate('/onboarding');
      }, 2000);

    } catch (error: any) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} client:`, error);
      console.error('Error data:', error.data);
      console.error('Error message:', error.message);
      console.error('Payload sent:', payload);

      // Format validation error message
      let errorMessage = `Failed to ${isEditMode ? 'update' : 'create'} client. Please check all required fields and try again.`;

      // Check if error.data.detail exists (Pydantic validation errors)
      if (error.data?.detail) {
        if (Array.isArray(error.data.detail)) {
          console.error('Validation errors:', error.data.detail);
          errorMessage = error.data.detail.map((err: any) =>
            `${err.loc?.join(' → ')}: ${err.msg}`
          ).join('\n');
        } else {
          errorMessage = error.data.detail;
        }
      } else if (Array.isArray(error.message)) {
        // If message is already formatted as array
        console.error('Error messages:', error.message);
        errorMessage = error.message.map((err: any) =>
          typeof err === 'string' ? err : `${err.loc?.join(' → ')}: ${err.msg}`
        ).join('\n');
      }

      message.error({
        content: errorMessage,
        key: 'submit',
        duration: 15
      });
    } finally {
      // Always reset the submitting flag to allow retry
      setIsSubmitting(false);
    }
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
      const activeTabElement = document.querySelector('.client-onboarding-tabs .ant-tabs-tab-active') as HTMLElement;
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
    const fetchClientData = async () => {
      if (isEditMode && clientId) {
        try {
          message.loading({ content: 'Loading client data...', key: 'loadClient', duration: 0 });

          const clientData = await clientService.getClient(clientId) as any;
          console.log('Fetched client data:', clientData);

          // Store tenant ID
          if (clientData.tenant_id) {
            setTenantId(clientData.tenant_id);
          }

          // Transform API data to form field structure
          const formData = {
            type: clientData.client_type || '',
            tradingName: clientData.legal_trading_name || '',
            entityReference: clientData.workfin_reference || '',
            addressLine1: clientData.address?.line1 || '',
            addressLine2: clientData.address?.line2 || '',
            city: clientData.address?.city || '',
            postCode: clientData.address?.postcode || '',
            country: clientData.address?.country || 'United Kingdom',
            companyRegNo: clientData.company_registration_no || '',
            xeroVatTaxType: clientData.xero_vat_tax_type || '',
          };

          // Get admin user data from the first user (ClientAdmin)
          const adminUser = clientData.users && clientData.users.length > 0 ? clientData.users[0] : null;

          // Split admin user name into first and last name
          const adminUserName = adminUser?.name || '';
          const nameParts = adminUserName.trim().split(/\s+/);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const contactData = {
            phoneNumber: clientData.contact_phone || '',
            emailId: clientData.contact_email || '',
            firstName: firstName,
            lastName: lastName,
          };

          const licenseData = {
            accountingSystem: clientData.accounting_system || '',
            xeroApp: clientData.xero_app || '',
            licenseWorkfinUsers: String(clientData.license_workfin_users || 0),
            licenseCompassConnections: String(clientData.license_compass_connections || 0),
            licenseFinanceSystemConnections: String(clientData.license_finance_system_connections || 0),
            licensePracticeManagementConnections: String(clientData.license_pms_connections || 0),
            licensePurchasingSystemConnections: String(clientData.license_purchasing_system_connections || 0),
          };

          const accountantData = {
            accountantName: clientData.accountant_name || '',
            accountantAddress: clientData.accountant_address || '',
            accountantContactNo: clientData.accountant_contact_no || '',
            accountantEmail: clientData.accountant_email || '',
          };

          const itProviderData = {
            nameOfProvider: clientData.it_provider_name || '',
            address: clientData.it_provider_address || '',
            postCode: clientData.it_provider_postcode || '',
            contactName: clientData.it_provider_contact_name || '',
            telephoneNo: clientData.it_provider_phone_1 || '',
            telephoneNo1: clientData.it_provider_phone_2 || '',
            email: clientData.it_provider_email || '',
            additionalNotes: clientData.it_provider_notes || '',
          };

          // Populate forms with existing data
          console.log('Setting form data:', { formData, contactData, licenseData, accountantData, itProviderData });
          form.setFieldsValue(formData);
          contactForm.setFieldsValue(contactData);
          licenseForm.setFieldsValue(licenseData);
          accountantForm.setFieldsValue(accountantData);
          itProviderForm.setFieldsValue(itProviderData);

          // Set adjustment types if available
          if (clientData.adjustment_types && clientData.adjustment_types.length > 0) {
            setAdjustmentTypes(clientData.adjustment_types.map((at: any) => at.name));
          }

          // Set feature toggles
          setClinicianPayEnabled(clientData.feature_clinician_pay_enabled ?? true);
          setPowerBIEnabled(clientData.feature_powerbi_enabled ?? false);

          message.success({ content: 'Client data loaded successfully', key: 'loadClient', duration: 2 });
        } catch (error: any) {
          console.error('Failed to fetch client data:', error);
          message.error({ content: 'Failed to load client data', key: 'loadClient', duration: 5 });
        }
      }
    };

    fetchClientData();
  }, [isEditMode, clientId]);

  const tabItems = [
    {
      key: '1',
      label: 'Client Information',
      children: (
        <div className="tab-content">
          <Form form={form} layout="vertical">
            {/* Tenant ID - shown in edit mode or after creation */}
            {tenantId && (
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-col-full">
                  <div style={{
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 6,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <span style={{ fontWeight: 500 }}>Tenant ID:</span>
                    <span style={{
                      fontFamily: 'monospace',
                      fontSize: 18,
                      fontWeight: 700,
                      color: '#52c41a',
                      letterSpacing: 2
                    }}>
                      {tenantId}
                    </span>
                    <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                      (Auto-generated, unique identifier for this tenant)
                    </span>
                  </div>
                </div>
              </div>
            )}
            {!tenantId && !isEditMode && (
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-col-full">
                  <div style={{
                    background: '#f0f5ff',
                    border: '1px solid #adc6ff',
                    borderRadius: 6,
                    padding: '12px 16px',
                  }}>
                    <span style={{ color: '#4096ff' }}>
                      A unique 8-digit Tenant ID will be auto-generated when this client is saved.
                    </span>
                  </div>
                </div>
              </div>
            )}

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
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="Company House Registration No."
                  name="companyRegNo"
                  rules={[
                    { max: 8, message: 'Registration number must not exceed 8 characters' },
                    { pattern: /^[A-Za-z0-9]*$/, message: 'Only letters and numbers are allowed' }
                  ]}
                >
                  <Input
                    placeholder="Enter company house registration no."
                    maxLength={8}
                  />
                </Form.Item>
              </div>
              <div className="form-col">
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
                  rules={[
                    { required: true, message: 'Please enter phone number' },
                    { min: 10, message: 'Phone number must be at least 10 digits' },
                    { max: 15, message: 'Phone number must not exceed 15 digits' },
                    { pattern: /^[0-9]*$/, message: 'Only numbers are allowed' }
                  ]}
                >
                  <Input
                    placeholder="Enter phone number"
                    maxLength={15}
                  />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Email ID"
                  name="emailId"
                  rules={[
                    { required: true, message: 'Please enter email ID' },
                    { type: 'email', message: 'Please enter a valid email address' },
                    { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address' }
                  ]}
                >
                  <Input placeholder="Enter email ID" />
                </Form.Item>
              </div>
            </div>

            <div className="form-row">
              <div className="form-col">
                <Form.Item
                  label="First Name"
                  name="firstName"
                  rules={[{ required: true, message: 'Please enter first name' }]}
                >
                  <Input placeholder="Enter first name" />
                </Form.Item>
              </div>
              <div className="form-col">
                <Form.Item
                  label="Last Name"
                  name="lastName"
                  rules={[{ required: true, message: 'Please enter last name' }]}
                >
                  <Input placeholder="Enter last name" />
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
          <PMSIntegrationSection
            clientId={clientId}
            onConnectionsChange={setPendingPMSConnections}
          />
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
