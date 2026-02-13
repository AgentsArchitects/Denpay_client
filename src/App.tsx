import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import AcceptInvitation from './pages/auth/AcceptInvitation';
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
import XeroBankTransactionsNew from './pages/xero/XeroBankTransactionsNew';
import XeroInvoicesNew from './pages/xero/XeroInvoicesNew';
import XeroInvoicesNewJENC from './pages/xero/XeroInvoicesNewJENC';
import XeroJournal2 from './pages/xero/XeroJournal2';
import XeroJournal2BudgetTemplate from './pages/xero/XeroJournal2BudgetTemplate';
import XeroDemoJournal2 from './pages/xero/XeroDemoJournal2';
import XeroViewData from './pages/xero/XeroViewData';
import XeroViewCashSheet from './pages/xero/XeroViewCashSheet';
import XeroViewRelatedAccounts from './pages/xero/XeroViewRelatedAccounts';
import ClientOnboardingList from './pages/onboarding/ClientOnboardingList';
import ClientOnboardingUsers from './pages/onboarding/ClientOnboardingUsers';
import ClientOnboardingCreate from './pages/onboarding/ClientOnboardingCreate';
import WorkFinUserList from './pages/users/WorkFinUserList';
import WorkFinUserCreate from './pages/users/WorkFinUserCreate';
import CompassDatesList from './pages/compass/CompassDatesList';
import CompassDatesCreate from './pages/compass/CompassDatesCreate';
import PMSConnectionList from './pages/pms/PMSConnectionList';
import PMSConnectionCreate from './pages/pms/PMSConnectionCreate';
import PMSConnectionDetail from './pages/pms/PMSConnectionDetail';
import DashboardLayout from './components/layout/DashboardLayout';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/accept-invitation" element={<AcceptInvitation />} />
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
      <Route path="/xero/bank-transactions-new" element={
        <DashboardLayout>
          <XeroBankTransactionsNew />
        </DashboardLayout>
      } />
      <Route path="/xero/invoices-new" element={
        <DashboardLayout>
          <XeroInvoicesNew />
        </DashboardLayout>
      } />
      <Route path="/xero/invoices-new-jenc" element={
        <DashboardLayout>
          <XeroInvoicesNewJENC />
        </DashboardLayout>
      } />
      <Route path="/xero/journal2" element={
        <DashboardLayout>
          <XeroJournal2 />
        </DashboardLayout>
      } />
      <Route path="/xero/journal2-budget-template" element={
        <DashboardLayout>
          <XeroJournal2BudgetTemplate />
        </DashboardLayout>
      } />
      <Route path="/xero/demo-journal2" element={
        <DashboardLayout>
          <XeroDemoJournal2 />
        </DashboardLayout>
      } />
      <Route path="/xero/vw-data" element={
        <DashboardLayout>
          <XeroViewData />
        </DashboardLayout>
      } />
      <Route path="/xero/vw-cash-sheet" element={
        <DashboardLayout>
          <XeroViewCashSheet />
        </DashboardLayout>
      } />
      <Route path="/xero/vw-related-accounts" element={
        <DashboardLayout>
          <XeroViewRelatedAccounts />
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
      <Route path="/pms/connections" element={
        <DashboardLayout>
          <PMSConnectionList />
        </DashboardLayout>
      } />
      <Route path="/pms/connections/create" element={
        <DashboardLayout>
          <PMSConnectionCreate />
        </DashboardLayout>
      } />
      <Route path="/pms/connections/:id" element={
        <DashboardLayout>
          <PMSConnectionDetail />
        </DashboardLayout>
      } />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
