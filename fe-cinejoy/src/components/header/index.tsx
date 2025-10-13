import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDebounce } from "use-debounce";
import { Dropdown } from "antd";
import { MdDarkMode } from "react-icons/md";
import ModalLogin from "@/components/modal/auth/login";
import SearchDropdown from "@/components/header/SearchDropdown";
import useAppStore from "@/store/app.store";
import { useAlertContextApp } from "@/context/alert.context";
import { logoutApi, updateUserApi, searchMoviesApi } from "@/services/api";
import Logo from "assets/CineJoyLogo.png";

const Header = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");
  const [searchResults, setSearchResults] = useState<IMovie[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [debouncedValue] = useDebounce(searchValue, 300);
  const {
    user,
    isAuthenticated,
    setIsAppLoading,
    setUser,
    setIsAuthenticated,
    isModalOpen,
    setIsModalOpen,
    isDarkMode,
    setIsDarkMode,
  } = useAppStore();
  const { messageApi } = useAlertContextApp();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [debouncedDarkMode] = useDebounce(isDarkMode, 300);
  const [previousDarkMode, setPreviousDarkMode] = useState<boolean | undefined>(
    undefined
  );

  // Khởi tạo previousDarkMode khi component mount
  useEffect(() => {
    if (previousDarkMode === undefined) {
      setPreviousDarkMode(isDarkMode);
    }
  }, [isDarkMode, previousDarkMode]);

  useEffect(() => {
    if (debouncedValue.trim()) {
      setLoadingSearch(true);
      searchMoviesApi(debouncedValue.trim())
        .then((res) => {
          setSearchResults(res.data || []);
          setShowDropdown(true);
        })
        .finally(() => setLoadingSearch(false));
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setLoadingSearch(false);
    }
  }, [debouncedValue]);

  useEffect(() => {
    if (
      debouncedDarkMode !== previousDarkMode &&
      isAuthenticated &&
      user?._id &&
      debouncedDarkMode !== user.settings?.darkMode &&
      previousDarkMode !== undefined
    ) {
      const updateDarkModeInDB = async () => {
        try {
          const res = await updateUserApi(user._id, {
            settings: { darkMode: debouncedDarkMode },
          });
          if (res.data && res.status) {
            setUser(res.data);
            setPreviousDarkMode(debouncedDarkMode);
          }
        } catch (error) {
          setIsDarkMode(previousDarkMode);
          messageApi?.open({
            type: "error",
            content: "Cập nhật dark mode thất bại!",
          });
          console.log(error);
        }
      };
      updateDarkModeInDB();
    } else if (debouncedDarkMode !== previousDarkMode && !isAuthenticated) {
      setPreviousDarkMode(debouncedDarkMode);
    }
  }, [
    debouncedDarkMode,
    previousDarkMode,
    isAuthenticated,
    user?._id,
    user?.settings?.darkMode,
    setUser,
    setIsDarkMode,
    messageApi,
  ]);

  const handleChangeSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (e.target.value.trim()) {
      setLoadingSearch(true);
    }
  };
  const handleSelectMovie = (id: string) => {
    setShowSearch(false);
    setShowDropdown(false);
    setSearchValue("");
    navigate(`/movies/${id}`);
  };

  const handleOpenLoginModal = (value: boolean) => {
    setModalOpen(value);
    setIsModalOpen(true);
  };

  const handleCloseLoginModal = (value: boolean) => {
    setModalOpen(value);
    setIsModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      setIsAppLoading(true);
      const response = await logoutApi();
      if (response.status) {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("accessToken");
        messageApi!.open({
          type: "success",
          content: "Đăng xuất thành công!",
        });
        // Quay về trang chủ sau khi đăng xuất thành công
        navigate("/");
      }
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
      messageApi!.open({
        type: "error",
        content: "Có lỗi xảy ra khi đăng xuất!",
      });
    } finally {
      setIsAppLoading(false);
    }
  };

  const handleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    // Chỉ áp dụng setting của user khi mới đăng nhập hoặc user thay đổi
    if (
      user &&
      typeof user.settings?.darkMode === "boolean" &&
      previousDarkMode !== user.settings.darkMode
    ) {
      setIsDarkMode(user.settings.darkMode);
      setPreviousDarkMode(user.settings.darkMode);
    }
  }, [user, setIsDarkMode, previousDarkMode]);

  const items = [
    {
      key: "members",
      label: <div className="text-center">Thông tin cá nhân</div>,
      onClick: () => navigate("/members"),
    },
    {
      key: "booking-history",
      label: <div className="text-center">Lịch sử đặt vé</div>,
      onClick: () => navigate("/booking-history"),
    },
    {
      key: "logout",
      label: <div className="text-center">Đăng xuất</div>,
      onClick: handleLogout,
    },
  ];
  if (user?.role === "ADMIN") {
    items.unshift({
      label: (
        <Link to="/admin">
          <div className="text-center">Trang quản trị</div>
        </Link>
      ),
      key: "admin",
    });
  }

  const closeSearch = () => {
    setShowSearch(false);
    setSearchValue("");
    setSearchResults([]);
  };

  return (
    <>
      <header
        className={`sticky top-0 ${
          modalOpen || isModalOpen ? "z-500" : "z-2000"
        } ${
          isDarkMode ? "bg-[#23272f]" : "bg-[#eee]"
        } shadow-sm border-b border-[#ccc]`}
      >
        <div className="container mx-auto pl-12 pr-4 py-1.5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center">
              <img
                className="w-[65px] object-cover inline-block"
                src={Logo}
                alt="Logo"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-10 mx-4">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive
                  ? `${
                      isDarkMode ? "text-red-700" : "text-[#9d3b0a]"
                    } font-medium hover:text-red-900 transition-colors uppercase text-[15.5px]`
                  : `${
                      isDarkMode ? "text-white" : "text-gray-800"
                    } font-medium hover:text-red-600 transition-colors uppercase text-[15.5px]`
              }
            >
              Trang chủ
            </NavLink>
            <NavLink
              to="/movies"
              className={({ isActive }) =>
                isActive
                  ? `${
                      isDarkMode ? "text-red-700" : "text-[#9d3b0a]"
                    } font-medium hover:text-red-900 transition-colors uppercase text-[15.5px]`
                  : `${
                      isDarkMode ? "text-white" : "text-gray-800"
                    } font-medium hover:text-red-600 transition-colors uppercase text-[15.5px]`
              }
            >
              Phim
            </NavLink>
            <NavLink
              to="/news"
              className={({ isActive }) =>
                isActive
                  ? `${
                      isDarkMode ? "text-red-700" : "text-[#9d3b0a]"
                    } font-medium hover:text-red-900 transition-colors uppercase text-[15.5px]`
                  : `${
                      isDarkMode ? "text-white" : "text-gray-800"
                    } font-medium hover:text-red-600 transition-colors uppercase text-[15.5px]`
              }
            >
              Tin tức
            </NavLink>
            <NavLink
              to="/members"
              className={({ isActive }) =>
                isActive
                  ? `${
                      isDarkMode ? "text-red-700" : "text-[#9d3b0a]"
                    } font-medium hover:text-red-900 transition-colors uppercase text-[15.5px]`
                  : `${
                      isDarkMode ? "text-white" : "text-gray-800"
                    } font-medium hover:text-red-600 transition-colors uppercase text-[15.5px]`
              }
            >
              Thành viên
            </NavLink>
            <NavLink
              to="/contact"
              className={({ isActive }) =>
                isActive
                  ? `${
                      isDarkMode ? "text-red-700" : "text-[#9d3b0a]"
                    } font-medium hover:text-red-900 transition-colors uppercase text-[15.5px]`
                  : `${
                      isDarkMode ? "text-white" : "text-gray-800"
                    } font-medium hover:text-red-600 transition-colors uppercase text-[15.5px]`
              }
            >
              Liên hệ
            </NavLink>
          </nav>

          {/* Right section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-6">
              <SearchDropdown
                showSearch={showSearch}
                searchValue={searchValue}
                searchResults={searchResults}
                loadingSearch={loadingSearch}
                showDropdown={showDropdown}
                searchInputRef={searchInputRef}
                handleChangeSearch={handleChangeSearch}
                handleSelectMovie={handleSelectMovie}
                closeSearch={closeSearch}
                setShowDropdown={setShowDropdown}
                setShowSearch={setShowSearch}
              />
              <div
                className="cursor-pointer hover:scale-110 transition-all duration-200"
                onClick={handleDarkMode}
              >
                {isDarkMode ? (
                  <MdDarkMode color="white" size={32} />
                ) : (
                  <MdDarkMode size={32} />
                )}
              </div>
              <Dropdown
                menu={{ items }}
                placement="bottom"
                overlayStyle={{ zIndex: 9999 }}
              >
                <div className="flex items-center space-x-2 cursor-pointer hover:text-red-500 transition-all duration-300 hover:opacity-80 mr-3">
                  <img
                    src={user?.avatar}
                    alt="User Avatar"
                    className="w-7.5 h-7.5 mr-3 rounded-full object-cover"
                  />
                  <span
                    className={`text-[15.5px] font-medium ${
                      isDarkMode ? "text-white" : ""
                    }`}
                  >
                    {user?.fullName}
                  </span>
                </div>
              </Dropdown>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-6">
                <SearchDropdown
                  showSearch={showSearch}
                  searchValue={searchValue}
                  searchResults={searchResults}
                  loadingSearch={loadingSearch}
                  showDropdown={showDropdown}
                  searchInputRef={searchInputRef}
                  handleChangeSearch={handleChangeSearch}
                  handleSelectMovie={handleSelectMovie}
                  closeSearch={closeSearch}
                  setShowDropdown={setShowDropdown}
                  setShowSearch={setShowSearch}
                />
                <div
                  className="cursor-pointer hover:scale-110 transition-all duration-200"
                  onClick={handleDarkMode}
                >
                  {isDarkMode ? (
                    <MdDarkMode color="white" size={32} />
                  ) : (
                    <MdDarkMode size={32} />
                  )}
                </div>
                <button
                  className={`${
                    isDarkMode ? "bg-blue-700" : "bg-[#061b4b]"
                  } text-white px-3 py-2.5 rounded-xl hover:opacity-90 transition-opacity font-medium cursor-pointer`}
                  onClick={() => handleOpenLoginModal(false)}
                >
                  Đăng nhập
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <ModalLogin
        isOpen={isModalOpen}
        onOpen={handleOpenLoginModal}
        onClose={handleCloseLoginModal}
      />
    </>
  );
};

export default Header;
