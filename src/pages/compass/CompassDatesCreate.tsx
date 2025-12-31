import React, { useState } from 'react';
import { Card, Form, Input, Button, Breadcrumb, DatePicker, message } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import './CompassDatesCreate.css';

interface CompassData {
  key: string;
  month: string;
  scheduledPeriod: string;
  lastDayAdjustments: string;
  processingCutOffDate: string;
  payStatementsAvailable: string;
  payDate: string;
  status: 'Active' | 'Inactive';
}

const CompassDatesCreate: React.FC = () => {
  const navigate = useNavigate();
  const { compassId } = useParams<{ compassId: string }>();
  const isEditMode = !!compassId;
  const [form] = Form.useForm();

  const handleCancel = () => {
    navigate('/compass/list');
  };

  const handleSubmit = (values: any) => {
    const existingDates = JSON.parse(localStorage.getItem('compassDates') || '[]') as CompassData[];

    if (isEditMode && compassId) {
      // Update existing compass date
      const updatedDates = existingDates.map(date =>
        date.key === compassId
          ? {
              ...date,
              month: values.month ? dayjs(values.month).format('MMM YY') : '',
              scheduledPeriod: values.scheduledPeriod || '',
              lastDayAdjustments: values.adjustmentLastDay ? dayjs(values.adjustmentLastDay).format('ddd DD MMM') : '',
              processingCutOffDate: values.processingCutOffDate ? dayjs(values.processingCutOffDate).format('ddd DD MMM') : '',
              payStatementsAvailable: values.payStatementAvailable ? dayjs(values.payStatementAvailable).format('ddd DD MMM') : '',
              payDate: values.payDate ? dayjs(values.payDate).format('ddd DD MMM') : '',
            }
          : date
      );
      localStorage.setItem('compassDates', JSON.stringify(updatedDates));
      message.success('Compass date updated successfully');
    } else {
      // Create new compass date
      const newDate: CompassData = {
        key: Date.now().toString(),
        month: values.month ? dayjs(values.month).format('MMM YY') : '',
        scheduledPeriod: values.scheduledPeriod || '',
        lastDayAdjustments: values.adjustmentLastDay ? dayjs(values.adjustmentLastDay).format('ddd DD MMM') : '',
        processingCutOffDate: values.processingCutOffDate ? dayjs(values.processingCutOffDate).format('ddd DD MMM') : '',
        payStatementsAvailable: values.payStatementAvailable ? dayjs(values.payStatementAvailable).format('ddd DD MMM') : '',
        payDate: values.payDate ? dayjs(values.payDate).format('ddd DD MMM') : '',
        status: 'Active'
      };
      existingDates.push(newDate);
      localStorage.setItem('compassDates', JSON.stringify(existingDates));
      message.success('Compass date created successfully');
    }

    navigate('/compass/list');
  };

  // Pre-populate form in edit mode
  React.useEffect(() => {
    if (isEditMode && compassId) {
      const existingDates = JSON.parse(localStorage.getItem('compassDates') || '[]') as CompassData[];
      const dateData = existingDates.find(date => date.key === compassId);

      if (dateData) {
        form.setFieldsValue({
          month: dateData.month ? dayjs(dateData.month, 'MMM YY') : null,
          scheduledPeriod: dateData.scheduledPeriod,
          adjustmentLastDay: dateData.lastDayAdjustments ? dayjs(dateData.lastDayAdjustments, 'ddd DD MMM') : null,
          processingCutOffDate: dateData.processingCutOffDate ? dayjs(dateData.processingCutOffDate, 'ddd DD MMM') : null,
          payStatementAvailable: dateData.payStatementsAvailable ? dayjs(dateData.payStatementsAvailable, 'ddd DD MMM') : null,
          payDate: dateData.payDate ? dayjs(dateData.payDate, 'ddd DD MMM') : null,
        });
      }
    }
  }, [isEditMode, compassId, form]);

  return (
    <div className="compass-dates-create-container">
      {/* Breadcrumb */}
      <Breadcrumb className="page-breadcrumb">
        <Breadcrumb.Item>
          <Link to="/dashboard">Accounts</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/compass/list">Users</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{isEditMode ? 'Edit' : 'Create'}</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">{isEditMode ? 'Edit Compass' : 'Create Compass'}</h1>
      </div>

      {/* Main Content Card */}
      <Card className="compass-dates-create-card">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <div className="form-row">
            <div className="form-col">
              <Form.Item
                label="Month"
                name="month"
                rules={[{ required: true, message: 'Please select month' }]}
              >
                <DatePicker
                  picker="month"
                  format="MMMM, YYYY"
                  placeholder="--------, ----"
                  style={{ width: '100%' }}
                  className="form-input"
                />
              </Form.Item>
            </div>
            <div className="form-col">
              <Form.Item
                label="Schedule Period"
                name="scheduledPeriod"
                rules={[{ required: true, message: 'Please enter schedule period' }]}
              >
                <Input placeholder="Enter schedule period" className="form-input" />
              </Form.Item>
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <Form.Item
                label="Adjustment Last Day"
                name="adjustmentLastDay"
                rules={[{ required: true, message: 'Please select adjustment last day' }]}
              >
                <DatePicker
                  format="DD-MM-YYYY"
                  placeholder="dd-mm-yyyy"
                  style={{ width: '100%' }}
                  className="form-input"
                />
              </Form.Item>
            </div>
            <div className="form-col">
              <Form.Item
                label="Processing Cut Off Date"
                name="processingCutOffDate"
                rules={[{ required: true, message: 'Please select processing cut off date' }]}
              >
                <DatePicker
                  format="DD-MM-YYYY"
                  placeholder="dd-mm-yyyy"
                  style={{ width: '100%' }}
                  className="form-input"
                />
              </Form.Item>
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <Form.Item
                label="Pay Statement Available"
                name="payStatementAvailable"
                rules={[{ required: true, message: 'Please select pay statement available date' }]}
              >
                <DatePicker
                  format="DD-MM-YYYY"
                  placeholder="dd-mm-yyyy"
                  style={{ width: '100%' }}
                  className="form-input"
                />
              </Form.Item>
            </div>
            <div className="form-col">
              <Form.Item
                label="Pay Date"
                name="payDate"
                rules={[{ required: true, message: 'Please select pay date' }]}
              >
                <DatePicker
                  format="DD-MM-YYYY"
                  placeholder="dd-mm-yyyy"
                  style={{ width: '100%' }}
                  className="form-input"
                />
              </Form.Item>
            </div>
          </div>

          <div className="form-actions">
            <Button className="cancel-btn" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="primary" htmlType="submit" className="submit-btn">
              {isEditMode ? 'Update' : 'Submit'}
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CompassDatesCreate;
