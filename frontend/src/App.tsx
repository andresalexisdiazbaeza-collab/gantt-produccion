import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedLayout from './components/ProtectedLayout'
import ActiveOrders from './pages/ActiveOrders'
import CompletedOrders from './pages/CompletedOrders'
import Dashboard from './pages/Dashboard'
import GanttPage from './pages/GanttPage'
import ImportPage from './pages/ImportPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AccountPage from './pages/AccountPage'
import UsersAdminPage from './pages/UsersAdminPage'
import OptimizePage from './pages/OptimizePage'
import MaterialsPage from './pages/MaterialsPage'
import MachinesPage from './pages/MachinesPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedLayout />}>
          <Route element={<Layout />}>
            <Route path="cuenta" element={<AccountPage />} />
            <Route path="usuarios" element={<UsersAdminPage />} />
            <Route index element={<Dashboard />} />
            <Route path="gantt" element={<GanttPage />} />
            <Route path="optimizar" element={<OptimizePage />} />
            <Route path="ordenes" element={<ActiveOrders />} />
            <Route path="importar" element={<ImportPage />} />
            <Route path="terminadas" element={<CompletedOrders />} />
            <Route path="materiales" element={<MaterialsPage />} />
            <Route path="maquinas" element={<MachinesPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
