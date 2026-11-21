import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InquiriesPage } from './pages/InquiriesPage';
import { QuotesPage } from './pages/QuotesPage';
import { DispatchPage } from './pages/DispatchPage';
import { FieldJobsPage } from './pages/FieldJobsPage';
import { SupportPage } from './pages/SupportPage';
import { DirectorPage } from './pages/DirectorPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate replace to="/inquiries"/>} />
          <Route path="/inquiries" element={<InquiriesPage/>} />
          <Route path="/quotes" element={<QuotesPage/>} />
          <Route path="/dispatch" element={<DispatchPage/>} />
          <Route path="/field-jobs" element={<FieldJobsPage/>} />
          <Route path="/support" element={<SupportPage/>} />
          <Route path="/director" element={<DirectorPage/>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
