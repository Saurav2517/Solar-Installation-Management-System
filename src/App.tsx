import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PortalLayout from './components/PortalLayout';
import { ToastProvider } from './components/ui';
import { AuthProvider, RequireAdmin, RequireCustomer } from './lib/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enquiries from './pages/Enquiries';
import EnquiryDetail from './pages/EnquiryDetail';
import Surveys from './pages/Surveys';
import Quotes from './pages/Quotes';
import QuoteDetail from './pages/QuoteDetail';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Dispatch from './pages/Dispatch';
import Installations from './pages/Installations';
import InstallationDetail from './pages/InstallationDetail';
import Inventory from './pages/Inventory';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Billing from './pages/Billing';
import Technicians from './pages/Technicians';
import Reports from './pages/Reports';
import Intake from './pages/Intake';
import Shop from './pages/portal/Shop';
import PortalOrders from './pages/portal/Orders';
import PortalOrderDetail from './pages/portal/OrderDetail';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/enquire" element={<Intake />} />

          <Route
            path="/portal"
            element={
              <RequireCustomer>
                <PortalLayout />
              </RequireCustomer>
            }
          >
            <Route index element={<Shop />} />
            <Route path="orders" element={<PortalOrders />} />
            <Route path="orders/:id" element={<PortalOrderDetail />} />
          </Route>

          <Route
            element={
              <RequireAdmin>
                <Layout />
              </RequireAdmin>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="enquiries" element={<Enquiries />} />
            <Route path="enquiries/:id" element={<EnquiryDetail />} />
            <Route path="surveys" element={<Surveys />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="quotes/:id" element={<QuoteDetail />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="dispatch" element={<Dispatch />} />
            <Route path="installations" element={<Installations />} />
            <Route path="installations/:id" element={<InstallationDetail />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="billing" element={<Billing />} />
            <Route path="technicians" element={<Technicians />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
