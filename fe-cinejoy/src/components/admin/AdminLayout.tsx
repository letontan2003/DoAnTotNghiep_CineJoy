import React, { useState } from "react";
import { Link } from "react-router-dom";
import useAppStore from "@/store/app.store";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user } = useAppStore();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(
    new Set(["movieManagement"])
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-roboto">
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
              <div
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has("movieManagement")) {
                    newExpandedMenus.delete("movieManagement");
                  } else {
                    newExpandedMenus.add("movieManagement");
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎬</span>
                  <span>Quản lý Phim</span>
                </div>
                <span
                  className={`transform transition-transform duration-200 ${
                    expandedMenus.has("movieManagement") ? "rotate-180" : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
              {expandedMenus.has("movieManagement") && (
                <ul className="ml-4 border-l border-gray-700">
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "movies" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">🎬</span>
                        <span>Phim</span>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "showSessions" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">🎭</span>
                        <span>Ca chiếu</span>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "showtimes" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">⏰</span>
                        <span>Suất chiếu</span>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "priceLists" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">💰</span>
                        <span>Bảng giá</span>
                      </div>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Quản lý Rạp */}
            <li className="mb-2">
              <div
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has("theaterManagement")) {
                    newExpandedMenus.delete("theaterManagement");
                  } else {
                    newExpandedMenus.add("theaterManagement");
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏢</span>
                  <span>Quản lý Rạp</span>
                </div>
                <span
                  className={`transform transition-transform duration-200 ${
                    expandedMenus.has("theaterManagement") ? "rotate-180" : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
              {expandedMenus.has("theaterManagement") && (
                <ul className="ml-4 border-l border-gray-700">
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "regions" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">🌍</span>
                        <span>Khu vực</span>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "theaters" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">🏢</span>
                        <span>Rạp & Phòng chiếu</span>
                      </div>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Quản lý Bán hàng */}
            <li className="mb-2">
              <div
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has("salesManagement")) {
                    newExpandedMenus.delete("salesManagement");
                  } else {
                    newExpandedMenus.add("salesManagement");
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🛒</span>
                  <span>Quản lý Bán hàng</span>
                </div>
                <span
                  className={`transform transition-transform duration-200 ${
                    expandedMenus.has("salesManagement") ? "rotate-180" : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
              {expandedMenus.has("salesManagement") && (
                <ul className="ml-4 border-l border-gray-700">
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "foodCombos" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">🍿</span>
                        <span>Sản phẩm & Combo</span>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "vouchers" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">🎫</span>
                        <span>Khuyến mãi</span>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "statistics" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">📊</span>
                        <span>Thống Kê</span>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={{ pathname: "/admin" }}
                      state={{ tab: "orders" }}
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">🧾</span>
                        <span>Hóa đơn</span>
                      </div>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Hệ thống & Người dùng */}
            <li className="mb-2">
              <div
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has("systemManagement")) {
                    newExpandedMenus.delete("systemManagement");
                  } else {
                    newExpandedMenus.add("systemManagement");
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚙️</span>
                  <span>Hệ thống & Người dùng</span>
                </div>
                <span
                  className={`transform transition-transform duration-200 ${
                    expandedMenus.has("systemManagement") ? "rotate-180" : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </div>
              {expandedMenus.has("systemManagement") && (
                <ul className="ml-4 border-l border-gray-700">
                  <li>
                    <Link
                      to="/admin"
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">👥</span>
                        <span>Người dùng</span>
                      </div>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/admin"
                      className="px-4 py-2 block text-sm text-gray-300 hover:bg-gray-800 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm">📄</span>
                        <span>Blog</span>
                      </div>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 overflow-x-hidden">
        {/* Header */}
        <header className="bg-black text-white p-4 flex justify-between items-center shadow-md fixed top-0 left-64 right-0 z-10">
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
        <main className="pt-20 p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
