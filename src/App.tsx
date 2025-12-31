import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import Practice360 from './pages/dashboard/Practice360';
import XeroList from './pages/xero/XeroList';
import CoACategories from './pages/coa/CoACategories';
import ClientOnboardingList from './pages/onboarding/ClientOnboardingList';
import ClientOnboardingUsers from './pages/onboarding/ClientOnboardingUsers';
import ClientOnboardingCreate from './pages/onboarding/ClientOnboardingCreate';
import WorkFinUserList from './pages/users/WorkFinUserList';
import WorkFinUserCreate from './pages/users/WorkFinUserCreate';
import CompassDatesList from './pages/compass/CompassDatesList';
import CompassDatesCreate from './pages/compass/CompassDatesCreate';
import DashboardLayout from './components/layout/DashboardLayout';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <DashboardLayout>
          <Practice360 />
        </DashboardLayout>
      } />
      <Route path="/xero/list" element={
        <DashboardLayout>
          <XeroList />
        </DashboardLayout>
      } />
      <Route path="/coa" element={
        <DashboardLayout>
          <CoACategories />
        </DashboardLayout>
      } />
      <Route path="/onboarding" element={
        <DashboardLayout>
          <ClientOnboardingList />
        </DashboardLayout>
      } />
      <Route path="/onboarding/create" element={
        <DashboardLayout>
          <ClientOnboardingCreate />
        </DashboardLayout>
      } />
      <Route path="/onboarding/edit/:clientId" element={
        <DashboardLayout>
          <ClientOnboardingCreate />
        </DashboardLayout>
      } />
      <Route path="/onboarding/:clientId/users" element={
        <DashboardLayout>
          <ClientOnboardingUsers />
        </DashboardLayout>
      } />
      <Route path="/users/list" element={
        <DashboardLayout>
          <WorkFinUserList />
        </DashboardLayout>
      } />
      <Route path="/users/create" element={
        <DashboardLayout>
          <WorkFinUserCreate />
        </DashboardLayout>
      } />
      <Route path="/users/edit/:userId" element={
        <DashboardLayout>
          <WorkFinUserCreate />
        </DashboardLayout>
      } />
      <Route path="/compass/list" element={
        <DashboardLayout>
          <CompassDatesList />
        </DashboardLayout>
      } />
      <Route path="/compass/create" element={
        <DashboardLayout>
          <CompassDatesCreate />
        </DashboardLayout>
      } />
      <Route path="/compass/edit/:compassId" element={
        <DashboardLayout>
          <CompassDatesCreate />
        </DashboardLayout>
      } />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
