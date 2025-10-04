import Order, { IOrder } from "../models/Order";
import { UserVoucher } from "../models/UserVoucher";
import ShowtimeService from "./ShowtimeService";
import mongoose from "mongoose";

const showtimeService = new ShowtimeService();

export interface CreateOrderData {
  userId: string;
  movieId: string;
  theaterId: string;
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
  }>;
  voucherId?: string;
  paymentMethod: "MOMO" | "VNPAY";
  customerInfo: {
    fullName: string;
    phoneNumber: string;
    email: string;
  };
}

export interface UpdateOrderData {
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
  orderStatus?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  paymentMethod?: "MOMO" | "VNPAY";
  paymentInfo?: {
    transactionId?: string;
    paymentDate?: Date;
    paymentGatewayResponse?: any;
  };
  expiresAt?: Date;
}

class OrderService {
  // Tạo order mới
  async createOrder(orderData: CreateOrderData): Promise<{
    success: boolean;
    order?: IOrder;
    message?: string;
  }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Tính giá combo từ payload (giá đã được frontend gán theo bảng giá hiện hành)
      const combosWithPrice = orderData.foodCombos.map(combo => ({
        comboId: combo.comboId,
        quantity: combo.quantity,
        // Nếu frontend chưa gửi price, mặc định 0
        // @ts-ignore - interface cũ chưa có price trên orderData.foodCombos
        price: (combo as any).price || 0,
      }));
      const comboPrice = combosWithPrice.reduce((sum, c) => sum + (c.price || 0) * (c.quantity || 0), 0);

      // Tính toán giá vé từ seats array
      const ticketPrice = orderData.seats.reduce(
        (total, seat) => total + seat.price,
        0
      );
      const totalAmount = ticketPrice + comboPrice;

      // Tính toán voucher discount
      let voucherDiscount = 0;
      if (orderData.voucherId) {
        // Kiểm tra xem user có sở hữu voucher này không và chưa sử dụng
        const userVoucher = await UserVoucher.findOne({
          userId: orderData.userId,
          voucherId: orderData.voucherId,
          status: "unused",
        })
          .populate("voucherId")
          .session(session);

        if (userVoucher && userVoucher.voucherId) {
          const voucher = userVoucher.voucherId as any; // Populated voucher data
          const now = new Date();

          if (
            voucher.quantity > 0 &&
            now >= voucher.validityPeriod.startDate &&
            now <= voucher.validityPeriod.endDate
          ) {
            voucherDiscount = Math.round(
              (totalAmount * voucher.discountPercent) / 100
            );
          }
        }
      }

      const finalAmount = totalAmount - voucherDiscount;

