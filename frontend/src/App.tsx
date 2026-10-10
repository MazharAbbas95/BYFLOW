import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { BookingWizard } from './pages/BookingWizard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { ShopPOS } from './pages/ShopPOS';
import { LoginPage } from './pages/LoginPage';
import { RegisterOwnerPage } from './pages/RegisterOwnerPage';
import { CallModal } from './components/calling/CallModal';
import { AIFrontDeskModal } from './components/calling/AIFrontDeskModal';
import { ChatbotWidget } from './components/chatbot/ChatbotWidget';

const AppContent: React.FC = () => {
  const { incomingCall, clearIncomingCall, currentShop, user } = useAuth();
  const [showGlobalAiModal, setShowGlobalAiModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Main Navigation */}
      <Navbar onOpenAiFrontDesk={() => setShowGlobalAiModal(true)} />

      {/* Application Routes */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/book" element={<BookingWizard />} />
          <Route path="/portal" element={<CustomerDashboard />} />
          <Route path="/pos" element={<ShopPOS />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register-owner" element={<RegisterOwnerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Floating Chatbot Assistant (Bottom Right) */}
      <ChatbotWidget />

      {/* Realtime Incoming Call Popup (WebRTC) */}
      {incomingCall && (
        <CallModal
          call={{
            ...incomingCall,
            isIncoming: true,
          }}
          onClose={clearIncomingCall}
          onCallMissedOrUnhandled={() => {
            clearIncomingCall();
            setShowGlobalAiModal(true);
          }}
        />
      )}

      {/* AI Front Desk Modal */}
      {showGlobalAiModal && (
        <AIFrontDeskModal
          isOpen={showGlobalAiModal}
          onClose={() => setShowGlobalAiModal(false)}
          shopId={currentShop?.id}
          defaultCustomerIdentifier={user?.email}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
