import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { LoginPage } from './components/auth/LoginPage';
import { AdminPortal } from './components/roles/AdminPortal';
import { OfficerPortal } from './components/roles/OfficerPortal';
import { WarehousePortal } from './components/roles/WarehousePortal';
import { AccountsPortal } from './components/roles/AccountsPortal';
import { SodaDetailModal } from './components/modals/SodaDetailModal';
import { UserModal } from './components/modals/UserModal';
import { RoleSwitchModal } from './components/modals/RoleSwitchModal';
import { ImageViewer } from './components/modals/ImageViewer';

const MainContent = () => {
  const { user, role, modal, setModal, viewer, toast } = useApp();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <Header />
      <main className="app-wrapper">
        {role === 'Admin' && <AdminPortal />}
        {role === 'Officer' && <OfficerPortal />}
        {role === 'Warehouse' && <WarehousePortal />}
        {role === 'Accounts' && <AccountsPortal />}
      </main>

      {/* Modals & Overlays */}
      {modal?.type === 'soda' && (
        <SodaDetailModal
          soda={modal.data}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'user' && (
        <UserModal
          userData={modal.data}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'role-switch' && (
        <RoleSwitchModal
          targetRole={modal.targetRole}
          onClose={() => setModal(null)}
        />
      )}

      {viewer && <ImageViewer />}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-bar">
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
