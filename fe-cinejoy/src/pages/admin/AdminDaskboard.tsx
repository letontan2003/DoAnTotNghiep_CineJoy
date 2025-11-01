import { useNavigate, useLocation } from "react-router-dom";/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import VoucherDetail from "@/pages/admin/VoucherDetail";
import { Popconfirm, Modal, Table, Tag, Space, Descriptions, Form, Input, DatePicker, Button, message, ConfigProvider } from "antd";
import { Select, InputNumber } from "antd";
import dayjs from "dayjs";
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import viVN from 'antd/locale/vi_VN';
import { getVouchers, addVoucher, updateVoucher, deleteVoucher } from "@/apiservice/apiVoucher";
import { getAllOrders } from "@/apiservice/apiOrder";
import { getFoodCombos, addSingleProduct, addCombo, updateFoodCombo, deleteFoodCombo } from "@/apiservice/apiFoodCombo";
import { getTheaters, addTheater, updateTheater, deleteTheater } from "@/apiservice/apiTheater";
import { getAllPriceLists, createPriceList, updatePriceList, deletePriceList, checkTimeGaps, getProductsForPriceList } from "@/apiservice/apiPriceList";
import { getAllUsersApi, createUserApi, updateUserApi, getAllRoomsApi, createRoomApi, updateRoomApi, deleteRoomApi, createSeatApi, updateSeatApi, createMultipleSeatsApi } from "@/services/api";
import { getAllShowSessionsApi, createShowSessionApi, updateShowSessionApi, deleteShowSessionApi } from "@/apiservice/apiShowSession";
import createInstanceAxios from "@/services/axios.customize";

const axios = createInstanceAxios(import.meta.env.VITE_BACKEND_URL);
import {
  deleteMovie,
  getMovies,
  createMovie,
  updateMovie,
} from "@/apiservice/apiMovies";
import {
  getRegions,
  addRegion,
  deleteRegion,
  getRegionById,
  updateRegion,
} from "@/apiservice/apiRegion";
import { getBlogs, addBlog, updateBlog, deleteBlog } from "@/apiservice/apiBlog";
import {
  getAllShowtimesForAdmin,
  deleteShowtime,
  checkShowtimeOccupiedSeats,
} from "@/apiservice/apiShowTime";
import MovieForm from "@/pages/admin/Form/MovieForm";
import ShowtimeForm from "@/pages/admin/Form/ShowtimeForm";
import FoodComboForm from "@/pages/admin/Form/FoodComboForm";
import VoucherForm from "@/pages/admin/Form/VoucherForm";
import RegionForm from "@/pages/admin/Form/RegionForm";
import BlogForm from "@/pages/admin/Form/BlogForm";
import TheaterForm from "@/pages/admin/Form/TheaterForm";
import UserForm from "@/pages/admin/Form/UserForm";
import RoomForm from "./Form/RoomForm";
import SeatForm from "./Form/SeatForm";
import ShowSessionForm from "./Form/ShowSessionForm";
import PriceListForm from "./Form/PriceListForm";
import useAppStore from "@/store/app.store";

