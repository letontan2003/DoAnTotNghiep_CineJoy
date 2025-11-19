/* eslint-disable @typescript-eslint/no-explicit-any */
export {};

declare global {
  interface IBackendResponse<T> {
    status: boolean;
    error: number;
    message: string;
    data?: T | null;
  }

  interface IUser {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    gender: string;
    avatar: string;
    dateOfBirth: string;
    role: string;
    isActive: boolean;
    settings: {
      darkMode: boolean;
    };
    point?: number;
    createdAt: Date;
  }

  interface IRegister {
    user: IUser;
    accessToken: string;
  }
  interface ILogin {
    user: IUser;
    accessToken: string;
  }

  interface IRefreshToken {
    accessToken: string;
  }

  interface IFetchAccount {
    user: IUser;
  }

  interface IUpload {
    url: string;
    filename: string;
  }

  interface IMovie {
    _id: string;
    movieCode: string;
    title: string;
    releaseDate: string; // dạng ISO string, ví dụ "2025-06-07"
    startDate: string; // ngày khởi chiếu
    endDate: string; // ngày kết thúc chiếu
    duration: number;
    genre: string[];
    director: string;
    actors: string[];
    language: string[];
    description: string;
    trailer: string;
    status:
      | "Phim đang chiếu"
      | "Phim sắp chiếu"
      | "Suất chiếu đặc biệt"
      | "Đã kết thúc";
    image: string;
    posterImage: string;
    ageRating: string;
    reviews: IReview[];
    averageRating: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  // Nếu có review:
  interface IReview {
    user: string;
    comment: string;
    rating: number;
    // Thêm các trường khác nếu có
  }

  interface ITheater {
    _id: string;
    theaterCode: string; // Mã rạp
    name: string;
    regionId: string; // ID của vùng (region)
    location: {
      city: string; // Tên thành phố
      address: string; // Địa chỉ cụ thể
    };
  }

  interface IRegion {
    _id: string;
    regionCode: string; // Mã khu vực
    name: string; // Tên vùng
  }

  interface IRoom {
    _id: string;
    roomCode: string; // Mã phòng
    name: string;
    theater: ITheater;
    capacity: number;
    roomType: "2D" | "4DX";
    status: "active" | "maintenance" | "inactive";
    description?: string;
    seatLayout: {
      rows: number;
      cols: number;
    };
    createdAt: string;
    updatedAt: string;
  }

  interface IShowSession {
    _id: string;
    shiftCode: string; // Mã ca chiếu
    name: string;
    startTime: string;
    endTime: string;
    createdAt: string;
    updatedAt: string;
  }

  interface IShowtime {
    _id: string;
    movieId: IMovie;
    theaterId: ITheater;
    showTimes: Array<{
      _id: string;
      date: string;
      start: string;
      end: string;
      room: string;
      showSessionId?: string;
      status?: "active" | "inactive"; // Trạng thái suất chiếu
      seats: Array<{
        seatId: string;
        status: string;
        type: string;
        price: number;
      }>;
    }>;
  }

  interface ISeat {
    _id: string;
    row: string;
    number: number;
    status: "available" | "reserved" | "sold" | "occupied";
  }

  // Voucher
  interface IVoucher {
    _id: string;
    name: string;
    promotionalCode: string;
    description?: string;
    startDate: Date | string;
    endDate: Date | string;
    status: "hoạt động" | "không hoạt động";
    lines: IPromotionLine[];
    // Legacy fields for backward compatibility
    quantity?: number;
    discountPercent?: number;
    pointToRedeem?: number;
    validityPeriod?: {
      startDate: Date | string;
      endDate: Date | string;
    };
    applyType?: "voucher" | "combo" | "ticket";
  }

  interface IUserVoucher {
    _id: string;
    userId: string;
    voucherId: {
      _id: string;
      name: string;
      validityPeriod: {
        startDate: string;
        api;
        endDate: string;
      };
      quantity: number;
      discountPercent: number;
      pointToRedeem: number;
    };
    code: string;
    status: "unused" | "used" | "expired";
    redeemedAt: string;
    usedAt?: string;
  }

  // =====================
  // Voucher V2 (theo cấu trúc promotion)
  // Giữ IVoucher cũ để tương thích; FE có thể dần chuyển sang IVoucherV2
  // =====================
  interface VoucherDetail {
    _id?: string;
    description?: string;
    pointToRedeem?: number;
    quantity?: number;
    totalQuantity?: number;
    discountPercent?: number;
    maxDiscountValue?: number;
  }

  interface DiscountDetail {
    applyType?: "combo" | "ticket";
    comboName?: string;
    comboId?: string; // ID của combo được chọn
    comboDiscountPercent?: number;
    seatType?: "normal" | "vip" | "couple" | "4dx";
    ticketDiscountPercent?: number;
    totalBudget?: number; // Ngân sách tổng (VNĐ)
    description?: string; // Mô tả cho khuyến mãi chiết khấu
  }

  interface AmountDetail {
    minOrderValue: number;
    discountValue: number;
    totalBudget?: number; // Ngân sách tổng (VNĐ)
    description?: string; // Mô tả cho khuyến mãi tiền
  }

  interface ItemDetail {
    applyType?: "combo" | "ticket";
    // Cho combo: buyItem lấy từ combo, có comboId
    buyItem: string;
    comboId?: string; // ID của combo được chọn khi applyType = 'combo'
    buyQuantity: number;
    // Cho ticket: buyItem là loại vé
    // rewardItem lấy từ cả sản phẩm và combo
    rewardItem: string;
    rewardItemId?: string; // ID của sản phẩm/combo được chọn làm phần thưởng
    rewardQuantity: number;
    rewardType: "free" | "discount";
    rewardDiscountPercent?: number;
    totalBudget?: number; // Ngân sách tổng cho sản phẩm tặng
    description?: string; // Mô tả cho khuyến mãi hàng
  }

  type PromotionDetail =
    | VoucherDetail
    | DiscountDetail
    | AmountDetail
    | ItemDetail;

  interface IPromotionLine {
    promotionType: "item" | "amount" | "percent" | "voucher";
    validityPeriod: {
      startDate: Date | string;
      endDate: Date | string;
    };
    status: "hoạt động" | "không hoạt động";
    detail: PromotionDetail;
    rule?: {
      stackingPolicy: "STACKABLE" | "EXCLUSIVE" | "EXCLUSIVE_WITH_GROUP";
      exclusionGroup?: string; // chỉ dùng khi stackingPolicy = EXCLUSIVE_WITH_GROUP
    };
    code?: string; // Mã 10 số ngẫu nhiên tự động tạo
  }

  // Blog
  interface IBlog {
    _id: string;
    blogCode: string; // Mã tin tức
    title: string;
    description: string; // Mô tả ngắn
    postedDate: string;
    content: string;
    posterImage: string; // Ảnh poster
    backgroundImage: string; // Ảnh background
    status: "Hiển thị" | "Ẩn"; // Trạng thái hiển thị
  }
  // FoodCombo - Sản phẩm đơn lẻ hoặc combo
  interface IComboItem {
    productId: string;
    quantity: number;
  }

  interface IFoodCombo {
    _id: string;
    code: string; // Mã SP/Combo
    name: string;
    type: "single" | "combo";
    description?: string; // Cho cả single products và combo
    items?: IComboItem[]; // Chỉ cho combo
    createdAt: string;
    updatedAt: string;
  }

  // Region
  interface IRegion {
    _id: string;
    regionId: string;
    name: string;
  }

  // Seat & Showtime
  interface ISeat {
    seatId: string;
    status: string;
    type: string;
    price: number;
  }

  interface IOrder {
    _id: string;
    tenNguoiDung: string;
    createdAt: string;
    tongTien: number;
    trangThaiDonHang: string;
    trangThaiThanhToan: string;
  }

  // Order & Payment Types
  interface IOrder {
    _id: string;
    orderCode: string;
    userId: string;
    movieId: any; // Populated movie object
    theaterId: any; // Populated theater object
    showtimeId: string;
    showDate: string;
    showTime: string;
    room: string;
    seats: Array<{
      seatId: string;
      type: string;
      price: number;
    }>;
    foodCombos: Array<{
      comboId: string;
      quantity: number;
      price: number;
    }>;
    voucherId?: string;
    voucherDiscount: number;
    ticketPrice: number;
    comboPrice: number;
    totalAmount: number;
    finalAmount: number;
    paymentMethod: "MOMO" | "VNPAY";
    paymentStatus: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
    orderStatus:
      | "PENDING"
      | "CONFIRMED"
      | "CANCELLED"
      | "COMPLETED"
      | "RETURNED";
    customerInfo: {
      fullName: string;
      phoneNumber: string;
      email: string;
    };
    paymentInfo?: {
      transactionId?: string;
      paymentDate?: Date;
      paymentGatewayResponse?: Record<string, unknown>;
    };
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
  }

  interface IPayment {
    _id: string;
    orderId: string;
    paymentMethod: "MOMO" | "VNPAY";
    amount: number;
    status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED";
    transactionId?: string;
    gatewayTransactionId?: string;
    gatewayResponse?: Record<string, unknown>;
    refundInfo?: {
      refundAmount: number;
      refundDate: Date;
      refundTransactionId: string;
      reason: string;
    };
    metadata?: {
      returnUrl?: string;
      cancelUrl?: string;
      ipAddress?: string;
      userAgent?: string;
    };
    createdAt: string;
    updatedAt: string;
  }

  interface CreateOrderRequest {
    userId: string;
    movieId: string;
    theaterId: string;
    showtimeId: string;
    seats: string[];
    foodCombos: Array<{
      comboId: string;
      quantity: number;
    }>;
    voucherId?: string;
    paymentMethod: "MOMO" | "VNPAY";
    customerInfo: {
      fullName: string;
      phoneNumber: string;
      email: string;
    };
    seatPrice: number;
  }

  interface CreatePaymentRequest {
    paymentMethod: "MOMO" | "VNPAY";
    returnUrl: string;
    cancelUrl: string;
  }

  interface IPriceListLine {
    type: "ticket" | "combo" | "single";
    seatType?: "normal" | "vip" | "couple" | "4dx";
    productId?: string;
    productName?: string;
    price: number;
  }

  interface IPriceList {
    _id: string;
    code: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    status: "active" | "scheduled" | "expired";
    lines: IPriceListLine[];
    createdAt: string;
    updatedAt: string;
  }
}
