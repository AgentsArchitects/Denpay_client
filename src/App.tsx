import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import Practice360 from './pages/dashboard/Practice360';
import XeroList from './pages/xero/XeroList';
import XeroAccounts from './pages/xero/XeroAccounts';
import XeroContacts from './pages/xero/XeroContacts';
import XeroInvoices from './pages/xero/XeroInvoices';
import XeroCreditNotes from './pages/xero/XeroCreditNotes';
import XeroPayments from './pages/xero/XeroPayments';
import XeroBankTransactions from './pages/xero/XeroBankTransactions';
import XeroBankTransfers from './pages/xero/XeroBankTransfers';
import XeroJournals from './pages/xero/XeroJournals';
import XeroJournalLines from './pages/xero/XeroJournalLines';
import XeroContactGroups from './pages/xero/XeroContactGroups';
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
      <Route path="/xero/accounts" element={
        <DashboardLayout>
          <XeroAccounts />
        </DashboardLayout>
      } />
      <Route path="/xero/contacts" element={
        <DashboardLayout>
          <XeroContacts />
        </DashboardLayout>
      } />
      <Route path="/xero/invoices" element={
        <DashboardLayout>
          <XeroInvoices />
        </DashboardLayout>
      } />
      <Route path="/xero/credit-notes" element={
        <DashboardLayout>
          <XeroCreditNotes />
        </DashboardLayout>
      } />
      <Route path="/xero/payments" element={
        <DashboardLayout>
          <XeroPayments />
        </DashboardLayout>
      } />
      <Route path="/xero/bank-transactions" element={
        <DashboardLayout>
          <XeroBankTransactions />
        </DashboardLayout>
      } />
      <Route path="/xero/journals" element={
        <DashboardLayout>
          <XeroJournals />
        </DashboardLayout>
      } />
      <Route path="/xero/journal-lines" element={
        <DashboardLayout>
          <XeroJournalLines />
        </DashboardLayout>
      } />
      <Route path="/xero/contact-groups" element={
        <DashboardLayout>
          <XeroContactGroups />
        </DashboardLayout>
      } />
      <Route path="/xero/bank-transfers" element={
        <DashboardLayout>
          <XeroBankTransfers />
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
