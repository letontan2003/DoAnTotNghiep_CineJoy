import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa";
import Logo from 'assets/CineJoyLogo.png';
import useAppStore from "@/store/app.store";

const Footer = () => {
  const { isDarkMode } = useAppStore();
  
  return (
    <footer className={`${isDarkMode ? "bg-[#16181d]" : "bg-[#eee]"} pt-4`}>
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 px-4">
          {/* Left sidebar - Links */}
          <div className="md:col-span-1">
            <div className="mb-6">
              <Link to="/">
                <img
                  src={Logo}
                  alt="CineJoy Logo"
                  className="w-[90px] h-auto"
                />
              </Link>
            </div>
            <ul className="space-y-3">
              <li>
                <Link to="#" className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}>
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="#" className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}>
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link to="#" className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}>
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                >
                  Chính Sách Quyền Riêng Tư
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                >
                  Yêu cầu riêng về tài khoản
                </Link>
              </li>
              <li>
                <Link
                  to="#"
                  className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                >
                  Hướng dẫn đặt vé online
                </Link>
              </li>
            </ul>
          </div>

          {/* Theater System - 3 columns */}
          <div className="md:col-span-3">
            <h3 className={`text-[20px] font-semibold mb-6 text-center select-none ${isDarkMode ? "text-white" : ""}`}>
              Hệ thống rạp
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Northern Region */}
              <div>
                <h4 className={`font-semibold mb-4 select-none ${isDarkMode ? "text-white" : ""}`}>Miền Bắc</h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Hà Nội Cinema
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Thăng Long Movie
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Royal Hanoi Theater
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy West Lake Cinema
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Red River Film House
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Central Region */}
              <div>
                <h4 className={`font-semibold mb-4 select-none ${isDarkMode ? "text-white" : ""}`}>Miền Trung</h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Đà Nẵng Star Cinema
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Huế Heritage Cinema
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Đồng Hới Film Center
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Nha Trang Sun Theater
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Pleiku Movies
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Southern Region */}
              <div>
                <h4 className={`font-semibold mb-4 select-none ${isDarkMode ? "text-white" : ""}`}>Miền Nam</h4>
                <ul className="space-y-3">
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Sài Gòn Film House
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Mekong Movie Center
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Vũng Tàu Ocean Cinema
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Cần Thơ Riverside Theater
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="#"
                      className={`${isDarkMode ? "text-white" : "text-gray-700"} hover:text-red-600`}
                    >
                      CineJoy Biên Hòa Galaxy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Connect & Contact */}
          <div className="md:col-span-1">
            <div className="mb-8">
              <h3 className={`text-[20px] font-semibold mb-4 select-none ${isDarkMode ? "text-white" : ""}`}>Kết nối</h3>
              <div className="flex gap-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-700"} hover:text-blue-600`}
                >
                  <FaFacebookF className="text-lg" /> Facebook
                </a>
              </div>
              <div className="flex gap-4 my-6">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-700"} hover:text-pink-600`}
                >
                  <FaInstagram className="text-lg" /> Instagram
                </a>
              </div>
              <div className="flex gap-4">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-700"} hover:text-blue-400`}
                >
                  <FaTwitter className="text-lg" /> Twitter
                </a>
              </div>

              <div className="mt-4">
                <img
                  src="https://vticinema.web.app/assets/logo_da_thong_bao_bct-C4rMiu-E.webp"
                  alt="Bộ Công Thương"
                  className="w-36 h-auto"
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-1">
            <div>
              <h3 className={`text-[20px] font-semibold mb-4 select-none ${isDarkMode ? "text-white" : ""}`}>Liên hệ</h3>
              <p className={`mb-3 ${isDarkMode ? "text-white" : ""}`}>CÔNG TY CỔ PHẦN CINEJOY MEDIA</p>
              <p className={`mb-3 ${isDarkMode ? "text-white" : ""}`}>LIÊN HỆ HỢP TÁC</p>
              <p className={`mb-3 ${isDarkMode ? "text-white" : ""}`}>HOTLINE: 1900 1999</p>
              <p className={`mb-3 ${isDarkMode ? "text-white" : ""}`}>EMAIL: cinejoy@gmail.com</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className={`mt-10 py-2 ${isDarkMode ? "bg-[#2a2f39] text-white border-gray-100" : "bg-[#d2d8de] text-gray-600 border-gray-200 border-t"} text-center text-sm`}>
          © Copyright 2024 - 2025
        </div>
      </div>
    </footer>
  );
};

export default Footer;