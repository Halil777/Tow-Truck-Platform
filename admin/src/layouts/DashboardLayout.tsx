import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useUI } from '../contexts/UIContext';

export default function DashboardLayout() {
  const { sidebarCollapsed } = useUI();
  return (
    <div className="layout" data-collapsed={sidebarCollapsed ? '1' : '0'}>
      <Sidebar />
      <main className="content">
        <Header />
        <div className="container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