      // Generate unique order code
      let orderCode: string;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!isUnique && attempts < maxAttempts) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        orderCode = `CJ${timestamp}${random}`.toUpperCase();

        // Check if orderCode already exists
        const existingOrder = await Order.findOne({ orderCode }).session(
          session
        );
        if (!existingOrder) {
          isUnique = true;
        } else {
          attempts++;
          // Small delay to ensure different timestamp
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      if (!isUnique) {
        await session.abortTransaction();
        return {
          success: false,
          message: "Không thể tạo mã đơn hàng unique sau nhiều lần thử",
        };
      }

      // Tạo order với thời gian hết hạn 1 giờ cho order chưa thanh toán
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // **KIỂM TRA GHẾ TRƯỚC KHI TẠO ORDER**
      const seatIds = orderData.seats.map((seat) => seat.seatId);

      // Sử dụng thời gian trực tiếp từ frontend (Vietnam time)
      const showTime = orderData.showTime;


      // Kiểm tra trạng thái ghế trước khi tạo order
      try {
        await showtimeService.bookSeats(
          orderData.showtimeId,
          orderData.showDate,
          showTime,
          orderData.room,
          seatIds,
          "selected"
        );
      } catch (seatError: any) {
        // Nếu ghế không available, return error response
        await session.abortTransaction();
        return {
          success: false,
          message: `Không thể đặt ghế: ${seatError.message}`,
        };
      }

      const newOrder = new Order({
        orderCode: orderCode!,
        userId: orderData.userId,
        movieId: orderData.movieId,
        theaterId: orderData.theaterId,
        showtimeId: orderData.showtimeId,
        showDate: orderData.showDate,
        showTime: orderData.showTime,
        room: orderData.room,
        seats: orderData.seats,
        foodCombos: combosWithPrice,
        voucherId: orderData.voucherId,
        voucherDiscount,
        ticketPrice,
        comboPrice,
        totalAmount,
        finalAmount,
        paymentMethod: orderData.paymentMethod,
        customerInfo: orderData.customerInfo,
        expiresAt,
      });

      const savedOrder = await newOrder.save({ session });

      console.log(
        "Order created and seats reserved successfully:",
        savedOrder.orderCode
      );

      // Mark voucher as used if applied
      if (orderData.voucherId && voucherDiscount > 0) {
        await UserVoucher.findOneAndUpdate(
          {
            userId: orderData.userId,
            voucherId: orderData.voucherId,
            status: "unused",
          },
          {
            status: "used",
            usedAt: new Date(),
          },
          { session }
        );
      }

      await session.commitTransaction();

      return {
        success: true,
        order: savedOrder,
        message: "Tạo đơn hàng thành công",
      };
    } catch (error) {
      await session.abortTransaction();
      return {
        success: false,
        message: `Lỗi tạo đơn hàng: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    } finally {
      session.endSession();
    }
  }

  // Lấy tất cả orders
  async getAllOrders(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: IOrder[];
    totalPages: number;
    currentPage: number;
    totalOrders: number;
  }> {
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find()
        .populate("userId", "fullName email phoneNumber")
        .populate("movieId", "title poster duration")
        .populate("theaterId", "name location")
        .populate("showtimeId", "startTime date")
        .populate("foodCombos.comboId", "name description")
        .populate("voucherId", "code discountPercent")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(),
    ]);

    return {
      orders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      totalOrders,
    };
  }

  // Lấy order theo ID
  async getOrderById(orderId: string): Promise<IOrder | null> {
    return await Order.findById(orderId)
      .populate("userId", "fullName email phoneNumber")
      .populate("movieId", "title poster duration")
      .populate("theaterId", "name location")
      .populate("showtimeId", "startTime date")
      .populate("foodCombos.comboId", "name price")
      .populate("voucherId", "code discountPercent");
  }

  // Lấy order theo orderCode
  async getOrderByCode(orderCode: string): Promise<IOrder | null> {
    return await Order.findOne({ orderCode })
      .populate("userId", "fullName email phoneNumber")
      .populate("movieId", "title poster duration")
      .populate("theaterId", "name location")
      .populate("showtimeId", "startTime date")
      .populate("foodCombos.comboId", "name price")
      .populate("voucherId", "code discountPercent");
  }

  // Lấy orders theo userId
  async getOrdersByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    orders: IOrder[];
    totalPages: number;
    currentPage: number;
    totalOrders: number;
  }> {
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find({ userId })
        .populate("movieId", "title poster duration")
        .populate("theaterId", "name location")
        .populate("showtimeId", "startTime date")
        .populate("foodCombos.comboId", "name description")
        .populate("voucherId", "code discountPercent")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ userId }),
    ]);

    return {
      orders,
      totalPages: Math.ceil(totalOrders / limit),
      currentPage: page,
      totalOrders,
    };
  }

  // Cập nhật order
  async updateOrder(
    orderId: string,
    updateData: UpdateOrderData
  ): Promise<IOrder | null> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Lấy thông tin order hiện tại
      const currentOrder = await Order.findById(orderId).session(session);
      if (!currentOrder) {
        throw new Error("Order không tồn tại");
      }

      // Nếu order được thanh toán thành công, extend expiresAt để không bị tự động xóa
      if (updateData.paymentStatus === "PAID") {
        updateData.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        updateData.orderStatus = "CONFIRMED";

        // Đảm bảo ghế được book trong showtime khi thanh toán thành công
        try {
          const seatIds = currentOrder.seats.map((seat) => seat.seatId);

          // Sử dụng thời gian trực tiếp từ order (Vietnam time)
          const showTime = currentOrder.showTime;

          console.log("Attempting to confirm seats for paid order:", {
            orderId: currentOrder._id,
            orderCode: currentOrder.orderCode,
            showtimeId: currentOrder.showtimeId.toString(),
            showDate: currentOrder.showDate,
            showTime: currentOrder.showTime,
            room: currentOrder.room,
            seatIds: seatIds,
          });

          await showtimeService.bookSeats(
            currentOrder.showtimeId.toString(),
            currentOrder.showDate,
            showTime, // Use Vietnam time directly
            currentOrder.room,
            seatIds,
            "selected" // Xác nhận ghế đã được đặt khi thanh toán thành công
          );
          // Cập nhật thêm trạng thái ghế trong collection showtimes = 'selected'
          await showtimeService.setSeatsStatus(
            currentOrder.showtimeId.toString(),
            currentOrder.showDate,
            showTime,
            currentOrder.room,
            seatIds,
            "selected"
          );
          console.log(
            "Seats confirmed for paid order:",
            currentOrder.orderCode
          );
        } catch (seatError) {
          console.error("Error confirming seats for paid order:", seatError);
          // Log error nhưng không fail transaction vì payment đã thành công
        }
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { $set: updateData },
        { new: true, runValidators: true, session }
      )
        .populate("userId", "fullName email phoneNumber")
        .populate("movieId", "title poster duration")
        .populate("theaterId", "name location")
        .populate("showtimeId", "startTime date")
        .populate("foodCombos.comboId", "name description")
        .populate("voucherId", "code discountPercent");

      await session.commitTransaction();
      
      // Sau khi commit (thanh toán thành công), cập nhật trạng thái ghế ở collection seats về 'selected'
      try {
        if (updateData.paymentStatus === "PAID") {
          const Seat = (await import("../models/Seat")).default;
          if (currentOrder?.seats?.length) {
            await Seat.updateMany(
              { seatId: { $in: currentOrder.seats.map((s) => s.seatId) }, room: (currentOrder as any).roomId || undefined },
              { $set: { status: "selected" } }
            );
          }
        }
      } catch (e) {
        // Không làm fail request nếu cập nhật ghế gặp lỗi; chỉ log
        console.error("Failed to update seat status after payment:", e);
      }
      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Hủy order
  async cancelOrder(orderId: string, reason?: string): Promise<IOrder | null> {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error("Order không tồn tại");
      }

      if (order.orderStatus === "CANCELLED") {
        throw new Error("Order đã được hủy");
      }

      if (order.paymentStatus === "PAID") {
        throw new Error("Không thể hủy order đã thanh toán");
      }

      // Bỏ logic hoàn trả FoodCombo vì đã xóa các trường quantity, price

      // Release ghế trong showtime khi hủy order
      try {
        const seatIds = order.seats.map((seat) => seat.seatId);
        // Cập nhật trạng thái ghế về available (dùng setSeatsStatus để so khớp theo tên phòng/seatId)
        await showtimeService.setSeatsStatus(
          order.showtimeId.toString(),
          order.showDate,
          order.showTime,
          order.room,
          seatIds,
          'available'
        );
        console.log("Seats released for cancelled order:", order.orderCode);
      } catch (seatError) {
        console.error("Error releasing seats for cancelled order:", seatError);
        // Log error nhưng vẫn tiếp tục cancel order
      }

      // Cập nhật trạng thái order
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            orderStatus: "CANCELLED",
            paymentStatus: "CANCELLED",
          },
        },
        { new: true }
      );
      return updatedOrder;
    } catch (error) {
      throw error;
    }
  }

  // Xóa order
  async deleteOrder(orderId: string): Promise<boolean> {
    const result = await Order.findByIdAndDelete(orderId);
    return !!result;
  }

  // Lấy thống kê orders
  async getOrderStats(): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    todayOrders: number;
    todayRevenue: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      todayStats,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: "PAID" } },
        { $group: { _id: null, total: { $sum: "$finalAmount" } } },
      ]),
      Order.countDocuments({ orderStatus: "PENDING" }),
      Order.countDocuments({ orderStatus: "COMPLETED" }),
      Order.countDocuments({ orderStatus: "CANCELLED" }),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "PAID"] }, "$finalAmount", 0],
              },
            },
          },
        },
      ]),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      todayOrders: todayStats[0]?.count || 0,
      todayRevenue: todayStats[0]?.revenue || 0,
    };
  }
}

export default new OrderService();
