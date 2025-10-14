import React from 'react';
import { Link } from 'react-router-dom';
import useAppStore from '@/store/app.store';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-black shadow-lg fixed h-full">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar}
              alt={user?.fullName}
              className="h-10 w-10 rounded-full"
            />
            <div>
              <p className="text-sm font-medium text-white mb-0.5 select-none">
                {user?.fullName}
              </p>
              <p className="text-xs text-gray-400 select-none">Quản trị viên</p>
            </div>
          </div>
        </div>
        <nav className="mt-4">
          <ul>
            {/* Quản lý Phim */}
            <li className="mb-2">
              <Link
                to="/admin"
                className="px-4 py-3 block text-gray-200 hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎬</span>
                  <span>Quản lý Phim</span>
                </div>
              </Link>
            </li>

            {/* Quản lý Rạp */}
            <li className="mb-2">
              <Link
                to="/admin"
                className="px-4 py-3 block text-gray-200 hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏢</span>
                  <span>Quản lý Rạp</span>
                </div>
              </Link>
            </li>

            {/* Quản lý Combo */}
            <li className="mb-2">
              <Link
                to="/admin"
                className="px-4 py-3 block text-gray-200 hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🍿</span>
                  <span>Quản lý Combo</span>
                </div>
              </Link>
            </li>

            {/* Quản lý Khuyến mãi */}
            <li className="mb-2">
              <Link
                to="/admin"
                className="px-4 py-3 block text-gray-200 hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎫</span>
                  <span>Quản lý Khuyến mãi</span>
                </div>
              </Link>
            </li>

            {/* Quản lý Blog */}
            <li className="mb-2">
              <Link
                to="/admin"
                className="px-4 py-3 block text-gray-200 hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📝</span>
                  <span>Quản lý Blog</span>
                </div>
              </Link>
            </li>

            {/* Quản lý Người dùng */}
            <li className="mb-2">
              <Link
                to="/admin"
                className="px-4 py-3 block text-gray-200 hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">👥</span>
                  <span>Quản lý Người dùng</span>
                </div>
              </Link>
            </li>

            {/* Báo cáo tổng kết */}
            <li className="mb-2">
              <Link
                to="/admin/promotion-report"
                className="px-4 py-3 block text-gray-200 hover:bg-gray-800 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📊</span>
                  <span>Báo cáo tổng kết</span>
                </div>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-black text-white p-4 flex justify-between items-center shadow-md">
          <h1 className="text-xl font-semibold select-none">
            Admin Dashboard - CineJoy
          </h1>
          <Link
            to="/"
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded transition"
          >
            Quay về trang chủ
          </Link>
        </header>

        {/* Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