// CSS để ẩn scrollbar
const hideScrollbarStyle = `
  .hide-scrollbar .ant-modal-body::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar .ant-modal-body {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// Thêm CSS vào head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = hideScrollbarStyle;
  document.head.appendChild(style);
}

dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>((history?.state && (history.state as any)?.usr?.tab) || "movies");
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['movieManagement']));
  const [searchTerm, setSearchTerm] = useState<string>("");
  const location = useLocation();
  const urlMatch = location.pathname.match(/\/admin\/vouchers\/(.+)$/);
  const selectedVoucherIdFromUrl = urlMatch ? urlMatch[1] : null;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [movies, setMovies] = useState<IMovie[]>([]);
  const [theaters, setTheaters] = useState<ITheater[]>([]);
  const [regions, setRegions] = useState<IRegion[]>([]);
  const [vouchers, setVouchers] = useState<IVoucher[]>([]);
  const [foodCombos, setFoodCombos] = useState<IFoodCombo[]>([]);
  const [blogs, setBlogs] = useState<IBlog[]>([]);
  const [detailBlog, setDetailBlog] = useState<IBlog | null>(null);
  const [showBlogForm, setShowBlogForm] = useState<boolean>(false);
  const [selectedBlog, setSelectedBlog] = useState<IBlog | undefined>(undefined);
  const [showtimes, setShowtimes] = useState<IShowtime[]>([]);
  const [showtimeOccupiedStatus, setShowtimeOccupiedStatus] = useState<Record<string, boolean>>({});
  const [users, setUsers] = useState<IUser[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showSessions, setShowSessions] = useState<IShowSession[]>([]);
  const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
  const [selectedTheaterForRooms, setSelectedTheaterForRooms] = useState<ITheater | null>(null);
  const [preSelectedTheater, setPreSelectedTheater] = useState<ITheater | null>(null);
  const [showMovieForm, setShowMovieForm] = useState<boolean>(false);
  const [selectedMovie, setSelectedMovie] = useState<IMovie | undefined>(
    undefined
  );
  const [showTimeForm, setShowTimeForm] = useState<boolean>(false);
  const [selectedShowtime, setSelectedShowtime] = useState<IShowtime | null>(
    null
  );
  const [showShowtimeForm, setShowShowtimeForm] = useState<boolean>(false);
  const [editingShowtime, setEditingShowtime] = useState<IShowtime | null>(
    null
  );
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersLoaded, setOrdersLoaded] = useState<boolean>(false);
  // Orders filters & pagination (đặt ở ngoài bảng)
  const [ordersPage, setOrdersPage] = useState<number>(1);
  const [orderSearch, setOrderSearch] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>(""); // yyyy-MM-dd
  const [filterTo, setFilterTo] = useState<string>("");
  const ordersItemsPerPage = 10;

  const loadOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const res = await getAllOrders(1, 1000); // lấy nhiều để tổng hợp theo khách
      const list = (res as any)?.orders || (Array.isArray((res as any)) ? res : []);
      setOrders(list);
      setOrdersLoaded(true);
    } catch (e) {
      console.error("Load orders failed", e);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Chỉ tải đơn hàng khi mở tab Đơn vé lần đầu
  useEffect(() => {
    if (activeTab === 'orders' && !ordersLoaded && !ordersLoading) {
      void loadOrders();
    }
  }, [activeTab, ordersLoaded, ordersLoading, loadOrders]);

  // Gom theo khách hàng (email) -> tính from/to
  const groupedOrders = useMemo(() => {
      const map = new Map<string, { fullName: string; email: string; from: string; to: string }>();
      for (const od of orders) {
        const email = od?.customerInfo?.email || "";
        const fullName = od?.customerInfo?.fullName || "";
        const created = od?.createdAt ? new Date(od.createdAt) : null;
        if (!email || !created) continue;
        const key = email.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            fullName,
            email,
            from: created.toISOString(),
            to: created.toISOString(),
          });
        } else {
          const item = map.get(key)!;
          if (created.toISOString() < item.from) item.from = created.toISOString();
          if (created.toISOString() > item.to) item.to = created.toISOString();
        }
      }
      // chuyển thành mảng và sắp xếp theo tên
      return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
    }, [orders]);

  // Lọc theo text và ngày (áp dụng cho groupedOrders)
  const filteredOrders = useMemo(() => {
      const text = orderSearch.trim().toLowerCase();
      const hasText = text.length > 0;
      const hasFrom = !!filterFrom;
      const hasTo = !!filterTo;

      const fromDate = hasFrom ? new Date(filterFrom) : null;
      const toDate = hasTo ? new Date(filterTo) : null;
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }

      const isWithin = (d: Date) => {
        if (fromDate && toDate) return d >= fromDate && d <= toDate;
        if (fromDate && !toDate) return d >= fromDate;
        if (!fromDate && toDate) return d <= toDate;
        return true; // không lọc
      };

      return groupedOrders.filter((g) => {
        const matchText = !hasText || g.fullName.toLowerCase().includes(text) || g.email.toLowerCase().includes(text);
        if (!matchText) return false;
        if (!hasFrom && !hasTo) return true;
        const from = new Date(g.from);
        const to = new Date(g.to);
        // Chỉ cần 1 trong 2 mốc nằm trong khoảng chọn
        return isWithin(from) || isWithin(to);
      });
    }, [groupedOrders, orderSearch, filterFrom, filterTo]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / ordersItemsPerPage));
  const startIndexOrders = (ordersPage - 1) * ordersItemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndexOrders, startIndexOrders + ordersItemsPerPage);

  useEffect(() => {
    if (ordersPage > totalOrderPages) setOrdersPage(1);
  }, [totalOrderPages, ordersPage]);

  const OrdersTable: React.FC<{ rows: { fullName: string; email: string; from: string; to: string }[] }>
    = ({ rows }) => {
    return (
      <div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 text-black border-b border-gray-200">
              <tr>
                <th className="p-3 text-left font-semibold text-black">Từ ngày</th>
                <th className="p-3 text-left font-semibold text-black">Đến ngày</th>
                <th className="p-3 text-left font-semibold text-black">Người mua</th>
                <th className="p-3 text-left font-semibold text-black">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g: { fullName: string; email: string; from: string; to: string }) => (
                <tr key={g.email} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/orders/invoice/${encodeURIComponent(g.email)}`)}>
                  <td className="p-3">{new Date(g.from).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3">{new Date(g.to).toLocaleDateString("vi-VN")}</td>
                  <td className="p-3">{g.fullName}</td>
                  <td className="p-3">{g.email}</td>
                </tr>
              ))}
              {rows.length === 0 && !ordersLoading && (
                <tr>
                  <td className="p-4 text-center text-gray-500" colSpan={4}>Không có dữ liệu</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  const [showFoodComboForm, setShowFoodComboForm] = useState<boolean>(false);
  const [selectedFoodCombo, setSelectedFoodCombo] = useState<IFoodCombo | undefined>(
    undefined
  );
  const [showVoucherForm, setShowVoucherForm] = useState<boolean>(false);
  const [selectedVoucher, setSelectedVoucher] = useState<IVoucher | undefined>(
    undefined
  );
  const [showRegionForm, setShowRegionForm] = useState<boolean>(false);
  const [selectedRegion, setSelectedRegion] = useState<IRegion | undefined>(
    undefined
  );
  const [showTheaterForm, setShowTheaterForm] = useState<boolean>(false);
  const [selectedTheater, setSelectedTheater] = useState<ITheater | undefined>(
    undefined
  );
  const [theaterLoading, setTheaterLoading] = useState<boolean>(false);
  const [showUserForm, setShowUserForm] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<IUser | undefined>(
    undefined
  );
  const [showRoomForm, setShowRoomForm] = useState<boolean>(false);
  const [selectedRoom, setSelectedRoom] = useState<any | undefined>(
    undefined
  );
  const [showSeatForm, setShowSeatForm] = useState<boolean>(false);
  const [selectedSeat, setSelectedSeat] = useState<any | undefined>(
    undefined
  );
  const [showShowSessionForm, setShowShowSessionForm] = useState<boolean>(false);
  const [selectedShowSession, setSelectedShowSession] = useState<IShowSession | undefined>(
    undefined
  );
  const [showSessionSubmitting, setShowSessionSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  // Chặn navigate khi đang mở Popconfirm trong bảng voucher
  const [blockVoucherRowNavigate, setBlockVoucherRowNavigate] = useState<boolean>(false);
  
  // Price List states
  const [priceLists, setPriceLists] = useState<IPriceList[]>([]);
  const [priceListFormVisible, setPriceListFormVisible] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState<IPriceList | null>(null);
  const [timeGapWarning, setTimeGapWarning] = useState<string | null>(null);
  const [timeGaps, setTimeGaps] = useState<string[]>([]);
  const [viewingPriceList, setViewingPriceList] = useState<IPriceList | null>(null);
  const [priceListDetailVisible, setPriceListDetailVisible] = useState(false);
  const [showPriceListDetailInline, setShowPriceListDetailInline] = useState(false);
  const [splitVersionModalVisible, setSplitVersionModalVisible] = useState(false);
  const [splitVersionData, setSplitVersionData] = useState({
    newName: '',
    newCode: '',
    newDescription: '',
    startDate: '',
    endDate: ''
  });
  const [splitVersionSubmitting, setSplitVersionSubmitting] = useState(false);
  const newCodeInputRef = useRef<any>(null);
  const [editEndDateModalVisible, setEditEndDateModalVisible] = useState(false);
  const [editingEndDatePriceList, setEditingEndDatePriceList] = useState<IPriceList | null>(null);
  const [newEndDateValue, setNewEndDateValue] = useState<string>('');
  const [priceListSubmitting, setPriceListSubmitting] = useState<boolean>(false);
  const [editEndDateSubmitting, setEditEndDateSubmitting] = useState<boolean>(false);
  // Edit all price lines modal states
  const [editPriceLinesModalVisible, setEditPriceLinesModalVisible] = useState(false);
  const [editingPriceLines, setEditingPriceLines] = useState<any[]>([]);
  const [products, setProducts] = useState<{combos: any[], singleProducts: any[]}>({ combos: [], singleProducts: [] });
  const [editPriceLinesSubmitting, setEditPriceLinesSubmitting] = useState(false);
  
  // Load products when edit modal opens
  useEffect(() => {
    if (editPriceLinesModalVisible) {
      const loadProducts = async () => {
        try {
          const productsData = await getProductsForPriceList();
          setProducts(productsData);
        } catch (error) {
          console.error("Error loading products:", error);
          message.error("Lỗi khi tải danh sách sản phẩm");
        }
      };
      
      loadProducts();
    }
  }, [editPriceLinesModalVisible]);

  // Auto focus vào input mã bảng giá khi mở modal sao chép
  useEffect(() => {
    if (splitVersionModalVisible && newCodeInputRef.current) {
      // Delay một chút để đảm bảo modal đã render xong
      setTimeout(() => {
        newCodeInputRef.current?.focus();
      }, 100);
    }
  }, [splitVersionModalVisible]);
  
  const { user } = useAppStore();

  const itemsPerPage = 5; // dùng cho phần Bảng giá, tránh trùng tên với phân trang đơn vé

  // Function to load price lists and check for time gaps
  const loadPriceLists = async () => {
    try {
      const data = await getAllPriceLists();
      setPriceLists(data);
      
      // Check for time gaps
      const gapResult = await checkTimeGaps();
      if (gapResult.hasGap) {
        setTimeGapWarning(gapResult.message || "Có khoảng thời gian trống chưa có bảng giá");
        setTimeGaps(gapResult.gaps || []);
      } else {
        setTimeGapWarning(null);
        setTimeGaps([]);
      }
    } catch (error) {
      console.error("Error fetching price lists:", error);
      setPriceLists([]);
      setTimeGapWarning(null);
      setTimeGaps([]);
    }
  };

  useEffect(() => {
    getTheaters()
      .then((data) => setTheaters(data))
      .catch((error) => {
        console.error("Error fetching theaters:", error);
        setTheaters([]);
      });
    getMovies()
      .then((res) => setMovies(res && Array.isArray(res) ? res : []))
      .catch((error) => {
        console.error("Error fetching movies:", error);
        setMovies([]);
      });
    getFoodCombos()
      .then((data) => setFoodCombos(data))
      .catch((error) => {
        console.error("Error fetching food combos:", error);
        setFoodCombos([]);
      });
    getRegions()
      .then((data) => setRegions(data))
      .catch((error) => {
        console.error("Error fetching regions:", error);
        setRegions([]);
      });
    getVouchers()
      .then((data) => setVouchers(data))
      .catch((error) => {
        console.error("Error fetching vouchers:", error);
        setVouchers([]);
      });
    loadPriceLists();
    getBlogs()
      .then((data) => setBlogs(data))
      .catch((error) => {
        console.error("Error fetching blogs:", error);
        setBlogs([]);
      });
    getAllShowtimesForAdmin()
      .then(async (data) => {
        const showtimesData = data && Array.isArray(data) ? data : [];
        setShowtimes(showtimesData);
        
        // Load occupied status for each showtime
        const occupiedStatuses: Record<string, boolean> = {};
        for (const showtime of showtimesData) {
          try {
            const result = await checkShowtimeOccupiedSeats(showtime._id);
            console.log(`Showtime ${showtime._id} occupied check:`, result);
            occupiedStatuses[showtime._id] = result.hasOccupiedSeats;
          } catch (error) {
            console.error(`Error checking occupied seats for showtime ${showtime._id}:`, error);
            occupiedStatuses[showtime._id] = false;
          }
        }
        console.log('Final occupiedStatuses:', occupiedStatuses);
        setShowtimeOccupiedStatus(occupiedStatuses);
      })
      .catch((error) => {
        console.error("Error fetching showtimes:", error);
        setShowtimes([]);
      });
    getAllUsersApi()
      .then((response) => {
        setUsers(response.data && Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        console.error("Error fetching users:", error);
        setUsers([]);
      });
    loadRooms();
    loadShowSessions();
  }, []);


  // Tự động cập nhật trạng thái voucher mỗi phút
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getVouchers();
        await updateVoucherStatuses(data);
      } catch (error) {
        console.error("Error auto-updating voucher statuses:", error);
      }
    }, 60000); // Cập nhật mỗi 60 giây

    return () => clearInterval(interval);
  }, []);

  // Cập nhật trạng thái voucher khi component được focus lại (từ VoucherDetail)
  useEffect(() => {
    const handleFocus = async () => {
      if (activeTab === "vouchers") {
        try {
          await loadVouchers();
        } catch (error) {
          console.error("Error updating voucher statuses on focus:", error);
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [activeTab]);

  // Cập nhật trạng thái voucher khi quay lại từ VoucherDetail
  useEffect(() => {
    const handlePopState = async () => {
      if (activeTab === "vouchers" && !selectedVoucherIdFromUrl) {
        try {
          await loadVouchers();
        } catch (error) {
          console.error("Error updating voucher statuses on popstate:", error);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab, selectedVoucherIdFromUrl]);

  // Lọc và phân trang cho từng tab
  const filterAndPaginate = <T,>(
    data: T[],
    filterFn: (item: T) => boolean
  ): { paginated: T[]; totalPages: number } => {
    const filtered = searchTerm.trim() ? data.filter(filterFn) : data;
    const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
    const paginated = filtered.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    return { paginated, totalPages };
  };

  // Movies
  const { paginated: paginatedMovies, totalPages: totalMoviePages } =
    filterAndPaginate<IMovie>(movies, (movie) =>
      (movie.title?.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
    );

  // Blogs
  const { paginated: paginatedBlogs, totalPages: totalBlogPages } =
    filterAndPaginate<IBlog>(blogs, (blog) =>
      (blog.title.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
    );

  // FoodCombos
  const { paginated: paginatedCombos, totalPages: totalComboPages } =
    filterAndPaginate<IFoodCombo>(foodCombos, (combo) =>
      (combo.name.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
    );

  // Regions
  const { paginated: paginatedRegions, totalPages: totalRegionPages } =
    filterAndPaginate<IRegion>(regions, (region) =>
      (region.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
    );

  // Theaters
  const { paginated: paginatedTheaters, totalPages: totalTheaterPages } =
    filterAndPaginate<ITheater>(
      theaters,
      (theater) => {
        const theaterMatch = (theater.name?.toLowerCase() ?? "").includes(
          searchTerm.toLowerCase()
        ) ||
        (theater.location?.city?.toLowerCase() ?? "").includes(
          searchTerm.toLowerCase()
        );
        
        // Also search in rooms of this theater
        const hasMatchingRoom = rooms.some(room => 
          room.theater?._id === theater._id && 
          (room.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
        );
        
        return theaterMatch || hasMatchingRoom;
      }
    );

  // Users
  const { paginated: paginatedUsers, totalPages: totalUserPages } =
    filterAndPaginate<IUser>(
      users,
      (user) =>
        (user.fullName?.toLowerCase() ?? "").includes(
          searchTerm.toLowerCase()
        ) ||
        (user.email?.toLowerCase() ?? "").includes(
          searchTerm.toLowerCase()
        ) ||
        (user.phoneNumber?.toLowerCase() ?? "").includes(
          searchTerm.toLowerCase()
        )
    );

  // Vouchers
  const { paginated: paginatedVouchers, totalPages: totalVoucherPages } =
    filterAndPaginate<IVoucher>(vouchers, (voucher) =>
      (voucher.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
    );

  // Showtimes
  const { paginated: paginatedShowtimes, totalPages: totalShowtimePages } =
    filterAndPaginate<IShowtime>(showtimes, (showtime) => {
      const movie = movies.find((m) => m._id === showtime.movieId?._id);
      const theater = theaters.find((t) => t._id === showtime.theaterId?._id);
      return (
        (movie?.title?.toLowerCase() ?? "").includes(
          searchTerm.toLowerCase()
        ) ||
        (theater?.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
      );
    });

  // Show Sessions
  console.log("Current showSessions state:", showSessions);
  const { paginated: paginatedShowSessions, totalPages: totalShowSessionPages } =
    filterAndPaginate<IShowSession>(showSessions, (session) =>
      (session.name?.toLowerCase() ?? "").includes(searchTerm.toLowerCase())
    );
  console.log("Paginated show sessions:", paginatedShowSessions);

  // Reset page when tab/searchTerm thay đổi
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  ////////////////////////Xử lý CRUD khu vực////////////////////////
  const handleRegionSubmit = async (regionData: Partial<IRegion>) => {
    try {
      if (selectedRegion) {
        // Cập nhật
        const updated = await updateRegion(selectedRegion._id, {
          ...selectedRegion,
          ...regionData,
        });
        setRegions(regions.map((r) => (r._id === updated._id ? updated : r)));
        toast.success("Cập nhật khu vực thành công!");
      } else {
        // Thêm mới
        const newRegion: IRegion = await addRegion(regionData as IRegion);
        setRegions([...regions, newRegion]);
        toast.success("Thêm khu vực thành công!");
      }
      
      // Đóng modal và reset
      setShowRegionForm(false);
      setSelectedRegion(undefined);
    } catch (error) {
      console.error("Error submitting region:", error);
      toast.error(selectedRegion ? "Cập nhật khu vực thất bại!" : "Thêm khu vực thất bại!");
    }
  };

  const handleDeleteRegion = async (regionId: string) => {
    try {
      await deleteRegion(regionId);
      setRegions((prevRegions) =>
        prevRegions.filter((region) => region._id !== regionId)
      );
      toast.success("Xóa khu vực thành công!");
    } catch (error) {
      console.error("Error deleting region:", error);
      toast.success("Xóa khu vực thất bại!");
    }
  };
  
  const handleEditRegion = async (regionId: string) => {
    try {
      const region = await getRegionById(regionId);
      setSelectedRegion(region);
      setShowRegionForm(true);
    } catch (error) {
      console.error("Error getting region:", error);
      toast.error("Không lấy được thông tin khu vực!");
    }
  };

  const handleAddRegion = () => {
    setSelectedRegion(undefined);
    setShowRegionForm(true);
  };

  // Load functions
  const loadRooms = async () => {
    try {
      const response = await getAllRoomsApi() as any;
      setRooms(response.data && Array.isArray(response.data) ? response.data : []);
    } catch {
      setRooms([]);
    }
  };


  // Room handlers
  const [isRoomSubmitting, setIsRoomSubmitting] = useState(false);
  
  const handleRoomSubmit = async (roomData: any) => {
    if (isRoomSubmitting) {
      return;
    }
    
    setIsRoomSubmitting(true);
    try {
      
      if (selectedRoom) {
        // Extract seatLayout from roomData
        const { seatLayout, ...roomDataOnly } = roomData;
        
        // Update room basic info
        await updateRoomApi(selectedRoom._id, roomDataOnly);
        
        // If seatLayout exists, update seats
        if (seatLayout && seatLayout.seats && Object.keys(seatLayout.seats).length > 0) {
          
          // Convert seatLayout to ISeat array
          const newSeats: any[] = [];
          Object.keys(seatLayout.seats).forEach(seatId => {
            const seatInfo = seatLayout.seats[seatId];
            const row = seatId.charAt(0);
            const number = parseInt(seatId.substring(1));
            
            newSeats.push({
              seatId: seatId,
              room: selectedRoom._id,
              row: row,
              number: number,
              type: seatInfo.type,
              status: seatInfo.status,
              price: getSeatPrice(seatInfo.type),
              position: {
                x: (number - 1) * 40,
                y: (row.charCodeAt(0) - 65) * 40
              }
            });
          });
          
          await updateRoomSeats(selectedRoom._id, newSeats);
        }
        
        toast.success("Cập nhật phòng chiếu thành công!");
      } else {
        // Create new room (seatLayout will be handled by backend)
        await createRoomApi(roomData);
        toast.success("Thêm phòng chiếu thành công!");
      }
      
      setShowRoomForm(false);
      setSelectedRoom(undefined);
      
      await loadRooms();
      
    } catch (error) {
      console.error("Error submitting room:", error);
      toast.error(selectedRoom ? "Cập nhật phòng chiếu thất bại!" : "Thêm phòng chiếu thất bại!");
    } finally {
      setIsRoomSubmitting(false);
    }
  };

  // Update room seats based on seat layout
  const updateRoomSeats = async (roomId: string, newSeats: any[]) => {
    // Only update if there are seats to create
    if (newSeats.length === 0) {
      return;
    }
    
    // Optimized approach: Use existing APIs but minimize calls
    // Step 1: Delete all existing seats for this room (single API call)
    await axios.delete(`/seats/room/${roomId}/all`);
    
    // Step 2: Create new seats in bulk (single API call)
    await createMultipleSeatsApi(newSeats);
  };

  // Helper function to get seat price based on type
  const getSeatPrice = (type: string): number => {
    switch (type) {
      case 'vip': return 120000;
      case 'couple': return 150000;
      case '4dx': return 180000;
      default: return 75000; // normal
    }
  };

  const handleEditRoom = (room: any) => {
    setSelectedRoom(room);
    setShowRoomForm(true);
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await deleteRoomApi(roomId);
      toast.success("Xóa phòng chiếu thành công!");
      loadRooms();
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("Xóa phòng chiếu thất bại!");
    }
  };


  // Show rooms modal for theater
  const handleShowRooms = (theater: ITheater) => {
    setSelectedTheaterForRooms(theater);
    setShowRoomModal(true);
  };

  // Load functions for Show Sessions
  const loadShowSessions = async () => {
    try {
      console.log("Loading show sessions...");
      const response = await getAllShowSessionsApi();
      console.log("Show sessions response:", response);
      setShowSessions(response || []);
    } catch (error) {
      console.error("Error loading show sessions:", error);
      setShowSessions([]);
    }
  };

  // Show Session handlers
  const handleShowSessionSubmit = async (sessionData: Partial<IShowSession>) => {
    try {
      setShowSessionSubmitting(true);
      if (selectedShowSession) {
        // Update
        await updateShowSessionApi(selectedShowSession._id, sessionData);
        toast.success("Cập nhật ca chiếu thành công!");
      } else {
        // Create new
        await createShowSessionApi(sessionData as any);
        toast.success("Thêm ca chiếu thành công!");
      }
      
      // Reload data after add/edit
      await loadShowSessions();
      setShowShowSessionForm(false);
      setSelectedShowSession(undefined);
    } catch (error) {
      console.error("Error submitting show session:", error);
      toast.error(selectedShowSession ? (error as any)?.message : (error as any)?.response?.data?.message);
    } finally {
      setShowSessionSubmitting(false);
    }
  };

  const handleDeleteShowSession = async (sessionId: string) => {
    try {
      await deleteShowSessionApi(sessionId);
      toast.success("Xóa ca chiếu thành công!");
      loadShowSessions();
    } catch (error) {
      console.error("Error deleting show session:", error);
      toast.error("Xóa ca chiếu thất bại!");
    }
  };

  // Price List handlers
  const handlePriceListSubmit = async (priceListData: any) => {
    try {
      setPriceListSubmitting(true);
      
      if (editingPriceList) {
        // Update
        await updatePriceList(editingPriceList._id, priceListData);
        toast.success("Cập nhật bảng giá thành công!");
      } else {
        // Create new
        const response = await createPriceList(priceListData) as any;
        
        // Hiển thị thông báo thành công và cảnh báo (nếu có)
        if (response.warning) {
          const skippedItems = response.skippedItems || [];
          const detailMessage = skippedItems.length > 0 
            ? `\nChi tiết: ${skippedItems.join(', ')}`
            : '';
          
          // Gộp success và warning thành 1 thông báo
          toast.success("Thêm bảng giá thành công!" + detailMessage);
          
          if (skippedItems.length > 0) {
            console.log("Các sản phẩm/combo đã bỏ qua:", skippedItems);
          }
        } else {
        toast.success("Thêm bảng giá thành công!");
        }
      }
      
      // Reload price lists
      await loadPriceLists();
      
      setPriceListFormVisible(false);
      setEditingPriceList(null);
    } catch (error: any) {
      console.error("Error submitting price list:", error);
      // Hiển thị lỗi từ backend
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Có lỗi xảy ra!";
      toast.error(errorMessage);
    } finally {
      setPriceListSubmitting(false);
    }
  };

  const handleDeletePriceList = async (priceListId: string) => {
    try {
      await deletePriceList(priceListId);
      toast.success("Xóa bảng giá thành công!");
      
      // Reload price lists
      await loadPriceLists();
    } catch (error: any) {
      console.error("Error deleting price list:", error);
      toast.error(error?.response?.data?.message || "Xóa bảng giá thất bại!");
    }
  };

  const handleViewPriceList = (priceList: IPriceList) => {
    setViewingPriceList(priceList);
    setPriceListDetailVisible(false);
    setShowPriceListDetailInline(true);
  };

  const handleDuplicatePriceList = async (dupData: {
    newName: string;
    newCode: string;
    newDescription?: string;
    startDate: string;
    endDate: string;
  }) => {
    if (!editingPriceList) return;
    
    try {
      setSplitVersionSubmitting(true);
      // Tạo mới 1 bảng giá từ dữ liệu bảng gốc, KHÔNG chạm vào bảng gốc
      const response = await createPriceList({
        code: dupData.newCode,
        name: dupData.newName,
        description: dupData.newDescription,
        startDate: dupData.startDate,
        endDate: dupData.endDate,
        lines: editingPriceList.lines,
      } as any) as any;

      // Hiển thị thông báo thành công và cảnh báo (nếu có)
      if ((response as any).warning) {
        const skippedItems = (response as any).skippedItems || [];
        const detailMessage = skippedItems.length > 0 
          ? `\nChi tiết: ${skippedItems.join(', ')}`
          : '';
        
        // Gộp success và warning thành 1 thông báo
        toast.success("Sao chép bảng giá thành công!" + ' ' + 'Đã bỏ qua ' + skippedItems.length + ' sản phẩm/combo không tồn tại trong database.' + detailMessage);
      } else {
        toast.success("Sao chép bảng giá thành công!");
      }

      await loadPriceLists();
      setSplitVersionModalVisible(false);
      setEditingPriceList(null);
            setSplitVersionData({ newName: '', newCode: '', newDescription: '', startDate: '', endDate: '' });
    } catch (error: any) {
      console.error("Error duplicating price list:", error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Sao chép bảng giá thất bại!";
      toast.error(errorMessage);
    } finally {
      setSplitVersionSubmitting(false);
    }
  };

  const handleEditShowSession = (session: IShowSession) => {
    setSelectedShowSession(session);
    setShowShowSessionForm(true);
  };

  const handleAddShowSession = () => {
    setSelectedShowSession(undefined);
    setShowShowSessionForm(true);
  };


  // Seat handlers
  const handleSeatSubmit = async (seatData: any) => {
    try {
      if (selectedSeat) {
        await updateSeatApi(selectedSeat._id, seatData);
        toast.success("Cập nhật ghế ngồi thành công!");
      } else {
        await createSeatApi(seatData);
        toast.success("Thêm ghế ngồi thành công!");
      }
      setShowSeatForm(false);
      setSelectedSeat(undefined);
    } catch (error) {
      console.error("Error submitting seat:", error);
      toast.error(selectedSeat ? "Cập nhật ghế ngồi thất bại!" : "Thêm ghế ngồi thất bại!");
    }
  };


  /////////////////////////////////////////////////////////////////

  ////////////////////////Xử lý CRUD Theater////////////////////////
  const loadTheaters = async () => {
    try {
      const data = await getTheaters();
      setTheaters(data);
    } catch (error) {
      console.error("Error loading theaters:", error);
      setTheaters([]);
    }
  };

  const handleTheaterSubmit = async (theaterData: Partial<ITheater>) => {
    setTheaterLoading(true);
    try {
      if (selectedTheater) {
        // Cập nhật
        await updateTheater(selectedTheater._id, {
          ...selectedTheater,
          ...theaterData,
        } as ITheater);
        toast.success("Cập nhật rạp thành công!");
      } else {
        // Thêm mới
        await addTheater(theaterData as ITheater);
        toast.success("Thêm rạp thành công!");
      }
      
      // Reload dữ liệu sau khi thêm/sửa
      await loadTheaters();
      setShowTheaterForm(false);
      setSelectedTheater(undefined);
    } catch (error) {
      console.error("Error submitting theater:", error);
      toast.error(selectedTheater ? "Cập nhật rạp thất bại!" : "Thêm rạp thất bại!");
    } finally {
      setTheaterLoading(false);
    }
  };

  const handleDeleteTheater = async (theaterId: string) => {
    try {
      await deleteTheater(theaterId);
      // Reload dữ liệu sau khi xóa
      await loadTheaters();
      toast.success("Xóa rạp thành công!");
    } catch (error) {
      console.error("Error deleting theater:", error);
      toast.error("Xóa rạp thất bại!");
    }
  };

  const handleEditTheater = (theater: ITheater) => {
    setSelectedTheater(theater);
    setShowTheaterForm(true);
  };

  const handleAddTheater = () => {
    setSelectedTheater(undefined);
    setShowTheaterForm(true);
  };
  /////////////////////////////////////////////////////////////////

  ////////////////////////Xử lý CRUD User////////////////////////
  const loadUsers = async () => {
    try {
      const response = await getAllUsersApi();
      setUsers(response.data && Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    }
  };

  const handleUserSubmit = async (userData: Partial<IUser>) => {
    try {
      if (selectedUser) {
        // Cập nhật
        await updateUserApi(selectedUser._id!, userData);
        toast.success("Cập nhật người dùng thành công!");
      } else {
        // Thêm mới
        await createUserApi(userData as Parameters<typeof createUserApi>[0]);
        toast.success("Thêm người dùng thành công!");
      }
      
      // Reload dữ liệu sau khi thêm/sửa
      await loadUsers();
      setShowUserForm(false);
      setSelectedUser(undefined);
    } catch (error: unknown) {
      console.error("Error submitting user:", error);
      const errorObj = error as { error?: number };
      if (errorObj?.error === 400) {
        toast.error("Email đã tồn tại!");
      } else {
        toast.error(selectedUser ? "Cập nhật người dùng thất bại!" : "Thêm người dùng thất bại!");
      }
    }
  };


  const handleEditUser = (user: IUser) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setShowUserForm(true);
  };
  /////////////////////////////////////////////////////////////////

  ////////////////////////Xử lý CRUD Food Combo////////////////////////
  const loadFoodCombos = async () => {
    try {
      const data = await getFoodCombos();
      setFoodCombos(data);
    } catch {
      setFoodCombos([]);
    }
  };

  const handleFoodComboSubmit = async (comboData: any) => {
    try {
      if (selectedFoodCombo) {
        // Cập nhật
        await updateFoodCombo(selectedFoodCombo._id!, comboData);
        toast.success("Cập nhật sản phẩm thành công!");
      } else {
        // Thêm mới
        if (comboData.type === 'single') {
          await addSingleProduct({
            code: comboData.code,
            name: comboData.name,
            description: comboData.description
          });
          toast.success("Thêm sản phẩm đơn lẻ thành công!");
        } else {
          await addCombo({
            code: comboData.code,
            name: comboData.name,
            description: comboData.description,
            items: comboData.items
          });
        toast.success("Thêm combo thành công!");
        }
      }
      // Reload dữ liệu sau khi thêm/sửa
      await loadFoodCombos();
      setShowFoodComboForm(false);
      setSelectedFoodCombo(undefined);
    } catch (error) {
      console.error("Error submitting food combo:", error);
      toast.error(selectedFoodCombo ? "Cập nhật sản phẩm thất bại!" : "Thêm sản phẩm thất bại!");
    }
  };

  const handleDeleteFoodCombo = async (comboId: string) => {
    try {
      await deleteFoodCombo(comboId);
      // Reload dữ liệu sau khi xóa
      await loadFoodCombos();
      toast.success("Xóa sản phẩm thành công!");
    } catch (error) {
      console.error("Error deleting food combo:", error);
      toast.error("Xóa sản phẩm thất bại!");
    }
  };

  const handleEditFoodCombo = (combo: IFoodCombo) => {
    setSelectedFoodCombo(combo);
    setShowFoodComboForm(true);
  };

  const handleAddFoodCombo = () => {
    setSelectedFoodCombo(undefined);
    setShowFoodComboForm(true);
  };
  /////////////////////////////////////////////////////////////////

  ////////////////////////Xử lý CRUD Voucher////////////////////////
  const loadVouchers = async () => {
    try {
      const data = await getVouchers();
      
      // Tự động cập nhật trạng thái voucher dựa trên ngày hiện tại
      const updatedData = await updateVoucherStatuses(data);
      
      // Cập nhật state với dữ liệu đã được cập nhật trạng thái
      setVouchers(updatedData || data);
    } catch (error) {
      console.error("Error loading vouchers:", error);
      setVouchers([]);
    }
  };

// Tự động cập nhật trạng thái voucher dựa trên ngày hiện tại
const updateVoucherStatuses = async (vouchers: IVoucher[]) => {
  const today = dayjs();
    const vouchersToUpdate: { id: string; status: 'hoạt động' | 'không hoạt động' }[] = [];

  // Bước 1: Cập nhật trạng thái dựa trên ngày hiện tại
  for (const voucher of vouchers) {
    const startDate = dayjs(voucher.startDate);
    const endDate = dayjs(voucher.endDate);
    
    // Kiểm tra xem ngày hiện tại có nằm trong khoảng thời gian của voucher không
    const isCurrentlyActive = today.isAfter(startDate.startOf('day')) && today.isBefore(endDate.endOf('day'));
    
    // Chỉ tự động cập nhật thành "không hoạt động" nếu ngày hiện tại nằm ngoài khoảng thời gian
    // Nếu ngày hiện tại nằm trong khoảng thời gian, giữ nguyên trạng thái hiện tại (cho phép người dùng sửa)
      let newStatus: 'hoạt động' | 'không hoạt động';
    
    if (!isCurrentlyActive) {
      // Ngày hiện tại nằm ngoài khoảng thời gian → tự động đổi thành "không hoạt động"
        newStatus = 'không hoạt động';
    } else {
      // Ngày hiện tại nằm trong khoảng thời gian → giữ nguyên trạng thái hiện tại
      newStatus = voucher.status;
      }
    
    // Nếu trạng thái khác với trạng thái hiện tại, thêm vào danh sách cập nhật
    if (voucher.status !== newStatus) {
      vouchersToUpdate.push({
        id: voucher._id,
        status: newStatus
      });
    }
  }

  // Bước 2: Xử lý trùng lặp khoảng thời gian
  const overlapUpdates = await handleOverlappingVouchers(vouchers);
  vouchersToUpdate.push(...overlapUpdates);

  // Cập nhật tất cả voucher có trạng thái thay đổi
  for (const update of vouchersToUpdate) {
    try {
      await updateVoucher(update.id, { status: update.status } as any);
      console.log(`Đã cập nhật trạng thái voucher ${update.id} thành ${update.status}`);
    } catch (error) {
      console.error(`Lỗi cập nhật trạng thái voucher ${update.id}:`, error);
    }
  }

  // Trả về dữ liệu đã được cập nhật trạng thái
  if (vouchersToUpdate.length > 0) {
    try {
      const updatedData = await getVouchers();
      return updatedData;
    } catch (error) {
      console.error("Error reloading vouchers after status update:", error);
      return vouchers; // Trả về dữ liệu gốc nếu có lỗi
    }
  }
  
  return vouchers; // Trả về dữ liệu gốc nếu không có cập nhật
};

// Xử lý trùng lặp khoảng thời gian
const handleOverlappingVouchers = async (vouchers: IVoucher[]) => {
  const today = dayjs();
  const updates: { id: string; status: 'hoạt động' | 'không hoạt động' }[] = [];
  
  // Tìm các voucher có trùng lặp khoảng thời gian
  for (let i = 0; i < vouchers.length; i++) {
    const voucher1 = vouchers[i];
    const start1 = dayjs(voucher1.startDate);
    const end1 = dayjs(voucher1.endDate);
    
    // Kiểm tra xem voucher1 có đang trong thời gian hoạt động không
    const isVoucher1Active = today.isAfter(start1.startOf('day')) && today.isBefore(end1.endOf('day'));
    
    if (!isVoucher1Active) continue; // Chỉ xử lý voucher đang hoạt động
    
    for (let j = i + 1; j < vouchers.length; j++) {
      const voucher2 = vouchers[j];
      const start2 = dayjs(voucher2.startDate);
      const end2 = dayjs(voucher2.endDate);
      
      // Kiểm tra xem voucher2 có đang trong thời gian hoạt động không
      const isVoucher2Active = today.isAfter(start2.startOf('day')) && today.isBefore(end2.endOf('day'));
      
      if (!isVoucher2Active) continue; // Chỉ xử lý voucher đang hoạt động
      
      // Kiểm tra trùng lặp: (start1 <= end2) && (start2 <= end1)
      const hasOverlap = (start1.isSameOrBefore(end2) && end1.isSameOrAfter(start2));
      
      if (hasOverlap) {
        // Ưu tiên voucher có ngày tạo mới hơn (ID lớn hơn)
        if (voucher1._id > voucher2._id) {
          // Voucher1 được ưu tiên, voucher2 bị vô hiệu hóa
          if (voucher2.status === 'hoạt động') {
            updates.push({
              id: voucher2._id,
              status: 'không hoạt động'
            });
          }
        } else {
          // Voucher2 được ưu tiên, voucher1 bị vô hiệu hóa
          if (voucher1.status === 'hoạt động') {
            updates.push({
              id: voucher1._id,
              status: 'không hoạt động'
            });
          }
        }
      }
    }
  }
  
  return updates;
  };

  const handleVoucherSubmit = async (voucherData: Partial<IVoucher>) => {
    try {
      if (selectedVoucher) {
        // Cập nhật
        await updateVoucher(selectedVoucher._id!, voucherData as IVoucher);
        toast.success("Cập nhật voucher thành công!");
      } else {
        // Thêm mới
        await addVoucher(voucherData as IVoucher);
        toast.success("Thêm voucher thành công!");
      }
      // Reload dữ liệu sau khi thêm/sửa
      await loadVouchers();
      setShowVoucherForm(false);
      setSelectedVoucher(undefined);
    } catch (error) {
      console.error("Error submitting voucher:", error);
      toast.error(selectedVoucher ? "Cập nhật voucher thất bại!" : "Thêm voucher thất bại!");
    }
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    try {
      await deleteVoucher(voucherId);
      // Reload dữ liệu sau khi xóa
      await loadVouchers();
    toast.success("Xóa khuyến mãi thành công!");
    } catch (error) {
      console.error("Error deleting voucher:", error);
    toast.error("Xóa khuyến mãi thất bại!");
    }
  };

  const handleEditVoucher = (voucher: IVoucher) => {
    setSelectedVoucher(voucher);
    setShowVoucherForm(true);
  };

  const handleAddVoucher = () => {
    setSelectedVoucher(undefined);
    setShowVoucherForm(true);
  };
  /////////////////////////////////////////////////////////////////

  ////////////////////////Xử lý CRUD phim ////////////////////////
  const handleDeleteMovies = async (movieId: string) => {
    try {
      await deleteMovie(movieId);
      setMovies((prevMovies) =>
        prevMovies.filter((movie) => movie._id !== movieId)
      );
      toast.success("Xóa Movie thành công!");
    } catch (error) {
      console.error("Error deleting movie:", error);
      toast.error("Xóa movie thất bại!");
    }
  };

  const handleAddMovie = async (movieData: Partial<IMovie>) => {
    try {
      const newMovie = await createMovie(movieData as IMovie);
      setMovies((prev) => [...prev, newMovie]);
      setShowMovieForm(false);
      toast.success("Thêm phim thành công!");
    } catch (error) {
      console.error("Error adding movie:", error);
      toast.error("Thêm phim thất bại!");
    }
  };

  const handleUpdateMovie = async (movieData: Partial<IMovie>) => {
    if (!selectedMovie?._id) return;
    try {
      await updateMovie(
        selectedMovie._id,
        movieData as IMovie
      );
      // Reload movies để đảm bảo dữ liệu được cập nhật
      const moviesRes = await getMovies();
      setMovies(Array.isArray(moviesRes) ? moviesRes : ((moviesRes as any)?.data ?? []));
      setShowMovieForm(false);
      setSelectedMovie(undefined);
      toast.success("Cập nhật phim thành công!");
    } catch (error) {
      console.error("Error updating movie:", error);
      toast.error("Cập nhật phim thất bại!");
    }
  };

  const handleEditMovie = (movie: IMovie) => {
    setSelectedMovie(movie);
    setShowMovieForm(true);
  };

  ///////////////Suất chiếu////////////////
  const handleShowtimeDetail = (showtime: IShowtime) => {
    setSelectedShowtime(showtime);
    setShowTimeForm(true);
  };

  const handleDeleteShowtime = async (id: string) => {
    try {
      await deleteShowtime(id);
      setShowtimes((prevShowtimes) =>
        prevShowtimes.filter((showtime) => showtime._id !== id)
      );
      toast.success("Xóa suất chiếu thành công!");
    } catch (error) {
      console.error("Error deleting showtime:", error);
      toast.error("Xóa suất chiếu thất bại!");
    }
  };


  const handleEditShowtime = (showtime: IShowtime) => {
    setEditingShowtime(showtime);
    setShowShowtimeForm(true);
  };


  return (
    <div className="min-h-screen flex font-roboto bg-white">
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
                  if (expandedMenus.has('movieManagement')) {
                    newExpandedMenus.delete('movieManagement');
                  } else {
                    newExpandedMenus.add('movieManagement');
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎬</span>
                  <span>Quản lý Phim</span>
                </div>
                <span className={`transform transition-transform duration-200 ${expandedMenus.has('movieManagement') ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedMenus.has('movieManagement') && (
                <ul className="ml-4 border-l border-gray-700">
            {[
              { label: "Phim", value: "movies", icon: "🎬" },
              { label: "Ca chiếu", value: "showSessions", icon: "🎭" },
              { label: "Suất chiếu", value: "showtimes", icon: "⏰" },
              { label: "Bảng giá", value: "priceLists", icon: "💰" },
                  ].map((subItem) => (
                    <li
                      key={subItem.value}
                      className={`px-4 py-2 cursor-pointer flex items-center gap-3 text-sm transition-colors duration-200 ${
                        activeTab === subItem.value
                    ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={async () => {
                        setActiveTab(subItem.value);
                        setSearchTerm("");
                        setCurrentPage(1);
                        
                        // Tự động mở dropdown Quản lý Phim
                        const newExpandedMenus = new Set(expandedMenus);
                        newExpandedMenus.add('movieManagement');
                        setExpandedMenus(newExpandedMenus);
                      }}
                    >
                      <span className="text-sm">{subItem.icon}</span>
                      {subItem.label}
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {/* Quản lý Rạp */}
            <li className="mb-2">
              <div 
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has('theaterManagement')) {
                    newExpandedMenus.delete('theaterManagement');
                  } else {
                    newExpandedMenus.add('theaterManagement');
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🏢</span>
                  <span>Quản lý Rạp</span>
                </div>
                <span className={`transform transition-transform duration-200 ${expandedMenus.has('theaterManagement') ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedMenus.has('theaterManagement') && (
                <ul className="ml-4 border-l border-gray-700">
                  {[
                    { label: "Khu vực", value: "regions", icon: "🌏" },
                    { label: "Rạp & Phòng chiếu", value: "theaters", icon: "🏢" },
                  ].map((subItem) => (
                    <li
                      key={subItem.value}
                      className={`px-4 py-2 cursor-pointer flex items-center gap-3 text-sm transition-colors duration-200 ${
                        activeTab === subItem.value
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={async () => {
                        setActiveTab(subItem.value);
                  setSearchTerm("");
                  setCurrentPage(1);
                        
                        // Tự động mở dropdown Quản lý Rạp
                        const newExpandedMenus = new Set(expandedMenus);
                        newExpandedMenus.add('theaterManagement');
                        setExpandedMenus(newExpandedMenus);
                }}
              >
                      <span className="text-sm">{subItem.icon}</span>
                      {subItem.label}
              </li>
            ))}
                </ul>
              )}
            </li>

            {/* Quản lý Bán hàng */}
            <li className="mb-2">
              <div 
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has('salesManagement')) {
                    newExpandedMenus.delete('salesManagement');
                  } else {
                    newExpandedMenus.add('salesManagement');
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🛒</span>
                  <span>Quản lý Bán hàng</span>
                </div>
                <span className={`transform transition-transform duration-200 ${expandedMenus.has('salesManagement') ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedMenus.has('salesManagement') && (
                <ul className="ml-4 border-l border-gray-700">
                  {[
                    { label: "Sản phẩm & Combo", value: "foodCombos", icon: "🍿" },
                    { label: "Khuyến mãi", value: "vouchers", icon: "🎫" },
                    { label: "Thống Kê", value: "statistics", icon: "📊" },
                    { label: "Đơn vé", value: "orders", icon: "🧾" },
                  ].map((subItem) => (
                    <li
                      key={subItem.value}
                      className={`px-4 py-2 cursor-pointer flex items-center gap-3 text-sm transition-colors duration-200 ${
                        activeTab === subItem.value
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={async () => {
                        setActiveTab(subItem.value);
                        setSearchTerm("");
                        setCurrentPage(1);
                        
                        // Tự động mở dropdown Quản lý Bán hàng
                        const newExpandedMenus = new Set(expandedMenus);
                        newExpandedMenus.add('salesManagement');
                        setExpandedMenus(newExpandedMenus);
                        
                        // Nếu chuyển sang tab "Khuyến mãi", cập nhật trạng thái voucher
                        if (subItem.value === "vouchers") {
                          try {
                            await loadVouchers();
                          } catch (error) {
                            console.error("Error updating voucher statuses when switching to vouchers tab:", error);
                          }
                        }
                      }}
                    >
                      <span className="text-sm">{subItem.icon}</span>
                      {subItem.label}
                    </li>
                  ))}
                </ul>
              )}
            </li>

            {/* Hệ thống & Người dùng */}
            <li className="mb-2">
              <div 
                className="px-4 py-3 cursor-pointer flex items-center justify-between text-gray-200 hover:bg-gray-800 transition-colors duration-200"
                onClick={() => {
                  const newExpandedMenus = new Set(expandedMenus);
                  if (expandedMenus.has('systemManagement')) {
                    newExpandedMenus.delete('systemManagement');
                  } else {
                    newExpandedMenus.add('systemManagement');
                  }
                  setExpandedMenus(newExpandedMenus);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚙️</span>
                  <span>Hệ thống & Người dùng</span>
                </div>
                <span className={`transform transition-transform duration-200 ${expandedMenus.has('systemManagement') ? 'rotate-180' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
              {expandedMenus.has('systemManagement') && (
                <ul className="ml-4 border-l border-gray-700">
                  {[
                    { label: "Người dùng", value: "users", icon: "👥" },
                    { label: "Blog", value: "blogs", icon: "📰" },
                  ].map((subItem) => (
                    <li
                      key={subItem.value}
                      className={`px-4 py-2 cursor-pointer flex items-center gap-3 text-sm transition-colors duration-200 ${
                        activeTab === subItem.value
                          ? "bg-gray-900 text-white"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                      onClick={async () => {
                        setActiveTab(subItem.value);
                        setSearchTerm("");
                        setCurrentPage(1);
                        
                        // Tự động mở dropdown Hệ thống & Người dùng
                        const newExpandedMenus = new Set(expandedMenus);
                        newExpandedMenus.add('systemManagement');
                        setExpandedMenus(newExpandedMenus);
                      }}
                    >
                      <span className="text-sm">{subItem.icon}</span>
                      {subItem.label}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header - Fixed/Sticky */}
        <header className="sticky top-0 z-50 bg-black text-white p-4 flex justify-between items-center shadow-md">
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
          {/* Movies Tab */}
          {activeTab === "movies" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý phim
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <motion.button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedMovie(undefined);
                    setShowMovieForm(true);
                  }}
                >
                  Thêm phim
                </motion.button>
                <div>
                  <span>
                    Trang {currentPage} / {totalMoviePages}
                  </span>
                  <button
                    className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Trước
                  </button>
                  <button
                    className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                    disabled={currentPage === totalMoviePages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Mã phim</th>
                      <th className="p-3 text-left font-semibold text-black">Poster</th>
                      <th className="p-3 text-left font-semibold text-black">Tên phim</th>
                      <th className="p-3 text-left font-semibold text-black">Ngày khởi chiếu</th>
                      <th className="p-3 text-left font-semibold text-black">Ngày kết thúc</th>
                      <th className="p-3 text-left font-semibold text-black">Thời lượng</th>
                      <th className="p-3 text-left font-semibold text-black">Diễn Viên</th>
                      <th className="p-3 text-left font-semibold text-black">Thể loại</th>
                      <th className="p-3 text-left font-semibold text-black">Đạo diễn</th>
                      <th className="p-3 text-left font-semibold text-black">Trạng thái</th>
                      <th className="p-3 text-left font-semibold text-black">Ngôn Ngữ</th>
                      <th className="p-3 text-left font-semibold text-black">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMovies.map((movie, idx) => (
                      <tr
                        key={movie._id}
                        className="border-b hover:bg-gray-100"
                      >
                        <td className="p-3">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-black">{movie.movieCode || 'N/A'}</span>
                        </td>
                        <td className="p-3">
                          <img
                            src={movie.image}
                            alt={movie.title}
                            className="w-16 h-20 object-cover rounded"
                          />
                        </td>
                        <td className="p-3">{movie.title}</td>
                        <td className="p-3">
                          {movie.startDate ? new Date(movie.startDate).toLocaleDateString(
                            "vi-VN"
                          ) : 'Chưa có'}
                        </td>
                        <td className="p-3">
                          {movie.endDate ? new Date(movie.endDate).toLocaleDateString(
                            "vi-VN"
                          ) : 'Chưa có'}
                        </td>
                        <td className="p-3">{movie.duration} phút</td>
                        <td className="p-3">
                          {movie.actors.join(", ").length > 10
                            ? movie.actors.join(", ").substring(0, 10) + "..."
                            : movie.actors.join(", ")}
                        </td>
                        <td className="p-3">
                          {movie.genre.join(", ").length > 10
                            ? movie.genre.join(", ").substring(0, 10) + "..."
                            : movie.genre.join(", ")}
                        </td>
                        <td className="p-3">{movie.director}</td>
                        <td className="p-3">{movie.status}</td>
                        <td className="p-3">{movie.language}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <motion.button
                              className="bg-yellow-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-yellow-600"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleEditMovie(movie)}
                            >
                              Sửa
                            </motion.button>
                            <Popconfirm
                              title="Xóa phim"
                              description={`Bạn có chắc chắn muốn xóa phim "${movie.title}"?`}
                              okText="Xóa"
                              cancelText="Hủy"
                              onConfirm={() => handleDeleteMovies(movie._id)}
                            >
                              <motion.button
                                className="bg-red-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-red-600"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                Xóa
                              </motion.button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detailBlog && (
            <Modal
              open
              title={<div className="text-center text-lg">Nội dung tin tức</div>}
              onCancel={() => setDetailBlog(null)}
              footer={null}
              width={700}
              centered
            >
              <div className="space-y-3" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <div>
                  <strong>Tiêu đề:</strong> {detailBlog.title}
                </div>
                <div>
                  <strong>Mô tả:</strong> {detailBlog.description}
                </div>
                <div>
                  <strong>Nội dung:</strong>
                </div>
                <div className="whitespace-pre-line leading-7">
                  {detailBlog.content}
                </div>
              </div>
            </Modal>
          )}

          {showBlogForm && (
            <BlogForm
              blog={selectedBlog}
              onSubmit={async (data) => {
                try {
                  if (selectedBlog) {
                    const updated = await updateBlog(selectedBlog._id, data);
                    setBlogs((prev) => prev.map(b => b._id === updated._id ? updated : b));
                    toast.success("Cập nhật tin tức thành công!");
                  } else {
                    const created = await addBlog(data as IBlog);
                    setBlogs((prev) => [...prev, created]);
                    toast.success("Thêm tin tức thành công!");
                  }
                  setShowBlogForm(false);
                  setSelectedBlog(undefined);
                } catch (error) {
                  console.error("Error adding/updating blog:", error);
                  const errMsg = (error as any)?.response?.data?.message || (error as any)?.message;
                  toast.error(errMsg || (selectedBlog ? "Cập nhật tin tức thất bại!" : "Thêm tin tức thất bại!"));
                }
              }}
              onCancel={() => {
                setShowBlogForm(false);
                setSelectedBlog(undefined);
              }}
            />
          )}

          {/* Blogs Tab */}
          {activeTab === "blogs" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý Blog
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm blog..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-3">
                  <motion.button
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { setSelectedBlog(undefined); setShowBlogForm(true); }}
                  >
                    Thêm tin tức
                  </motion.button>
                  {/* Optional quick check for duplicate code can be added before submit using getBlogByCode */}
                  <span>
                    Trang {currentPage} / {totalBlogPages}
                  </span>
                  <button
                    className="px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Trước
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                    disabled={currentPage === totalBlogPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Mã tin</th>
                      <th className="p-3 text-left font-semibold text-black">Tiêu đề</th>
                      <th className="p-3 text-left font-semibold text-black">Mô tả</th>
                      <th className="p-3 text-left font-semibold text-black">Ngày đăng</th>
                      <th className="p-3 text-left font-semibold text-black">Trạng thái</th>
                      <th className="p-3 text-left font-semibold text-black">Nội dung</th>
                      <th className="p-3 text-left font-semibold text-black">Ảnh Poster</th>
                      <th className="p-3 text-left font-semibold text-black">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBlogs.map((blog, idx) => (
                      <tr key={blog._id} className="border-b hover:bg-gray-100">
                        <td className="p-3">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="p-3 font-semibold text-black">{blog.blogCode}</td>
                        <td className="p-3">{blog.title}</td>
                        <td className="pl-2 pr-3 py-3 max-w-xs text-left">
                          <div className="truncate text-left" title={blog.description}>
                            {blog.description}
                          </div>
                        </td>
                        <td className="p-3">{new Date(blog.postedDate).toLocaleDateString("vi-VN")}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            blog.status === 'Hiển thị' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {blog.status || 'Hiển thị'}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            style={{ textDecoration: 'none' }}
                            onClick={() => setDetailBlog(blog)}
                          >
                            Xem chi tiết
                          </button>
                        </td>
                        <td className="p-3">
                          <img src={blog.posterImage} alt={blog.title} className="w-16 h-16 object-cover rounded" />
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <motion.button
                              className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 cursor-pointer"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => { setSelectedBlog(blog); setShowBlogForm(true); }}
                            >
                              Sửa
                            </motion.button>
                            <Popconfirm
                              title="Xóa tin tức"
                              description={`Bạn có chắc chắn muốn xóa "${blog.title}"?`}
                              okText="Xóa"
                              cancelText="Hủy"
                              onConfirm={async () => {
                                try {
                                  await deleteBlog(blog._id);
                                  setBlogs(prev => prev.filter(b => b._id !== blog._id));
                                  toast.success("Xóa tin tức thành công!");
                                } catch (e) {
                                  console.error("Error deleting blog:", e);
                                  toast.error("Xóa tin tức thất bại!");
                                }
                              }}
                            >
                              <motion.button className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 cursor-pointer" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                Xóa
                              </motion.button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === "statistics" && (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
              {/* Header Section - simple style */}
              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2 text-black select-none text-left">
                  Thống Kê Bán Hàng
              </h2>
                <p className="text-left text-gray-600 text-sm">
                  Báo cáo và phân tích dữ liệu kinh doanh
                </p>
              </div>
              
              {/* Content Section */}
              <div className="space-y-8">
                {/* Info Cards/Tips Section */}
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-4 gap-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Info Card 1 - Doanh Thu */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-blue-800 text-base font-bold mb-2 text-center">Theo Dõi Doanh Thu</h3>
                    <p className="text-sm text-blue-700 text-center leading-relaxed">
                      Xem báo cáo chi tiết để nắm bắt xu hướng kinh doanh theo thời gian
                    </p>
                  </div>

                  {/* Info Card 2 - Khách Hàng */}
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl shadow-lg p-6 border border-emerald-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-emerald-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-emerald-800 text-base font-bold mb-2 text-center">Phân Tích Khách Hàng</h3>
                    <p className="text-sm text-emerald-700 text-center leading-relaxed">
                      Hiểu rõ hành vi mua sắm và xây dựng chiến lược chăm sóc khách hàng
                    </p>
                  </div>

                  {/* Info Card 3 - Khuyến Mãi */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-purple-800 text-base font-bold mb-2 text-center">Tối Ưu Khuyến Mãi</h3>
                    <p className="text-sm text-purple-700 text-center leading-relaxed">
                      Đánh giá hiệu quả chương trình để tăng trưởng doanh số bền vững
                    </p>
                  </div>

                  {/* Info Card 4 - Biểu Đồ */}
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-xl shadow-lg p-6 border border-orange-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-orange-600 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-orange-800 text-base font-bold mb-2 text-center">Trực Quan Hóa Dữ Liệu</h3>
                    <p className="text-sm text-orange-700 text-center leading-relaxed">
                      Sử dụng biểu đồ để ra quyết định kinh doanh chính xác và nhanh chóng
                    </p>
                  </div>
                </motion.div>

                {/* Main Reports Section */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-100">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {/* Card 1: Doanh số theo ngày */}
                  <motion.button
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-[2px] hover:shadow-2xl transition-all duration-300 cursor-pointer"
                      whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                      onClick={() => navigate('/admin/sales-report-by-day')}
                    >
                      <div className="relative bg-white rounded-xl p-8 h-full">
                        {/* Animated gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                        
                        {/* Shine effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                          {/* Icon & Badge */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="px-3 py-1 bg-blue-50 rounded-full">
                              <span className="text-xs font-semibold text-blue-600">Chi tiết</span>
                            </div>
                          </div>
                          
                          {/* Title */}
                          <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                            Doanh Số Theo Ngày
                    </h3>
                          
                          {/* Description */}
                          <p className="text-sm text-gray-600 mb-4 flex-grow">
                            Xem chi tiết doanh thu và đơn hàng theo từng ngày, rạp chiếu và phim
                          </p>
                          
                          {/* Arrow Icon */}
                          <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-2 transition-transform duration-300">
                            <span>Xem báo cáo</span>
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>

                        {/* Corner decoration */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </motion.button>

                    {/* Card 2: Doanh số theo khách hàng */}
                  <motion.button
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 p-[2px] hover:shadow-2xl transition-all duration-300 cursor-pointer"
                      whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                      onClick={() => navigate('/admin/sales-report-by-customer')}
                    >
                      <div className="relative bg-white rounded-xl p-8 h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                        
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                            <div className="px-3 py-1 bg-emerald-50 rounded-full">
                              <span className="text-xs font-semibold text-emerald-600">Phân tích</span>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-emerald-600 transition-colors duration-300">
                            Doanh Số Theo Khách Hàng
                    </h3>
                          
                          <p className="text-sm text-gray-600 mb-4 flex-grow">
                            Phân tích doanh thu theo khách hàng, thứ hạng và lịch sử giao dịch
                          </p>
                          
                          <div className="flex items-center text-emerald-600 font-semibold text-sm group-hover:translate-x-2 transition-transform duration-300">
                            <span>Xem báo cáo</span>
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>

                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </motion.button>

                    {/* Card 3: Báo cáo khuyến mãi */}
                  <motion.button
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 p-[2px] hover:shadow-2xl transition-all duration-300 cursor-pointer"
                      whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    onClick={() => navigate('/admin/promotion-report')}
                  >
                      <div className="relative bg-white rounded-xl p-8 h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                        
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            </div>
                            <div className="px-3 py-1 bg-purple-50 rounded-full">
                              <span className="text-xs font-semibold text-purple-600">Tổng hợp</span>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-purple-600 transition-colors duration-300">
                            Báo Cáo Khuyến Mãi
                    </h3>
                          
                          <p className="text-sm text-gray-600 mb-4 flex-grow">
                            Tổng hợp hiệu quả các chương trình khuyến mãi và voucher đã sử dụng
                          </p>
                          
                          <div className="flex items-center text-purple-600 font-semibold text-sm group-hover:translate-x-2 transition-transform duration-300">
                            <span>Xem báo cáo</span>
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>

                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </motion.button>

                    {/* Card 4: Bảng Kê Trả Vé */}
                  <motion.button
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-[2px] hover:shadow-2xl transition-all duration-300 cursor-pointer"
                      whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                      onClick={() => navigate('/admin/refund-report')}
                    >
                      <div className="relative bg-white rounded-xl p-8 h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                        
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="px-3 py-1 bg-rose-50 rounded-full">
                              <span className="text-xs font-semibold text-rose-600">Báo cáo</span>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-rose-600 transition-colors duration-300">
                            Bảng Kê Trả Vé
                    </h3>
                          
                          <p className="text-sm text-gray-600 mb-4 flex-grow">
                            Xem chi tiết các vé đã trả, lý do trả vé và tổng hợp doanh số bị hoàn
                          </p>
                          
                          <div className="flex items-center text-rose-600 font-semibold text-sm group-hover:translate-x-2 transition-transform duration-300">
                            <span>Xem báo cáo</span>
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>

                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </motion.button>
                  </div>

                  {/* Biểu Đồ Doanh Thu - Moved to new row */}
                  <div className="mt-6">
                    <motion.button
                      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 p-[2px] hover:shadow-2xl transition-all duration-300 cursor-pointer w-full"
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      onClick={() => navigate('/admin/sales-chart-report')}
                    >
                      <div className="relative bg-white rounded-xl p-8 h-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                        
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        </div>
                        
                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                            <div className="px-3 py-1 bg-orange-50 rounded-full">
                              <span className="text-xs font-semibold text-orange-600">Trực quan</span>
                            </div>
                          </div>
                          
                          <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors duration-300">
                            Biểu Đồ Doanh Thu
                    </h3>
                          
                          <p className="text-sm text-gray-600 mb-4 flex-grow">
                            Trực quan hóa dữ liệu doanh thu qua biểu đồ theo thời gian và rạp chiếu
                          </p>
                          
                          <div className="flex items-center text-orange-600 font-semibold text-sm group-hover:translate-x-2 transition-transform duration-300">
                            <span>Xem báo cáo</span>
                            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                          </div>
                        </div>

                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Food Combos Tab */}
          {activeTab === "foodCombos" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý Sản phẩm & Combo
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm/combo..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={handleAddFoodCombo}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Thêm sản phẩm
                  </motion.button>
                  <div>
                    <span>
                      Trang {currentPage} / {totalComboPages}
                    </span>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Trước
                    </button>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === totalComboPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Mã SP/Combo</th>
                      <th className="p-3 text-left font-semibold text-black">Loại</th>
                      <th className="p-3 text-left font-semibold text-black">Tên</th>
                      <th className="p-3 text-left font-semibold text-black">Mô tả</th>
                      <th className="p-3 text-left font-semibold text-black">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCombos.map((combo, idx) => (
                      <tr
                        key={combo._id}
                        className="border-b hover:bg-gray-100"
                      >
                        <td className="p-3">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="p-3 text-base font-semibold text-gray-900">{(combo as any).code || 'N/A'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            combo.type === 'single' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {combo.type === 'single' ? 'Sản phẩm' : 'Combo'}
                          </span>
                        </td>
                        <td className="p-3 font-medium">{combo.name}</td>
                        <td className="p-3 max-w-xs truncate" title={combo.description}>
                          {combo.description}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <motion.button
                              onClick={() => handleEditFoodCombo(combo)}
                              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 cursor-pointer"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Sửa
                            </motion.button>
                            <Popconfirm
                              title="Xóa sản phẩm"
                              description="Bạn có chắc chắn muốn xóa sản phẩm này?"
                              onConfirm={() => handleDeleteFoodCombo(combo._id!)}
                              okText="Có"
                              cancelText="Không"
                            >
                              <motion.button
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 cursor-pointer"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Xóa
                              </motion.button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Regions Tab */}
          {activeTab === "regions" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý Khu vực
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm khu vực..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={handleAddRegion}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Thêm khu vực
                  </motion.button>
                  <div>
                    <span>
                      Trang {currentPage} / {totalRegionPages}
                    </span>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Trước
                    </button>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === totalRegionPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Mã Khu vực</th>
                      <th className="p-3 text-left font-semibold text-black">Tên Khu vực</th>
                      <th className="p-3 text-left font-semibold text-black">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRegions.map((region, idx) => (
                      <tr
                        key={region._id}
                        className="border-b hover:bg-gray-100"
                      >
                        <td className="p-3">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-black">{region.regionCode || 'N/A'}</span>
                        </td>
                        <td className="p-3">{region.name}</td>
                        <td className="p-3">
                          <motion.button
                            className="bg-yellow-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-yellow-600 mr-2"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditRegion(region._id)}
                          >
                            Sửa
                          </motion.button>
                          <Popconfirm
                            title="Xóa khu vực"
                            description="Bạn có chắc chắn muốn xóa khu vực này?"
                            okText="Xóa"
                            cancelText="Hủy"
                            onConfirm={() => handleDeleteRegion(region._id)}
                          >
                            <motion.button
                              className="bg-red-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-red-600"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              Xóa
                            </motion.button>
                          </Popconfirm>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Theaters Tab */}
          {activeTab === "theaters" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý Rạp & Phòng chiếu
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm rạp hoặc phòng chiếu..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={handleAddTheater}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Thêm rạp
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setSelectedRoom(undefined);
                      setPreSelectedTheater(null); // Không fill rạp nào
                      setShowRoomForm(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Thêm phòng
                  </motion.button>
                  <div>
                    <span>
                      Trang {currentPage} / {totalTheaterPages}
                    </span>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Trước
                    </button>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === totalTheaterPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Mã rạp</th>
                      <th className="p-3 text-left font-semibold text-black">Tên rạp</th>
                      <th className="p-3 text-left font-semibold text-black">Thành phố</th>
                      <th className="p-3 text-left font-semibold text-black">Địa chỉ</th>
                      <th className="p-3 text-left font-semibold text-black">Số phòng</th>
                      <th className="p-3 text-left font-semibold text-black">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTheaters.map((theater, idx) => {
                      const theaterRooms = rooms.filter(room => room.theater?._id === theater._id);
                      
                      return (
                        <tr key={theater._id} className="border-b hover:bg-gray-100">
                        <td className="p-3">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-black">{theater.theaterCode || 'N/A'}</span>
                        </td>
                        <td className="p-3 font-medium">{theater.name}</td>
                        <td className="p-3">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm">
                            {theater.location.city}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs truncate" title={theater.location.address}>
                          {theater.location.address}
                        </td>
                          <td className="p-3">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                              {theaterRooms.length} phòng
                            </span>
                          </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                              <motion.button
                                onClick={() => handleShowRooms(theater)}
                                className="bg-purple-500 text-white px-3 py-1 rounded text-sm hover:bg-purple-600 cursor-pointer"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Xem chi tiết
                              </motion.button>
                            <motion.button
                              onClick={() => handleEditTheater(theater)}
                                className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 cursor-pointer"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Sửa
                            </motion.button>
                            <Popconfirm
                              title="Xóa rạp"
                                description="Bạn có chắc chắn muốn xóa rạp này? Tất cả các phòng chiếu trong rạp này cũng sẽ bị xóa!"
                              onConfirm={() => handleDeleteTheater(theater._id!)}
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                            >
                              <motion.button
                                className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 cursor-pointer"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Xóa
                              </motion.button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vouchers Tab */}
          {activeTab === "vouchers" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý Khuyến mãi
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm khuyến mãi..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={handleAddVoucher}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Thêm khuyến mãi
                  </motion.button>
                  <div>
                    <span>
                      Trang {currentPage} / {totalVoucherPages}
                    </span>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Trước
                    </button>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === totalVoucherPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Accordion Voucher Table */}
              <div className="bg-white text-black rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-black">Danh sách Khuyến mãi</h3>
                </div>
                
                {/* Table Header - chỉ header voucher */}
                <div className="bg-gray-100 text-black">
                  <div className="grid grid-cols-7 gap-4 p-3 border-b border-gray-200">
                    <div className="font-semibold text-black">Mã KM</div>
                    <div className="font-semibold text-black">Tên</div>
                    <div className="font-semibold text-black">Mô tả</div>
                    <div className="font-semibold text-black">Ngày bắt đầu</div>
                    <div className="font-semibold text-black">Ngày kết thúc</div>
                    <div className="font-semibold text-black">Trạng thái</div>
                    <div className="font-semibold text-black">Hành động</div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {paginatedVouchers.map((voucher) => (
                    <div key={voucher._id}>
                      {/* Header Row - chỉ header fields */}
                      <div 
                        className="grid grid-cols-7 gap-4 p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (blockVoucherRowNavigate) return;
                          navigate(`/admin/vouchers/${voucher._id}`, { state: { tab: 'vouchers' } });
                        }}
                      >
                        <div className="text-black font-semibold">{voucher.promotionalCode}</div>
                        <div className="text-black">{voucher.name}</div>
                        <div className="text-black truncate" title={voucher.description || ''}>{voucher.description || ''}</div>
                        <div className="text-black">{(voucher.startDate || voucher.validityPeriod?.startDate) ? new Date((voucher.startDate || voucher.validityPeriod!.startDate) as any).toLocaleDateString("vi-VN") : 'N/A'}</div>
                        <div className="text-black">{(voucher.endDate || voucher.validityPeriod?.endDate) ? new Date((voucher.endDate || voucher.validityPeriod!.endDate) as any).toLocaleDateString("vi-VN") : 'N/A'}</div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${voucher.status === 'hoạt động' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {voucher.status || 'hoạt động'}
                          </span>
                        </div>
                        <div className="flex gap-2 justify-start" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                            {(() => {
                              // Kiểm tra xem ngày kết thúc có quá ngày hiện tại không
                              const endDate = voucher.endDate || voucher.validityPeriod?.endDate;
                              const isEndDatePassed = endDate ? dayjs(endDate as string).isBefore(dayjs(), 'day') : false;
                              
                              // Chỉ hiển thị nút nếu ngày kết thúc chưa qua
                              if (isEndDatePassed) {
                                return null;
                              }
                              
                              return (
                                <>
                                  <motion.button
                                    onClick={(e) => { e.stopPropagation(); handleEditVoucher(voucher); }}
                                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium cursor-pointer transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    Sửa
                                  </motion.button>
                                  {voucher.status !== 'hoạt động' && (
                                    <Popconfirm
                                      title="Xóa khuyến mãi"
                                      description="Bạn có chắc chắn muốn xóa khuyến mãi này? Tất cả chi tiết liên quan sẽ bị xóa."
                                      onConfirm={() => handleDeleteVoucher(voucher._id!)}
                                      okText="Có"
                                      cancelText="Không"
                                      onOpenChange={(open) => setBlockVoucherRowNavigate(open)}
                                      onCancel={() => setBlockVoucherRowNavigate(false)}
                                    >
                                      <motion.button
                                        onClick={(e) => e.stopPropagation()}
                                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium cursor-pointer transition-colors"
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                      >
                                        Xóa
                                      </motion.button>
                                    </Popconfirm>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                      </div>
                      {/* Inline detail panel when expanded via route-like UX */}
                      {selectedVoucherIdFromUrl === voucher._id && (
                        <div className="p-4">
                          <VoucherDetail id={voucher._id} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý Đơn vé
              </h2>
              {/* Thanh công cụ lọc & phân trang nằm ngoài bảng */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    value={orderSearch}
                    onChange={(e) => { setOrdersPage(1); setOrderSearch(e.target.value); }}
                    type="text"
                    placeholder="Tìm theo tên hoặc email..."
                    className="border border-gray-300 bg-white text-black rounded-lg p-2 w-64 focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <DatePicker.RangePicker
                    value={[filterFrom ? (dayjs as any)(filterFrom) : null, filterTo ? (dayjs as any)(filterTo) : null] as any}
                    onChange={(vals) => {
                      setOrdersPage(1);
                      const [start, end] = vals || [];
                      setFilterFrom(start ? (start as any).format('YYYY-MM-DD') : '');
                      setFilterTo(end ? (end as any).format('YYYY-MM-DD') : '');
                    }}
                    format="DD/MM/YYYY"
                  />
                  <button
                    className="px-3 py-1 bg-gray-100 text-black rounded hover:bg-gray-200 cursor-pointer"
                    onClick={() => { setOrderSearch(""); setFilterFrom(""); setFilterTo(""); setOrdersPage(1); }}
                  >
                    Xóa lọc
                  </button>
                </div>
                <div className="text-sm text-gray-700">
                  Trang {ordersPage} / {totalOrderPages}
                  <button
                    className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                    disabled={ordersPage === 1}
                    onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>
                  <button
                    className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                    disabled={ordersPage === totalOrderPages}
                    onClick={() => setOrdersPage((p) => Math.min(totalOrderPages, p + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6 text-black">
                <OrdersTable rows={paginatedOrders} />
              </div>
            </div>
          )}


          {/* Users Tab */}
          {activeTab === "users" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý Người dùng
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm người dùng..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={handleAddUser}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Thêm người dùng
                  </motion.button>
                  <div>
                    <span>
                      Trang {currentPage} / {totalUserPages}
                    </span>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Trước
                    </button>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === totalUserPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Avatar</th>
                      <th className="p-3 text-left font-semibold text-black">Họ tên</th>
                      <th className="p-3 text-left font-semibold text-black">Email</th>
                      <th className="p-3 text-left font-semibold text-black">SĐT</th>
                      <th className="p-3 text-left font-semibold text-black">Vai trò</th>
                      <th className="p-3 text-left font-semibold text-black">Trạng thái</th>
                      <th className="p-3 text-left font-semibold text-black">Điểm</th>
                      <th className="p-3 text-left font-semibold text-black">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user, idx) => (
                      <tr
                        key={user._id}
                        className="border-b hover:bg-gray-100"
                      >
                        <td className="p-3">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="p-3">
                          <img 
                            src={user.avatar} 
                            alt={user.fullName} 
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
                          />
                        </td>
                        <td className="p-3 font-medium">{user.fullName}</td>
                        <td className="p-3 text-sm text-gray-600">{user.email}</td>
                        <td className="p-3">{user.phoneNumber}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'ADMIN' ? '👑 Admin' : '👤 User'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Hoạt động' : 'Khóa'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                            🎯 {user.point}
                          </span>
                        </td>
                        <td className="p-3">
                          <motion.button
                            onClick={() => handleEditUser(user)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 cursor-pointer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Sửa
                          </motion.button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* Show Sessions Tab */}
          {activeTab === "showSessions" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý Ca chiếu
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm ca chiếu..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="flex items-center gap-4">
                  <motion.button
                    onClick={handleAddShowSession}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Thêm ca chiếu
                  </motion.button>
                  <div>
                    <span>
                      Trang {currentPage} / {totalShowSessionPages}
                    </span>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Trước
                    </button>
                    <button
                      className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                      disabled={currentPage === totalShowSessionPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Mã ca chiếu</th>
                      <th className="p-3 text-left font-semibold text-black">Tên ca chiếu</th>
                      <th className="p-3 text-left font-semibold text-black">Thời gian bắt đầu</th>
                      <th className="p-3 text-left font-semibold text-black">Thời gian kết thúc</th>
                      <th className="p-3 text-left font-semibold text-black">Thời lượng</th>
                      <th className="p-3 text-left font-semibold text-black">Ngày tạo</th>
                      <th className="p-3 text-left font-semibold text-black">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedShowSessions.map((session, idx) => {
                      // Calculate duration - handle overnight sessions
                      let duration;
                      if (session.endTime === '00:00') {
                        // Overnight session (e.g., 20:30 - 00:00)
                        const startTime = new Date(`2000-01-01 ${session.startTime}`);
                        const endTime = new Date(`2000-01-02 ${session.endTime}`);
                        duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes
                      } else {
                        // Normal session within same day
                        const startTime = new Date(`2000-01-01 ${session.startTime}`);
                        const endTime = new Date(`2000-01-01 ${session.endTime}`);
                        duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes
                      }
                      
                      return (
                        <tr
                          key={session._id}
                          className="border-b hover:bg-gray-100"
                        >
                          <td className="p-3">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-black">{session.shiftCode || 'N/A'}</span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-lg">{session.name}</span>
                          </td>
                          <td className="p-3">
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-semibold">
                              {session.startTime}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-semibold">
                              {session.endTime}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                              {Math.floor(duration / 60)}h {duration % 60}m
                            </span>
                          </td>
                          <td className="p-3">
                            {new Date(session.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <motion.button
                                onClick={() => handleEditShowSession(session)}
                                className="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600 cursor-pointer"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Sửa
                              </motion.button>
                              <Popconfirm
                                title="Xóa ca chiếu"
                                description="Bạn có chắc chắn muốn xóa ca chiếu này?"
                                onConfirm={() => handleDeleteShowSession(session._id)}
                                okText="Có"
                                cancelText="Không"
                                placement="topRight"
                                getPopupContainer={() => document.body}
                                overlayStyle={{ maxWidth: 'calc(100vw - 10px)', overflowWrap: 'break-word', wordBreak: 'break-word', marginLeft: 8 }}
                              >
                                <motion.button
                                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 cursor-pointer"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Xóa
                                </motion.button>
                              </Popconfirm>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Showtimes Tab */}
          {activeTab === "showtimes" && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý suất chiếu
              </h2>
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm suất chiếu..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <motion.button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShowtimeForm(true)}
                >
                  Thêm suất chiếu
                </motion.button>
                <div>
                  <span>
                    Trang {currentPage} / {totalShowtimePages}
                  </span>
                  <button
                    className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Trước
                  </button>
                  <button
                    className="ml-2 px-3 py-1 bg-gray-200 text-black rounded disabled:opacity-50 cursor-pointer"
                    disabled={currentPage === totalShowtimePages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Sau
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Phim</th>
                      <th className="p-3 text-left font-semibold text-black">Rạp</th>
                      <th className="p-3 text-left font-semibold text-black">Ngày chiếu đầu tiên</th>
                      <th className="p-3 text-left font-semibold text-black">Ngày chiếu cuối cùng</th>
                      <th className="p-3 text-left font-semibold text-black">Số suất chiếu</th>
                      <th className="p-3 text-left font-semibold text-black">Chi tiết suất chiếu</th>
                      <th className="p-3 text-left font-semibold text-black">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedShowtimes.map((showtime, idx) => {
                      // Kiểm tra dữ liệu hợp lệ trước khi render
                      if (!showtime || !showtime._id) {
                        return null;
                      }
                      
                      return (
                      <tr
                        key={showtime._id}
                        className="border-b hover:bg-gray-100"
                      >
                        <td className="p-3">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="p-3">{showtime.movieId?.title || 'N/A'}</td>
                        <td className="p-3">{showtime.theaterId?.name || 'N/A'}</td>
                        <td className="p-3">
                          {showtime.showTimes.length > 0 ? 
                            (() => {
                              // Tìm ngày sớm nhất trong tất cả suất chiếu
                              const dates = showtime.showTimes.map(st => new Date(st.date));
                              const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
                              return earliestDate.toLocaleDateString("vi-VN");
                            })() : 
                            'N/A'
                          }
                        </td>
                        <td className="p-3">
                          {showtime.showTimes.length > 0 ? 
                            (() => {
                              // Tìm ngày trễ nhất trong tất cả suất chiếu
                              const dates = showtime.showTimes.map(st => new Date(st.date));
                              const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
                              return latestDate.toLocaleDateString("vi-VN");
                            })() : 
                            'N/A'
                          }
                        </td>
                        <td className="p-3">{showtime.showTimes.length}</td>
                        <td className="p-3">
                          <motion.button
                            onClick={() => handleShowtimeDetail(showtime)}
                            className="text-indigo-600 hover:text-indigo-900 mr-4 cursor-pointer"
                          >
                            Xem chi tiết
                          </motion.button>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1 items-center">
                            <motion.button
                              onClick={() => handleEditShowtime(showtime)}
                              className="bg-yellow-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-yellow-600 mr-2"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              Sửa
                            </motion.button>
                            {(() => {
                              const isOccupied = showtimeOccupiedStatus[showtime._id];
                              const hasStatus = showtime._id in showtimeOccupiedStatus;
                              console.log(`Rendering showtime ${showtime._id}, occupied:`, isOccupied, 'hasStatus:', hasStatus, 'all status:', showtimeOccupiedStatus);
                              return isOccupied ? (
                                <motion.button
                                  className="bg-gray-400 text-white px-3 py-1 rounded cursor-not-allowed"
                                  disabled
                                  title="Suất chiếu này đã có ghế được đặt nên không thể xóa"
                                >
                                  Xóa
                                </motion.button>
                              ) : (
                              <Popconfirm
                                title="Xóa suất chiếu"
                                description="Bạn có chắc chắn muốn xóa suất chiếu này? (Xóa suất chiếu sẽ xóa tất cả các suất chiếu của phim trong rạp)"
                                okText="Xóa"
                                cancelText="Hủy"
                                onConfirm={() => handleDeleteShowtime(showtime._id)}
                              >
                                <motion.button
                                  className="bg-red-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-red-600"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  Xóa
                                </motion.button>
                              </Popconfirm>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Price Lists Tab */}
          {activeTab === "priceLists" && (
            <div>
              {!showPriceListDetailInline && (
              <h2 className="text-2xl font-semibold mb-6 text-black select-none">
                Quản lý bảng giá
              </h2>
              )}
              {showPriceListDetailInline && viewingPriceList ? (
                <div className="bg-white rounded-lg shadow p-4 mb-4">
                  <div className="mb-3">
                    <Button onClick={() => setShowPriceListDetailInline(false)} className="bg-white">← Quay lại danh sách</Button>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                    <h3 className="text-xl text-left font-semibold text-gray-800 mb-4">Thông tin cơ bản</h3>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-1.5">
                        <div>
                          <span className="font-medium text-gray-600">Mã bảng giá:</span>
                          <p className="text-gray-800 inline-block ml-2">
                            {viewingPriceList.code || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Tên bảng giá:</span>
                          <p className="text-gray-800 px-2 py-1 rounded inline-block ml-2">{viewingPriceList.name}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="font-medium text-gray-600 mr-2">Trạng thái:</span>
                          <Tag className="ml-2" color={viewingPriceList.status === 'active' ? 'green' : viewingPriceList.status === 'scheduled' ? 'blue' : 'red'}>
                            {viewingPriceList.status === 'active' ? 'Đang hoạt động' : viewingPriceList.status === 'scheduled' ? 'Chờ hiệu lực' : 'Đã hết hạn'}
                          </Tag>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Mô tả:</span>
                          <p className="text-gray-800 px-2 py-1 rounded inline-block ml-2">{viewingPriceList.description || 'Chưa có mô tả'}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="font-medium text-gray-600">Ngày bắt đầu:</span>
                          <p className="text-gray-800 px-2 py-1 rounded inline-block ml-2">{new Date(viewingPriceList.startDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Ngày kết thúc:</span>
                          <p className="text-gray-800 px-2 py-1 rounded inline-block ml-2">{new Date(viewingPriceList.endDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Nội dung chi tiết */}
                  <div className="space-y-4">
                    <div className="rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg text-left w-full font-semibold text-gray-800">Danh sách giá</h3>
                        {viewingPriceList.status === 'scheduled' && (
                          <div className="flex gap-2">
                            {(!viewingPriceList.lines || viewingPriceList.lines.length === 0) && (
                              <Button type="primary" onClick={() => {
                                // Mở modal để thêm danh sách giá với 1 dòng trống sẵn
                                setEditingPriceLines([{
                                  type: '',
                                  productName: '',
                                  productId: '',
                                  price: 0
                                }]);
                                setEditPriceLinesModalVisible(true);
                              }}>Thêm danh sách giá</Button>
                            )}
                            {(viewingPriceList.lines && viewingPriceList.lines.length > 0) && (
                              <Button 
                                type="primary" 
                                style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                                onClick={() => {
                                  setEditingPriceLines(viewingPriceList.lines || []);
                                  setEditPriceLinesModalVisible(true);
                                }}
                              >
                                Sửa
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-200">
                              <th className="border border-gray-300 p-2 text-left">Loại</th>
                              <th className="border border-gray-300 p-2 text-left">Sản phẩm / Loại ghế</th>
                              <th className="border border-gray-300 p-2 text-left">Giá</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingPriceList.lines.map((line, index) => (
                              <tr key={index} className="hover:bg-gray-100">
                                <td className="border border-gray-300 p-2">
                                  <Tag color={line.type === 'ticket' ? 'blue' : line.type === 'combo' ? 'green' : 'orange'}>
                                    {line.type === 'ticket' ? 'Vé xem phim' : line.type === 'combo' ? 'Combo' : 'Sản phẩm'}
                                  </Tag>
                                </td>
                                <td className="border border-gray-300 p-2">
                                  {line.type === 'ticket' ? (
                                    <span className="font-medium">
                                      {line.seatType === 'normal' ? 'Ghế thường' : line.seatType === 'vip' ? 'Ghế VIP' : line.seatType === 'couple' ? 'Ghế cặp đôi' : 'Ghế 4DX'}
                                    </span>
                                  ) : (
                                    <span className="font-medium">{line.productName}</span>
                                  )}
                                </td>
                                <td className="border border-gray-300 p-2">
                                  <span className="font-semibold text-green-600">{line.price.toLocaleString('vi-VN')} VNĐ</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <>
              
              {/* Time Gap Warning */}
              {timeGapWarning && (
                <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
                  <div className="flex items-start">
                    <div className="text-yellow-600 mr-2 mt-1">⚠️</div>
                    <div className="text-yellow-800">
                      <div className="font-bold mb-2">Cảnh báo: {timeGapWarning}</div>
                      {timeGaps.length > 0 && (
                        <div className="ml-4">
                          <ul className="list-disc list-inside space-y-2">
                            {timeGaps.map((gap, index) => (
                              <li key={index} className="text-sm bg-yellow-50 p-2 rounded border-l-4 border-yellow-300">
                                {gap}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-3 text-xs text-yellow-600 italic">
                            💡 Gợi ý: Tạo bảng giá mới hoặc điều chỉnh thời gian của các bảng giá hiện có để lấp đầy các khoảng trống này.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên hoặc mã bảng giá..."
                  className="border border-gray-300 bg-white text-black rounded-lg p-2 w-1/3 focus:outline-none focus:ring-2 focus:ring-black"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 cursor-pointer"
                  onClick={() => {
                    setEditingPriceList(null);
                    setPriceListFormVisible(true);
                  }}
                >
                  Thêm bảng giá
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-black border-b border-gray-200">
                    <tr>
                      <th className="p-3 text-left font-semibold text-black">STT</th>
                      <th className="p-3 text-left font-semibold text-black">Mã bảng giá</th>
                      <th className="p-3 text-left font-semibold text-black">Tên bảng giá</th>
                      <th className="p-3 text-left font-semibold text-black">Mô tả</th>
                      <th className="p-3 text-left font-semibold text-black">Ngày bắt đầu</th>
                      <th className="p-3 text-left font-semibold text-black">Ngày kết thúc</th>
                      <th className="p-3 text-left font-semibold text-black">Trạng thái</th>
                      <th className="p-3 text-left font-semibold text-black">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceLists
                      .sort((a, b) => {
                        // Thứ tự: Đang hoạt động → Chờ hiệu lực → Đã hết hạn
                        const rank = (s: string) => (s === 'active' ? 0 : s === 'scheduled' ? 1 : 2);
                        const ra = rank(a.status as string);
                        const rb = rank(b.status as string);
                        if (ra !== rb) return ra - rb;
                        // Cùng nhóm: mới hơn đứng trước (ưu tiên startDate, fallback createdAt)
                        const aTime = new Date(a.startDate || a.createdAt || a._id).getTime();
                        const bTime = new Date(b.startDate || b.createdAt || b._id).getTime();
                        return bTime - aTime;
                      })
                      .filter((priceList) =>
                        priceList.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (priceList.code && priceList.code.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map((priceList, idx) => (
                        <tr
                          key={priceList._id}
                          className="border-b hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleViewPriceList(priceList)}
                        >
                          <td className="p-3">{idx + 1}</td>
                          <td className="p-3 font-medium">
                            {priceList.code}
                          </td>
                          <td className="p-3 font-medium">{priceList.name}</td>
                          <td className="p-3 max-w-xs truncate" title={priceList.description || 'Chưa có mô tả'}>
                            {priceList.description || 'Chưa có mô tả'}
                          </td>
                          <td className="p-3">
                            {new Date(priceList.startDate).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="p-3">
                            {new Date(priceList.endDate).toLocaleDateString("vi-VN")}
                          </td>
                          <td className="p-3">
                            <Tag
                              color={
                                priceList.status === "active"
                                  ? "green"
                                  : priceList.status === "scheduled"
                                  ? "blue"
                                  : "red"
                              }
                            >
                              {priceList.status === "active"
                                ? "Đang hoạt động"
                                : priceList.status === "scheduled"
                                ? "Chờ hiệu lực"
                                : "Đã hết hạn"}
                            </Tag>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              {priceList.status === "active" && (
                              <button
                                  onClick={() => {
                                    setEditingEndDatePriceList(priceList);
                                    setNewEndDateValue(dayjs(priceList.endDate).format('YYYY-MM-DD'));
                                    setEditEndDateModalVisible(true);
                                  }}
                                  className="bg-yellow-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-yellow-600 mr-2"
                                >
                                  Sửa
                              </button>
                              )}  
                              {priceList.status === "active" && (
                                <button
                                  onClick={() => {
                                    setEditingPriceList(priceList);
                                    setSplitVersionData({
                                        newName: `${priceList.name} - Bản sao`,
                                        newCode: '',
                                        newDescription: priceList.description || '',
                                        startDate: '',
                                        endDate: ''
                                    });
                                    setSplitVersionModalVisible(true);
                                  }}
                                  className="bg-purple-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-purple-600 mr-2"
                                >
                                  Sao chép
                                </button>
                              )}
                              {priceList.status === "scheduled" && (
                                <button
                                  onClick={() => {
                                    setEditingPriceList(priceList);
                                    setPriceListFormVisible(true);
                                  }}
                                  className="bg-yellow-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-yellow-600 mr-2"
                                >
                                  Sửa
                                </button>
                              )}
                              {priceList.status === "scheduled" && (
                                <button
                                  onClick={() => {
                                    setEditingPriceList(priceList);
                                    setSplitVersionData({
                                      newName: `${priceList.name} - Bản sao`,
                                      newCode: '',
                                      newDescription: priceList.description || '',
                                      startDate: '',
                                      endDate: ''
                                    });
                                    setSplitVersionModalVisible(true);
                                  }}
                                  className="bg-purple-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-purple-600 mr-2"
                                >
                                  Sao chép
                                </button>
                              )}
                              {priceList.status === "scheduled" && (
                                <Popconfirm
                                  title="Xóa bảng giá"
                                  description="Bạn có chắc chắn muốn xóa bảng giá này?"
                                  onConfirm={() => handleDeletePriceList(priceList._id)}
                                  okText="Xóa"
                                  cancelText="Hủy"
                                  okButtonProps={{ danger: true }}
                                >
                                  <button
                                    className="bg-red-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-red-600"
                                  >
                                    Xóa
                                  </button>
                                </Popconfirm>
                              )}
                              {priceList.status === "expired" && (
                                <button
                                  onClick={() => {
                                    setEditingPriceList(priceList);
                                    setSplitVersionData({
                                      newName: `${priceList.name} - Bản sao`,
                                      newCode: '',
                                      newDescription: priceList.description || '',
                                      startDate: '',
                                      endDate: ''
                                    });
                                    setSplitVersionModalVisible(true);
                                  }}
                                  className="bg-purple-500 text-white px-3 py-1 rounded cursor-pointer hover:bg-purple-600"
                                >
                                  Sao chép
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Movie Form Modal */}
      {showMovieForm && (
        <MovieForm
          movie={selectedMovie}
          movies={movies}
          onSubmit={selectedMovie ? handleUpdateMovie : handleAddMovie}
          onCancel={() => {
            setShowMovieForm(false);
            setSelectedMovie(undefined);
          }}
        />
      )}

      {/* Food Combo Form Modal */}
      {showFoodComboForm && (
        <FoodComboForm
          combo={selectedFoodCombo}
          onSubmit={handleFoodComboSubmit}
          onCancel={() => {
            setShowFoodComboForm(false);
            setSelectedFoodCombo(undefined);
          }}
        />
      )}

      {/* Voucher Form Modal */}
      {showVoucherForm && (
        <VoucherForm
          voucher={selectedVoucher}
          onSubmit={handleVoucherSubmit}
          onCancel={() => {
            setShowVoucherForm(false);
            setSelectedVoucher(undefined);
          }}
        />
      )}

      {/* Showtime Detail Modal */}
      {showTimeForm && selectedShowtime && (
        <Modal
          open={showTimeForm}
          title={
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-800">
                Chi tiết suất chiếu
              </h3>
            </div>
          }
          onCancel={() => {
            setShowTimeForm(false);
            setSelectedShowtime(null);
          }}
          footer={null}
          width={900}
          centered
          style={{ 
            marginTop: '2vh',
            marginBottom: '2vh',
            maxHeight: '96vh'
          }}
          bodyStyle={{
            maxHeight: 'calc(96vh - 110px)',
            overflowY: 'auto',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE và Edge
          }}
          className="hide-scrollbar"
          destroyOnClose
        >
          <div className="space-y-6">
            {/* Thông tin cơ bản */}
            <Descriptions
              bordered
              column={2}
              size="middle"
              labelStyle={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}
            >
              <Descriptions.Item label="🎬 Phim" span={2}>
                <span className="text-lg font-medium text-blue-600">
                  {selectedShowtime.movieId?.title || 'N/A'}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="🏢 Rạp chiếu">
                <Tag color="blue" className="text-sm">
                  {selectedShowtime.theaterId?.name || 'N/A'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="📅 Khoảng thời gian">
                <Space direction="vertical" size="small">
                  {selectedShowtime.showTimes.length > 0 && (
                    <>
                      <span>
                        <Tag color="green">
                          Từ: {(() => {
                            // Tìm ngày sớm nhất trong tất cả suất chiếu
                            const dates = selectedShowtime.showTimes.map(st => new Date(st.date));
                            const earliestDate = new Date(Math.min(...dates.map(d => d.getTime())));
                            return earliestDate.toLocaleDateString("vi-VN");
                          })()}
                        </Tag>
                      </span>
                      <span>
                        <Tag color="orange">
                          Đến: {(() => {
                            // Tìm ngày trễ nhất trong tất cả suất chiếu
                            const dates = selectedShowtime.showTimes.map(st => new Date(st.date));
                            const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
                            return latestDate.toLocaleDateString("vi-VN");
                          })()}
                        </Tag>
                      </span>
                    </>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="🎪 Tổng số suất chiếu">
                <Tag color="purple" className="text-base font-semibold">
                  {selectedShowtime.showTimes.length} suất
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* Danh sách suất chiếu */}
            <div className="mt-5">
              <h4 className="text-lg font-semibold mb-3 text-gray-700">
                📋 Danh sách suất chiếu chi tiết
              </h4>
              <Table
                dataSource={selectedShowtime.showTimes.map((time: any, index: number) => {
                  const roomVal = time.room;
                  console.log('Room data:', roomVal, typeof roomVal);
                  
                  // Tìm room trong danh sách rooms đã load bằng _id
                  const roomInfo = rooms.find(r => r._id === roomVal._id);
                  console.log('Found room info:', roomInfo);
                  
                  const roomDisplay = roomInfo?.name || roomVal?.name || 'N/A';
                  const roomType = roomInfo?.roomType || '';
                  console.log('Room type:', roomType);
                  
                  const seatsArr = Array.isArray(time.seats) ? time.seats : [];
                  return {
                    key: index,
                    index: index + 1,
                    date: time.date,
                    start: time.start,
                    end: time.end,
                    session: time.showSessionId,
                    room: roomDisplay,
                    roomType: roomType,
                    availableSeats: seatsArr.filter((s: any) => s.status === 'available').length,
                    totalSeats: seatsArr.length,
                    seats: seatsArr,
                    status: time.status || 'active', // Mặc định active nếu chưa có
                    showtimeId: selectedShowtime._id,
                    roomId: time.room
                  };
                })}
                columns={[
                  {
                    title: 'STT',
                    dataIndex: 'index',
                    key: 'index',
                    width: 60,
                    align: 'center',
                    render: (text) => <span className="font-medium">{text}</span>
                  },
                  {
                    title: '📅 Ngày chiếu',
                    dataIndex: 'date',
                    key: 'date',
                    render: (date) => (
                      <Tag color="blue" className="text-sm">
                        {new Date(date).toLocaleDateString("vi-VN")}
                      </Tag>
                    )
                  },
                  {
                    title: '⏰ Thời gian',
                    key: 'time',
                    render: (_, record) => (
                      <Space direction="vertical" size="small">
                        <Tag color="green">
                          Bắt đầu: {new Date(record.start).toLocaleTimeString("vi-VN", { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Tag>
                        <Tag color="orange">
                          Kết thúc: {new Date(record.end).toLocaleTimeString("vi-VN", { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Tag>
                      </Space>
                    )
                  },
                  {
                    title: '🕒 Ca chiếu',
                    key: 'session',
                    render: (_, record) => {
                      const s = record.session;
                      const name = typeof s === 'object' ? (s?.name || '') : '';
                      const start = typeof s === 'object' ? s?.startTime : '';
                      const end = typeof s === 'object' ? s?.endTime : '';
                      return (
                        <Space direction="vertical" size="small">
                          <Tag color="geekblue" className="font-medium">{name || 'N/A'}</Tag>
                          {(start && end) && (
                            <div className="text-xs text-gray-600">{start} - {end}</div>
                          )}
                        </Space>
                      );
                    }
                  },
                  {
                    title: '🏠 Phòng chiếu',
                    dataIndex: 'room',
                    key: 'room',
                      render: (room: string, record: any) => (
                        <Space direction="vertical" size="small">
                      <Tag color="purple" className="font-medium">
                        {room}
                      </Tag>
                          {record.roomType && (
                            <div className="text-xs text-gray-600 text-center">
                              {record.roomType}
                            </div>
                          )}
                        </Space>
                    )
                  },
                  {
                    title: '💺 Tình trạng ghế',
                    key: 'seats',
                    render: (_, record) => {
                      const availableRatio = (record.availableSeats / record.totalSeats) * 100;
                      const color = availableRatio > 70 ? 'green' : availableRatio > 30 ? 'orange' : 'red';
                      
                      return (
                        <Space direction="vertical" size="small">
                          <Tag color={color} className="font-medium">
                            Trống: {record.availableSeats}/{record.totalSeats}
                          </Tag>
                          <div className="text-xs text-gray-500">
                            {Math.round(availableRatio)}% còn trống
                          </div>
                        </Space>
                      );
                    }
                  },
                  {
                    title: '🔄 Trạng thái',
                    key: 'status',
                    render: (_, record) => {
                      const isActive = record.status === 'active';
                      const statusColor = isActive ? 'green' : 'red';
                      const statusText = isActive ? 'Hoạt động' : 'Không hoạt động';
                      
                      return (
                        <Tag color={statusColor} className="font-medium">
                          {statusText}
                        </Tag>
                      );
                    }
                  }
                ]}
                pagination={{
                  pageSize: 5,
                  showSizeChanger: false,
                  showQuickJumper: true,
                  showTotal: (total, range) => 
                    `${range[0]}-${range[1]} của ${total} suất chiếu`
                }}
                size="middle"
                scroll={{ x: 800 }}
                className="border rounded-lg"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Showtime Form Modal */}
      {showShowtimeForm && (
        <ShowtimeForm
          onCancel={() => {
            setShowShowtimeForm(false);
            setEditingShowtime(null);
          }}
          onSuccess={() => {
            setShowShowtimeForm(false);
            setEditingShowtime(null);
            // Refresh showtimes data
            getAllShowtimesForAdmin()
              .then(async (data) => {
                const showtimesData = data && Array.isArray(data) ? data : [];
                setShowtimes(showtimesData);
                
                // Load occupied status for each showtime
                const occupiedStatuses: Record<string, boolean> = {};
                for (const showtime of showtimesData) {
                  try {
                    const result = await checkShowtimeOccupiedSeats(showtime._id);
                    console.log(`Showtime ${showtime._id} occupied check (refresh):`, result);
                    occupiedStatuses[showtime._id] = result.hasOccupiedSeats;
                  } catch {
                    occupiedStatuses[showtime._id] = false;
                  }
                }
                console.log('Final occupiedStatuses (refresh):', occupiedStatuses);
                setShowtimeOccupiedStatus(occupiedStatuses);
              })
              .catch(() => {
                setShowtimes([]);
              });
          }}
          editData={editingShowtime || undefined}
        />
      )}

      {/* Region Form Modal */}
      {showRegionForm && (
        <RegionForm
          region={selectedRegion}
          regions={regions}
          onSubmit={handleRegionSubmit}
          onCancel={() => {
            setShowRegionForm(false);
            setSelectedRegion(undefined);
          }}
        />
      )}

      {/* Theater Form Modal */}
      {showTheaterForm && (
        <TheaterForm
          theater={selectedTheater}
          theaters={theaters}
          onSubmit={handleTheaterSubmit}
          onCancel={() => {
            setShowTheaterForm(false);
            setSelectedTheater(undefined);
            setTheaterLoading(false);
          }}
          loading={theaterLoading}
        />
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={selectedUser}
          onSubmit={handleUserSubmit}
          onCancel={() => {
            setShowUserForm(false);
            setSelectedUser(undefined);
          }}
        />
      )}

      {/* Room Form Modal */}
      {showRoomForm && (
        <RoomForm
          room={selectedRoom}
          rooms={rooms}
          theaters={theaters.map(t => ({ _id: t._id, name: t.name, address: t.location?.address || '', location: { city: t.location?.city || '' }, regionId: t.regionId }))}
          regions={regions}
          preSelectedTheater={preSelectedTheater ? {
            _id: preSelectedTheater._id,
            name: preSelectedTheater.name,
            address: preSelectedTheater.location?.address || '',
            location: { city: preSelectedTheater.location?.city || '' },
            regionId: preSelectedTheater.regionId
          } : null}
          onSubmit={handleRoomSubmit}
          loading={isRoomSubmitting}
          onCancel={() => {
            setShowRoomForm(false);
            setSelectedRoom(undefined);
            setPreSelectedTheater(null);
          }}
        />
      )}

      {/* Rooms Modal */}
      {showRoomModal && selectedTheaterForRooms && (
        <Modal
          title={
            <div>
              <div className="text-center text-lg mb-3">
                <span>Phòng chiếu của rạp {selectedTheaterForRooms.name}</span>
              </div>
              <div className="flex justify-end">
                <motion.button
                  onClick={() => {
                    setShowRoomModal(false);
                    setSelectedTheaterForRooms(null);
                    setSelectedRoom(undefined);
                    setPreSelectedTheater(selectedTheaterForRooms); // Fill sẵn rạp hiện tại
                    setShowRoomForm(true);
                  }}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 cursor-pointer text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Thêm phòng
                </motion.button>
              </div>
            </div>
          }
          open={showRoomModal}
          onCancel={() => {
            setShowRoomModal(false);
            setSelectedTheaterForRooms(null);
          }}
          footer={null}
          width={1000}
          centered
        >
          <div className="max-h-96 overflow-y-auto">
            {(() => {
              const theaterRooms = rooms.filter(room => room.theater?._id === selectedTheaterForRooms._id);
              
              if (theaterRooms.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    <p>Rạp này chưa có phòng chiếu nào.</p>
                    <p className="text-sm mt-2">Sử dụng nút "Thêm phòng mới" ở trên để thêm phòng đầu tiên.</p>
                  </div>
                );
              }
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {theaterRooms.map((room) => (
                    <div key={room._id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                        <h5 className="font-semibold text-gray-800 text-lg">{room.name}</h5>
                          <p className="text-sm text-gray-600 font-medium">{room.roomCode || 'N/A'}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          room.roomType === '2D' ? 'bg-blue-100 text-blue-800' :
                          room.roomType === '4DX' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {room.roomType}
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Sức chứa:</span>
                          <span className="font-medium">{room.capacity} ghế</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Số ghế:</span>
                          <span className="font-medium">{room.seats?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Trạng thái:</span>
                          <span className={`font-medium ${
                            room.status === 'active' ? 'text-green-600' :
                            room.status === 'maintenance' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {room.status === 'active' ? 'Hoạt động' : 
                             room.status === 'maintenance' ? 'Bảo trì' : 'Không hoạt động'}
                          </span>
                        </div>
                        {room.description && (
                          <div className="mt-2">
                            <span className="text-gray-600 text-sm">Mô tả:</span>
                            <p className="text-sm text-gray-700 mt-1">{room.description}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => {
                            setShowRoomModal(false);
                            setSelectedTheaterForRooms(null);
                            handleEditRoom(room);
                          }}
                          className="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 cursor-pointer"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Sửa
                        </motion.button>
                        <Popconfirm
                          title="Xác nhận xóa"
                          description="Bạn có chắc chắn muốn xóa phòng chiếu này không?"
                          onConfirm={() => {
                            handleDeleteRoom(room._id);
                            setShowRoomModal(false);
                            setSelectedTheaterForRooms(null);
                          }}
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                        >
                          <motion.button
                            className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 cursor-pointer"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Xóa
                          </motion.button>
                        </Popconfirm>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* Seat Form Modal */}
      {showSeatForm && (
        <SeatForm
          seat={selectedSeat}
          rooms={rooms}
          regions={regions}
          onSubmit={handleSeatSubmit}
          onCancel={() => {
            setShowSeatForm(false);
            setSelectedSeat(undefined);
          }}
        />
      )}

      {/* Show Session Form Modal */}
      {showShowSessionForm && (
        <ShowSessionForm
          showSession={selectedShowSession}
          showSessions={showSessions}
          loading={showSessionSubmitting}
          onSubmit={handleShowSessionSubmit}
          onCancel={() => {
            setShowShowSessionForm(false);
            setSelectedShowSession(undefined);
          }}
        />
      )}

      {/* Price List Form Modal */}
      {priceListFormVisible && (
        <PriceListForm
          priceList={editingPriceList || undefined}
          loading={priceListSubmitting}
          onSubmit={handlePriceListSubmit}
          onCancel={() => {
            setPriceListFormVisible(false);
            setEditingPriceList(null);
          }}
        />
      )}

      {/* Price List Detail Modal */}
      {priceListDetailVisible && viewingPriceList && (
        <Modal
          title={
            <div style={{ textAlign: 'center', fontSize: '18px' }}>
              Chi tiết bảng giá
            </div>
          }
          open={true}
          onCancel={() => {
            setPriceListDetailVisible(false);
            setViewingPriceList(null);
          }}
          footer={null}
          width={900}
          centered
          bodyStyle={{ 
            maxHeight: '70vh', 
            overflowY: 'auto',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}
          className="hide-scrollbar"
        >
          <div className="space-y-4">
            {/* Thông tin cơ bản */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 text-left">Thông tin cơ bản</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-600">Tên bảng giá:</span>
                  <p className="text-gray-800">{viewingPriceList.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Trạng thái:</span>
                  <div className="mt-1">
                    <Tag color={
                      viewingPriceList.status === 'active' ? 'green' :
                      viewingPriceList.status === 'scheduled' ? 'blue' : 'red'
                    }>
                      {viewingPriceList.status === 'active' ? 'Đang hoạt động' :
                       viewingPriceList.status === 'scheduled' ? 'Chờ hiệu lực' : 'Đã hết hạn'}
                    </Tag>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Ngày bắt đầu:</span>
                  <p className="text-gray-800">{new Date(viewingPriceList.startDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Ngày kết thúc:</span>
                  <p className="text-gray-800">{new Date(viewingPriceList.endDate).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            </div>

            {/* Danh sách giá */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 text-left">Danh sách giá</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 p-2 text-left">Loại</th>
                      <th className="border border-gray-300 p-2 text-left">Sản phẩm / Loại ghế</th>
                      <th className="border border-gray-300 p-2 text-left">Giá (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingPriceList.lines.map((line, index) => (
                      <tr key={index} className="hover:bg-gray-100">
                        <td className="border border-gray-300 p-2">
                          <Tag color={
                            line.type === 'ticket' ? 'blue' :
                            line.type === 'combo' ? 'green' : 'orange'
                          }>
                            {line.type === 'ticket' ? 'Vé xem phim' :
                             line.type === 'combo' ? 'Combo' : 'Sản phẩm'}
                          </Tag>
                        </td>
                        <td className="border border-gray-300 p-2">
                          {line.type === 'ticket' ? (
                            <span className="font-medium">
                              {line.seatType === 'normal' ? 'Ghế thường' :
                               line.seatType === 'vip' ? 'Ghế VIP' :
                               line.seatType === 'couple' ? 'Ghế cặp đôi' : 'Ghế 4DX'}
                            </span>
                          ) : (
                            <span className="font-medium">{line.productName}</span>
                          )}
                        </td>
                        <td className="border border-gray-300 p-2">
                          <span className="font-semibold text-green-600">
                            {line.price.toLocaleString('vi-VN')} VNĐ
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit End Date Modal */}
      {editEndDateModalVisible && editingEndDatePriceList && (
        <Modal
          title={<div style={{ textAlign: 'center', fontSize: '18px' }}>Sửa bảng giá</div>}
          open
          onCancel={() => {
            setEditEndDateModalVisible(false);
            setEditingEndDatePriceList(null);
            setNewEndDateValue('');
          }}
          footer={null}
          centered
        >
          <ConfigProvider locale={viVN}>
            <Form layout="vertical" onFinish={async () => {
              if (!newEndDateValue) {
                message.error('Vui lòng chọn ngày kết thúc mới');
                return;
              }

              // Validate: endDate >= today và > startDate
              const today = dayjs().startOf('day');
              const start = dayjs(editingEndDatePriceList.startDate).startOf('day');
              const end = dayjs(newEndDateValue).startOf('day');
              if (end.isBefore(today)) {
                message.error(`Ngày kết thúc phải từ hôm nay trở đi`);
                return;
              }
              if (!end.isAfter(start)) {
                message.error('Ngày kết thúc phải sau ngày bắt đầu');
                return;
              }

              try {
                setEditEndDateSubmitting(true);
                await updatePriceList(editingEndDatePriceList._id, { endDate: end.format('YYYY-MM-DD') });
                toast.success('Cập nhật ngày kết thúc thành công!');
                await loadPriceLists();
                setEditEndDateModalVisible(false);
                setEditingEndDatePriceList(null);
                setNewEndDateValue('');
              } catch (e: any) {
                console.error('Error updating end date', e);
                toast.error(e?.message || 'Cập nhật ngày kết thúc thất bại!');
              } finally {
                setEditEndDateSubmitting(false);
              }
            }}>
              <Form.Item label="Mã bảng giá">
                <Input value={editingEndDatePriceList.code || 'N/A'} disabled />
              </Form.Item>
              <Form.Item label="Tên bảng giá">
                <Input value={editingEndDatePriceList.name} disabled />
              </Form.Item>
              <Form.Item label="Ngày bắt đầu">
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={dayjs(editingEndDatePriceList.startDate)}
                  disabled
                />
              </Form.Item>
              <Form.Item label="Ngày kết thúc mới" required>
                <DatePicker
                  className="w-full"
                  format="DD/MM/YYYY"
                  value={newEndDateValue ? dayjs(newEndDateValue) : null}
                  onChange={(d) => setNewEndDateValue(d ? d.format('YYYY-MM-DD') : '')}
                  disabledDate={(current) => {
                    if (!current) return false;
                    const todayStart = dayjs().startOf('day');
                    const startFixed = dayjs(editingEndDatePriceList.startDate).startOf('day');
                    const cur = current.startOf('day');

                    // Không cho chọn quá khứ hoặc trước ngày bắt đầu
                    if (cur.isBefore(todayStart) || cur.isBefore(startFixed)) return true;

                    // Chặn ngày gây trùng khoảng với các bảng giá khác: [startFixed, cur] overlaps [s,e]
                    const hasOverlap = priceLists.some((pl) => {
                      if (pl._id === editingEndDatePriceList._id) return false; // bỏ qua bản đang sửa
                      const s = dayjs(pl.startDate).startOf('day');
                      const e = dayjs(pl.endDate).endOf('day');
                      return startFixed.isSameOrBefore(e) && cur.isSameOrAfter(s);
                    });
                    return hasOverlap;
                  }}
                />
              </Form.Item>
              <div className="flex justify-end gap-2">
                <Button onClick={() => {
                  setEditEndDateModalVisible(false);
                  setEditingEndDatePriceList(null);
                  setNewEndDateValue('');
                }}>Hủy</Button>
                <Button type="primary" htmlType="submit" loading={editEndDateSubmitting}>Lưu</Button>
                    </div>
            </Form>
          </ConfigProvider>
        </Modal>
      )}


      {/* Modal Sao chép */}
      {splitVersionModalVisible && editingPriceList && (
        <Modal
          title={
            <div style={{ textAlign: 'center', fontSize: '18px' }}>
              Sao chép
            </div>
          }
          open={true}
          onCancel={() => {
            setSplitVersionModalVisible(false);
            setEditingPriceList(null);
            setSplitVersionData({ newName: '', newCode: '', newDescription: '', startDate: '', endDate: '' });
            setSplitVersionSubmitting(false);
          }}
          footer={null}
          width={900}
          centered
          bodyStyle={{ 
            maxHeight: '70vh', 
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="hide-scrollbar"
        >
          <div className="space-y-6">
            {/* Thông tin bảng giá hiện tại */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Bảng giá nguồn (bản gốc)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="font-medium text-gray-600">Mã bảng giá:</span>
                  <p className="text-gray-800 font-mono px-2 py-1 rounded inline-block">
                    {editingPriceList.code || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Tên:</span>
                  <p className="text-gray-800 px-2 py-1 rounded inline-block">{editingPriceList.name}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 mr-2">Trạng thái:</span>
                  <Tag color="green">Đang hoạt động</Tag>
                </div>
                <div>
                <span className="font-medium text-gray-600">Mô tả:</span>
                  <p className="text-gray-800 px-2 py-1 rounded inline-block">{editingPriceList.description || 'Chưa có mô tả'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Ngày bắt đầu:</span>
                  <p className="text-gray-800 px-2 py-1 rounded inline-block">{new Date(editingPriceList.startDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Ngày kết thúc:</span>
                  <p className="text-gray-800 px-2 py-1 rounded inline-block">{new Date(editingPriceList.endDate).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            </div>

            {/* Form sao chép bảng giá */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Bảng giá mới (bản sao)</h3>
              <ConfigProvider locale={viVN}>
                <Form layout="vertical">
                  <Form.Item
                    label="Mã bảng giá mới"
                    required
                    tooltip="Mã định danh cho bảng giá mới"
                    validateStatus={splitVersionData.newCode && !/^[A-Z0-9]{6}$/.test(splitVersionData.newCode) ? 'error' : ''}
                    help={splitVersionData.newCode && !/^[A-Z0-9]{6}$/.test(splitVersionData.newCode) ? 'Mã bảng giá phải gồm đúng 6 ký tự chữ/số (VD: BG0001)' : ''}
                  >
                    <Input
                      ref={newCodeInputRef}
                      value={splitVersionData.newCode}
                      maxLength={6}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                        setSplitVersionData({ ...splitVersionData, newCode: v });
                      }}
                      placeholder="Ví dụ: BG0001"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </Form.Item>
                  
                  <Form.Item
                    label="Mô tả mới"
                    tooltip="Mô tả cho bảng giá mới (tùy chọn)"
                  >
                    <Input
                      value={splitVersionData.newDescription}
                      onChange={(e) => setSplitVersionData({...splitVersionData, newDescription: e.target.value})}
                      placeholder="Nhập mô tả (tùy chọn)"
                    />
                  </Form.Item>
                  
                  <Form.Item
                    label="Tên bảng giá mới"
                    required
                    tooltip="Tên của bảng giá được sao chép"
                  >
                    <Input
                      value={splitVersionData.newName}
                      onChange={(e) => setSplitVersionData({...splitVersionData, newName: e.target.value})}
                      placeholder="Nhập tên bảng giá mới"
                    />
                  </Form.Item>
                  
                    <Form.Item
                    label="Khoảng thời gian hiệu lực"
                      required
                    tooltip="Chọn khoảng ngày bắt đầu/kết thúc cho bản sao. Không được trùng với các khoảng đã có."
                  >
                    <DatePicker.RangePicker
                      value={
                        splitVersionData.startDate && splitVersionData.endDate
                          ? [dayjs(splitVersionData.startDate), dayjs(splitVersionData.endDate)]
                          : null
                      }
                      onChange={(dates) => {
                        const [start, end] = dates || [];
                          setSplitVersionData({
                            ...splitVersionData, 
                          startDate: start ? start.format('YYYY-MM-DD') : '',
                          endDate: end ? end.format('YYYY-MM-DD') : ''
                          });
                        }}
                        className="w-full"
                        format="DD/MM/YYYY"
                      allowClear
                        disabledDate={(current) => {
                        if (!current) return false;
                        // Không cho chọn hôm nay và quá khứ
                        const isPastOrToday = current <= dayjs().startOf('day');
                        if (isPastOrToday) return true;
                        // Không cho chọn vào bất kỳ khoảng thời gian đã tồn tại (bao gồm cả bảng gốc)
                        const ts = current.startOf('day');
                        const overlap = priceLists.some((pl) => {
                          const s = dayjs(pl.startDate).startOf('day');
                          const e = dayjs(pl.endDate).endOf('day');
                          return (ts.isAfter(s) && ts.isBefore(e)) || ts.isSame(s, 'day') || ts.isSame(e, 'day');
                        });
                        return overlap;
                        }}
                      />
                    </Form.Item>

                  <div className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400">
                    <div className="flex">
                      <div className="text-yellow-600 mr-2">⚠️</div>
                      <div className="text-yellow-800 text-sm">
                        <strong>Lưu ý:</strong> Bảng giá mới sẽ được tạo với cùng nội dung giá như bảng giá hiện tại. 
                        Bạn có thể chỉnh sửa giá sau khi tạo.
                      </div>
                    </div>
                  </div>
                </Form>
              </ConfigProvider>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Xem trước thay đổi</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mã bảng giá mới:</span>
                  <span className="font-medium">
                    {splitVersionData.newCode || 'Chưa nhập'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tên bảng giá mới:</span>
                  <span className="font-medium">
                    {splitVersionData.newName || 'Chưa nhập'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày bắt đầu:</span>
                  <span className="font-medium">
                    {splitVersionData.startDate ? new Date(splitVersionData.startDate).toLocaleDateString('vi-VN') : 'Chưa chọn'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày kết thúc:</span>
                  <span className="font-medium">
                    {splitVersionData.endDate ? new Date(splitVersionData.endDate).toLocaleDateString('vi-VN') : 'Chưa chọn'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mô tả mới:</span>
                  <span className="font-medium">
                    {splitVersionData.newDescription || 'Chưa có mô tả'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                onClick={() => {
                  setSplitVersionModalVisible(false);
                  setEditingPriceList(null);
                  setSplitVersionData({ newName: '', newCode: '', newDescription: '', startDate: '', endDate: '' });
                  setSplitVersionSubmitting(false);
                }}
              >
                Hủy
              </Button>
              <Button
                type="primary"
                loading={splitVersionSubmitting}
                onClick={() => {
                  if (!splitVersionData.newCode || !splitVersionData.newName || !splitVersionData.startDate || !splitVersionData.endDate) {
                    message.error("Vui lòng điền đầy đủ thông tin");
                    return;
                  }

                  // Validation mã bảng giá: đúng 6 ký tự chữ/ số
                  if (!/^[A-Z0-9]{6}$/.test(splitVersionData.newCode)) {
                    message.error("Mã bảng giá phải gồm đúng 6 ký tự chữ/số (VD: BG0001)");
                    return;
                  }
                  // Validation ngày
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const start = new Date(splitVersionData.startDate);
                  const end = new Date(splitVersionData.endDate);
                  start.setHours(0,0,0,0); end.setHours(0,0,0,0);

                  if (start <= today) {
                    message.error(`Ngày bắt đầu (${start.toLocaleDateString('vi-VN')}) phải sau hôm nay (${today.toLocaleDateString('vi-VN')})`);
                    return;
                  }
                  if (end <= start) {
                    message.error("Ngày kết thúc phải sau ngày bắt đầu");
                    return;
                  }

                  // Chặn trùng với bất kỳ khoảng thời gian đã tồn tại
                  const startD = dayjs(splitVersionData.startDate).startOf('day');
                  const endD = dayjs(splitVersionData.endDate).endOf('day');
                  const conflicts = priceLists.filter((pl) => {
                    const s = dayjs(pl.startDate).startOf('day');
                    const e = dayjs(pl.endDate).endOf('day');
                    // overlap nếu start <= e && end >= s
                    return (startD.isSame(e, 'day') || startD.isBefore(e)) && (endD.isSame(s, 'day') || endD.isAfter(s));
                  });
                  if (conflicts.length > 0) {
                    const names = conflicts.map((c) => `${c.name} (${dayjs(c.startDate).format('DD/MM/YYYY')} - ${dayjs(c.endDate).format('DD/MM/YYYY')})`).join(', ');
                    message.error(`Khoảng thời gian bị trùng với: ${names}`);
                    return;
                  }

                  handleDuplicatePriceList({
                    newName: splitVersionData.newName,
                    newCode: splitVersionData.newCode,
                    newDescription: splitVersionData.newDescription,
                    startDate: splitVersionData.startDate,
                    endDate: splitVersionData.endDate,
                  });
                }}
                style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
              >
                Tạo bản sao
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal sửa tất cả các dòng giá */}
      {editPriceLinesModalVisible && viewingPriceList && (
        <Modal
          title={
            <div style={{ textAlign: 'center', fontSize: '20px' }}>
              {(!viewingPriceList.lines || viewingPriceList.lines.length === 0) 
                ? "Thêm danh sách giá" 
                : "Sửa danh sách giá"
              }
            </div>
          }
          open={true}
          onCancel={() => {
            setEditPriceLinesModalVisible(false);
            setEditingPriceLines([]);
          }}
          onOk={async () => {
            try {
              setEditPriceLinesSubmitting(true);
              
              // Validate that all lines have required fields
              const incompleteLines = [];
              for (let i = 0; i < editingPriceLines.length; i++) {
                const line = editingPriceLines[i];
                
                if (line.type === 'ticket') {
                  if (!line.seatType) {
                    incompleteLines.push(`Dòng ${i + 1}: Chưa chọn loại ghế`);
                  }
                } else if (line.type === 'combo' || line.type === 'single') {
                  if (!line.productId) {
                    incompleteLines.push(`Dòng ${i + 1}: Chưa chọn ${line.type === 'combo' ? 'combo' : 'sản phẩm'}`);
                  }
                }
                
                if (!line.price || line.price <= 0) {
                  incompleteLines.push(`Dòng ${i + 1}: Giá phải lớn hơn 0`);
                }
              }
              
              if (incompleteLines.length > 0) {
                message.error(`Vui lòng hoàn thiện thông tin:\n${incompleteLines.join('\n')}`);
                setEditPriceLinesSubmitting(false);
                    return;
                  }

              // Check for duplicates
              const duplicates = [];
              for (let i = 0; i < editingPriceLines.length; i++) {
                for (let j = i + 1; j < editingPriceLines.length; j++) {
                  const line1 = editingPriceLines[i];
                  const line2 = editingPriceLines[j];
                  
                  if (line1.type === 'ticket' && line2.type === 'ticket' && line1.seatType === line2.seatType) {
                    duplicates.push(`Loại ghế ${line1.seatType} bị trùng lặp`);
                  } else if (line1.type === 'combo' && line2.type === 'combo' && line1.productId === line2.productId) {
                    duplicates.push(`Combo ${line1.productName} bị trùng lặp`);
                  } else if (line1.type === 'single' && line2.type === 'single' && line1.productId === line2.productId) {
                    duplicates.push(`Sản phẩm ${line1.productName} bị trùng lặp`);
                  }
                }
              }
              
              if (duplicates.length > 0) {
                message.error(`Có sản phẩm/loại ghế bị trùng lặp: ${duplicates.join(', ')}`);
                setEditPriceLinesSubmitting(false);
                    return;
                  }

              await updatePriceList(viewingPriceList._id, { lines: editingPriceLines as any });
              await loadPriceLists();
              const refreshed = (await getAllPriceLists()).find(p => p._id === viewingPriceList._id);
              if (refreshed) setViewingPriceList(refreshed as any);
              message.success('Cập nhật danh sách giá thành công!');
              setEditPriceLinesModalVisible(false);
              setEditingPriceLines([]);
            } catch (error) {
              console.error('Error updating price lines:', error);
              message.error('Có lỗi xảy ra khi cập nhật danh sách giá');
            } finally {
              setEditPriceLinesSubmitting(false);
            }
          }}
          width={800}
          okText="Lưu"
          cancelText="Hủy"
          confirmLoading={editPriceLinesSubmitting}
          centered
          bodyStyle={{ 
            maxHeight: '70vh', 
            overflowY: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="hide-scrollbar"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Danh sách giá hiện tại:</span>
            </div>
            
            {products.combos.length === 0 && products.singleProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div>Đang tải danh sách sản phẩm...</div>
              </div>
            ) : (
              <>
                <Table
              columns={[
                {
                  title: 'Loại',
                  dataIndex: 'type',
                  key: 'type',
                  width: 120,
                  render: (type: string, _: any, index: number) => (
                    <Select
                      value={type || undefined}
                      onChange={(value) => {
                        const newLines = [...editingPriceLines];
                        newLines[index] = { ...newLines[index], type: value, productName: '', seatType: undefined, productId: '' };
                        setEditingPriceLines(newLines);
                      }}
                      style={{ width: '100%' }}
                      placeholder="Chọn loại"
                    >
                      <Select.Option value="ticket">Vé</Select.Option>
                      <Select.Option value="combo">Combo</Select.Option>
                      <Select.Option value="single">Sản phẩm</Select.Option>
                    </Select>
                  ),
                },
                {
                  title: 'Sản phẩm / Loại ghế',
                  dataIndex: 'productName',
                  key: 'productName',
                  render: (_: string, record: any, index: number) => {
                    // Nếu chưa chọn loại thì disable và hiển thị placeholder
                    if (!record.type || record.type === '') {
                      return (
                        <Select
                          disabled={true}
                          style={{ width: '100%' }}
                          placeholder="Vui lòng chọn loại trước"
                        />
                      );
                    }
                    
                    if (record.type === 'ticket') {
                      const usedSeatTypes = editingPriceLines
                        .filter((line, i) => i !== index && line.type === 'ticket')
                        .map(line => line.seatType);
                      
                      return (
                        <Select
                          value={record.seatType}
                          onChange={(value) => {
                            const newLines = [...editingPriceLines];
                            newLines[index] = { ...newLines[index], seatType: value };
                            setEditingPriceLines(newLines);
                          }}
                          style={{ width: '100%' }}
                          placeholder="Chọn loại ghế"
                        >
                          <Select.Option value="normal" disabled={usedSeatTypes.includes('normal')}>
                            Ghế thường
                          </Select.Option>
                          <Select.Option value="vip" disabled={usedSeatTypes.includes('vip')}>
                            Ghế VIP
                          </Select.Option>
                          <Select.Option value="couple" disabled={usedSeatTypes.includes('couple')}>
                            Ghế cặp đôi
                          </Select.Option>
                          <Select.Option value="4dx" disabled={usedSeatTypes.includes('4dx')}>
                            Ghế 4DX
                          </Select.Option>
                        </Select>
                      );
                    } else {
                      // Filter products based on type
                      const filteredProducts = record.type === 'combo' 
                        ? products.combos 
                        : products.singleProducts;
                      
                      // Get used product IDs from other lines of the same type
                      const usedProductIds = editingPriceLines
                        .filter((line, i) => i !== index && line.type === record.type)
                        .map(line => line.productId);
                      
                      return (
                        <Select
                          value={record.productId}
                          onChange={(value) => {
                            const newLines = [...editingPriceLines];
                            newLines[index] = { ...newLines[index], productId: value };
                            // Auto-populate product name when product is selected
                            const selectedProduct = filteredProducts.find(p => p._id === value);
                            if (selectedProduct) {
                              newLines[index].productName = selectedProduct.name;
                              // Không tự động fill giá, để user nhập tay
                            }
                            setEditingPriceLines(newLines);
                          }}
                          style={{ width: '100%' }}
                          placeholder={`Chọn ${record.type === 'combo' ? 'combo' : 'sản phẩm'}`}
                        >
                          {filteredProducts.map(product => (
                            <Select.Option 
                              key={product._id} 
                              value={product._id}
                              disabled={usedProductIds.includes(product._id)}
                            >
                              {product.name}
                            </Select.Option>
                          ))}
                        </Select>
                      );
                    }
                  },
                },
                {
                  title: 'Giá (VNĐ)',
                  dataIndex: 'price',
                  key: 'price',
                  width: 150,
                  render: (price: number, record: any, index: number) => {
                    // Kiểm tra xem đã chọn sản phẩm/loại ghế chưa
                    const hasSelectedProduct = (record.type === 'ticket' && record.seatType) || 
                                             ((record.type === 'combo' || record.type === 'single') && record.productId);
                    
                    return (
                      <InputNumber
                      value={price}
                      onChange={(value) => {
                        const newLines = [...editingPriceLines];
                        newLines[index] = { ...newLines[index], price: value || 0 };
                        setEditingPriceLines(newLines);
                      }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, ''))}
                      style={{ width: '100%' }}
                      min={0}
                      disabled={!hasSelectedProduct}
                      placeholder={!hasSelectedProduct ? "Chọn sản phẩm/loại ghế trước" : undefined}
                    />
                    );
                  },
                },
                {
                  title: 'Thao tác',
                  key: 'action',
                  width: 80,
                  render: (_text: any, _record: any, index: number) => (
                    <Button
                      type="text"
                      danger
                      onClick={() => {
                        const newLines = editingPriceLines.filter((_, i) => i !== index);
                        setEditingPriceLines(newLines);
                      }}
                      title="Xóa dòng"
                    >
                      Xóa
                    </Button>
                  ),
                },
              ]}
              dataSource={editingPriceLines}
              rowKey={(_record: any, index?: number) => index || 0}
              pagination={false}
              size="small"
              scroll={{ y: 300 }}
            />
            
            {(() => {
              // Check if all required items are present
              const hasAllSeatTypes = editingPriceLines.filter(line => line.type === 'ticket').length >= 4;
              const hasAllCombos = editingPriceLines.filter(line => line.type === 'combo').length >= products.combos.length;
              const hasAllProducts = editingPriceLines.filter(line => line.type === 'single').length >= products.singleProducts.length;
              const isAllProductsAdded = hasAllSeatTypes && hasAllCombos && hasAllProducts;
              
              return !isAllProductsAdded && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Button 
                    type="dashed" 
                    onClick={() => {
                      setEditingPriceLines([...editingPriceLines, {
                        type: '',
                        productName: '',
                        productId: '',
                        price: 0
                      }]);
                      
                      // Auto scroll to bottom after adding new line
                      setTimeout(() => {
                        const tableContainer = document.querySelector('.ant-table-body');
                        if (tableContainer) {
                          tableContainer.scrollTop = tableContainer.scrollHeight;
                        }
                      }, 100);
                    }}
                    style={{ width: '100%' }}
                  >
                    Thêm dòng
              </Button>
            </div>
              );
            })()}
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
