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
  paymentMethod: "MOMO" | "VNPAY" | "PAY_LATER";
  customerInfo: {
    fullName: string;
    phoneNumber: string;
    email: string;
  };
}

export interface UpdateOrderData {
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUNDED";
  orderStatus?:
    | "PENDING"
    | "CONFIRMED"
    | "CANCELLED"
    | "COMPLETED"
    | "RETURNED"
    | "WAITING";
  paymentMethod?: "MOMO" | "VNPAY" | "PAY_LATER";
  paymentInfo?: {
    transactionId?: string;
    paymentDate?: Date;
    paymentGatewayResponse?: any;
  };

  returnInfo?: {
    reason?: string;
    returnDate?: Date;
  };
  expiresAt?: Date;
}

class OrderService {
  // Lấy lịch sử đặt vé của user
  async getUserBookingHistory(userId: string): Promise<IOrder[]> {
    try {
      const orders = await Order.find({
        userId: new mongoose.Types.ObjectId(userId),
        orderStatus: { $in: ["CONFIRMED", "RETURNED", "WAITING"] }, // Bao gồm cả CONFIRMED, RETURNED và WAITING
      })
        .populate({
          path: "movieId",
          select: "title poster duration genre ageRating posterImage",
        })
        .populate({
          path: "theaterId",
          select: "name",
        })
        .populate({
          path: "showtimeId",
          select: "showTimes",
        })
        .sort({ createdAt: -1 }) // Sắp xếp theo thời gian tạo mới nhất
        .lean();

      return orders;
    } catch (error) {
      console.error("Error getting user booking history:", error);
      throw error;
    }
  }

  // Get user order details by orderId
  async getUserOrderDetails(
    userId: string,
    orderId: string
  ): Promise<IOrder | null> {
    try {
      const order = await Order.findOne({
        _id: new mongoose.Types.ObjectId(orderId),
        userId: new mongoose.Types.ObjectId(userId),
      })
        .populate({
          path: "movieId",
          select: "title poster duration genre ageRating posterImage",
        })
        .populate({
          path: "theaterId",
          select: "name",
        })
        .populate({
          path: "showtimeId",
          select: "showTimes",
        })
        .populate({
          path: "foodCombos.comboId",
          select: "name",
        })
        .lean();

      return order;
    } catch (error) {
      console.error("Error getting user order details:", error);
      throw error;
    }
  }

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
      const combosWithPrice = orderData.foodCombos.map((combo) => ({
        comboId: combo.comboId,
        quantity: combo.quantity,
        // Nếu frontend chưa gửi price, mặc định 0
        // @ts-ignore - interface cũ chưa có price trên orderData.foodCombos
        price: (combo as any).price || 0,
      }));
      const comboPrice = combosWithPrice.reduce(
        (sum, c) => sum + (c.price || 0) * (c.quantity || 0),
        0
      );

      // Tính toán giá vé từ seats array
      const ticketPrice = orderData.seats.reduce(
        (total, seat) => total + seat.price,
        0
      );
      const totalAmount = ticketPrice + comboPrice;

      // Tính toán voucher discount
      let voucherDiscount = 0;
      if (orderData.voucherId) {
        // orderData.voucherId thực chất là userVoucherId (ObjectId của UserVoucher)
        try {
          // Tìm UserVoucher trực tiếp bằng _id. KHÔNG populate voucherId ở đây
          // vì userVoucher.voucherId lưu detail._id, không phải _id của Voucher header.
          const userVoucher = await UserVoucher.findOne({
            _id: orderData.voucherId,
            userId: orderData.userId,
            status: "unused",
          }).session(session);

          if (userVoucher) {
            console.log(`🔍 Voucher Debug:`);
            console.log(`  UserVoucher ID: ${orderData.voucherId}`);
            console.log(`  Voucher Code: ${userVoucher.code}`);
            console.log(
              `  UserVoucher.voucherId (raw detail._id): ${userVoucher.voucherId}`
            );

            if (!userVoucher.voucherId) {
              console.log(
                `  Error: userVoucher.voucherId is null or undefined in UserVoucher document.`
              );
              // Điều này chỉ ra một document UserVoucher bị lỗi.
              throw new Error("UserVoucher document is missing voucherId.");
            }

            // Tìm Voucher document chính (header) chứa detail._id này
            const { Voucher } = await import("../models/Voucher");
            const voucherDoc = await Voucher.findOne({
              "lines.detail._id": userVoucher.voucherId, // Sử dụng raw detail._id từ userVoucher
            }).session(session);

            let voucherDetail: any = null;
            let voucherLine: any = null; // Để lưu trữ đối tượng line cho validityPeriod

            if (voucherDoc) {
              // Tìm line chứa detail._id này
              const line = voucherDoc.lines?.find(
                (l: any) =>
                  l?.detail?._id?.toString() ===
                  userVoucher.voucherId.toString()
              );

              if (line && line.detail) {
                voucherDetail = line.detail; // Đây là đối tượng detail thực tế chúng ta cần
                voucherLine = line; // Lưu trữ line để lấy validityPeriod
                console.log(`  Found voucher detail in main Voucher document.`);
              } else {
                console.log(
                  `  Could not find matching line detail in main Voucher document for ID: ${userVoucher.voucherId}`
                );
              }
            } else {
              console.log(
                `  Main Voucher document not found for detail ID: ${userVoucher.voucherId}`
              );
            }

            if (voucherDetail && voucherLine) {
              // Bây giờ 'voucherDetail' là đối tượng detail, và 'voucherLine' là line
              const now = new Date();

              const validityPeriod = voucherLine.validityPeriod; // Lấy validityPeriod từ đối tượng line

              console.log(
                `  Discount Percent: ${voucherDetail.discountPercent}%`
              );
              console.log(`  Total Amount: ${totalAmount}`);
              console.log(
                `  Validity Period: ${validityPeriod?.startDate} - ${validityPeriod?.endDate}`
              );
              console.log(`  Current Time: ${now}`);

              if (
                voucherDetail.quantity > 0 &&
                validityPeriod &&
                now >= new Date(validityPeriod.startDate) &&
                now <= new Date(validityPeriod.endDate)
              ) {
                voucherDiscount = Math.round(
                  (totalAmount * voucherDetail.discountPercent) / 100
                );
                // Áp dụng giới hạn giảm giá tối đa
                if (
                  voucherDetail.maxDiscountValue &&
                  voucherDiscount > voucherDetail.maxDiscountValue
                ) {
                  voucherDiscount = voucherDetail.maxDiscountValue;
                }
                console.log(
                  `  Calculated Voucher Discount: ${voucherDiscount}`
                );
              } else {
                console.log(`  Voucher is not valid (quantity, dates).`);
              }
            } else {
              console.log(
                `  Final voucher detail object or line is null, cannot calculate discount.`
              );
            }
          } else {
            console.log(
              `  UserVoucher not found for ID: ${orderData.voucherId}`
            );
          }
        } catch (error) {
          console.error(`❌ Error processing voucher:`, error);
          // Tiếp tục với voucherDiscount = 0 nếu có lỗi
        }
      }

      // Tính toán amount discount (khuyến mãi tiền dựa trên tổng đơn hàng)
      let amountDiscount = 0;
      let amountDiscountInfo = null;

      try {
        // Tìm các voucher có promotionType = "amount" và status = "hoạt động"
        const { Voucher } = await import("../models/Voucher");
        const activeAmountVouchers = await Voucher.find({
          "lines.promotionType": "amount",
          "lines.status": "hoạt động",
          status: "hoạt động",
        }).session(session);

        console.log(`🔍 Amount Discount Debug:`);
        console.log(
          `  Found ${activeAmountVouchers.length} active amount vouchers`
        );

        // Tìm amount discount phù hợp nhất (cao nhất nhưng không vượt quá totalAmount)
        for (const voucher of activeAmountVouchers) {
          for (const line of voucher.lines || []) {
            if (
              line.promotionType === "amount" &&
              line.status === "hoạt động" &&
              line.detail
            ) {
              const detail = line.detail as any; // Type assertion để access amount fields
              const minOrderValue = detail.minOrderValue || 0;
              const discountValue = detail.discountValue || 0;
              const now = new Date();

              console.log(
                `  Checking amount line: minOrder=${minOrderValue}, discount=${discountValue}`
              );

              // Kiểm tra điều kiện thời gian và giá trị đơn hàng
              if (
                totalAmount >= minOrderValue &&
                discountValue > amountDiscount &&
                line.validityPeriod &&
                now >= new Date(line.validityPeriod.startDate) &&
                now <= new Date(line.validityPeriod.endDate)
              ) {
                amountDiscount = discountValue;
                amountDiscountInfo = {
                  description:
                    detail.description ||
                    `Giảm ${discountValue.toLocaleString(
                      "vi-VN"
                    )}₫ cho hóa đơn từ ${minOrderValue.toLocaleString(
                      "vi-VN"
                    )}₫`,
                  minOrderValue,
                  discountValue,
                  exclusionGroup: line.rule?.exclusionGroup || null,
                };
                console.log(
                  `  ✅ Applied amount discount: ${discountValue}₫ (${amountDiscountInfo.description})`
                );
              }
            }
          }
        }

        // Cho phép áp dụng cả voucher và amount discount (không loại trừ)
        // Nếu cần logic exclusion group trong tương lai, có thể thêm điều kiện cụ thể
        console.log(`  ✅ Amount discount applied: ${amountDiscount}₫`);
      } catch (error) {
        console.error(`❌ Error processing amount discount:`, error);
        // Tiếp tục với amountDiscount = 0 nếu có lỗi
      }

      // Tính toán item promotions (khuyến mãi hàng) cho cả combo và vé
      let itemPromotions = [];

      try {
        // Import VoucherService để sử dụng applyItemPromotions
        const VoucherServiceModule = await import("./VoucherService");
        const VoucherService = VoucherServiceModule.default;
        const voucherService = new VoucherService();

        // Chuyển đổi foodCombos thành format cần thiết cho API
        const selectedCombos = combosWithPrice.map((combo) => ({
          comboId: combo.comboId,
          quantity: combo.quantity,
          name: "Combo", // Tên sẽ được lấy từ database trong VoucherService
        }));

        // Lấy thông tin vé đã chọn
        const selectedSeats = orderData.seats.map((seat) => ({
          seatId: seat.seatId,
          type: seat.type,
          price: seat.price,
        }));

        // Gọi applyItemPromotions với cả combo và seats
        if (selectedCombos.length > 0 || selectedSeats.length > 0) {
          console.log(`🔍 Item Promotions Debug:`);
          console.log(`  Selected combos:`, selectedCombos);
          console.log(`  Selected seats:`, selectedSeats);

          const promotionResult = await voucherService.applyItemPromotions(
            selectedCombos,
            [],
            selectedSeats
          );

          if (
            promotionResult.status &&
            promotionResult.data &&
            promotionResult.data.applicablePromotions.length > 0
          ) {
            itemPromotions = promotionResult.data.applicablePromotions.map(
              (promotion: any) => ({
                description:
                  promotion.detail?.description ||
                  `Tặng ${promotion.rewardQuantity} ${promotion.rewardItem}`,
                rewardItem: promotion.rewardItem,
                rewardQuantity: promotion.rewardQuantity,
                rewardType: promotion.rewardType,
              })
            );

            console.log(
              `  ✅ Applied ${itemPromotions.length} item promotions:`,
              itemPromotions
            );
          } else {
            console.log(`  ℹ️ No applicable item promotions found`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing item promotions:`, error);
        // Tiếp tục với itemPromotions = [] nếu có lỗi
      }

      // Tính toán percent promotions (khuyến mãi chiết khấu) cho cả combo và vé
      let percentPromotions = [];
      let percentDiscountAmount = 0;

      try {
        // Import VoucherService để sử dụng applyPercentPromotions
        const VoucherServiceModule = await import("./VoucherService");
        const VoucherService = VoucherServiceModule.default;
        const voucherService = new VoucherService();

        // Chuyển đổi foodCombos thành format cần thiết cho API (có thêm price)
        const selectedCombosWithPrice = combosWithPrice.map((combo) => ({
          comboId: combo.comboId,
          quantity: combo.quantity,
          name: "Combo", // Tên sẽ được lấy từ database trong VoucherService
          price: combo.price,
        }));

        // Lấy thông tin vé đã chọn
        const selectedSeats = orderData.seats.map((seat) => ({
          seatId: seat.seatId,
          type: seat.type,
          price: seat.price,
        }));

        // Gọi applyPercentPromotions với cả combo và seats
        if (selectedCombosWithPrice.length > 0 || selectedSeats.length > 0) {
          console.log(`🔍 Percent Promotions Debug:`);
          console.log(`  Selected combos with price:`, selectedCombosWithPrice);
          console.log(`  Selected seats:`, selectedSeats);

          const percentResult = await voucherService.applyPercentPromotions(
            selectedCombosWithPrice,
            [],
            selectedSeats
          );

          if (
            percentResult.status &&
            percentResult.data &&
            percentResult.data.applicablePromotions.length > 0
          ) {
            percentPromotions = percentResult.data.applicablePromotions.map(
              (promotion: any) => {
                // Tạo description phù hợp
                let description = promotion.detail?.description;
                if (!description) {
                  if (promotion.seatType) {
                    // Promotion cho vé
                    description = `Giảm ${promotion.discountPercent}% vé ${promotion.seatType}`;
                  } else if (promotion.comboName) {
                    // Promotion cho combo
                    description = `Giảm ${promotion.discountPercent}% ${promotion.comboName}`;
                  } else {
                    description = `Giảm ${promotion.discountPercent}%`;
                  }
                }

                // Tạo object với chỉ các trường cần thiết
                const percentPromo: any = {
                  description: description,
                  discountPercent: promotion.discountPercent,
                  discountAmount: promotion.discountAmount,
                };

                // Chỉ thêm comboName/comboId nếu là promotion cho combo
                if (promotion.comboName) {
                  percentPromo.comboName = promotion.comboName;
                }
                if (promotion.comboId) {
                  percentPromo.comboId = promotion.comboId;
                }

                // Chỉ thêm seatType nếu là promotion cho vé
                if (promotion.seatType) {
                  percentPromo.seatType = promotion.seatType;
                }

                return percentPromo;
              }
            );

            percentDiscountAmount = percentResult.data.totalDiscountAmount || 0;

            console.log(
              `  ✅ Applied ${percentPromotions.length} percent promotions:`,
              percentPromotions
            );
            console.log(
              `  ✅ Total percent discount amount: ${percentDiscountAmount}₫`
            );
          } else {
            console.log(`  ℹ️ No applicable percent promotions found`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing percent promotions:`, error);
        // Tiếp tục với percentPromotions = [] nếu có lỗi
      }

      const finalAmount =
        totalAmount - voucherDiscount - amountDiscount - percentDiscountAmount;

      console.log(`🔍 Order Amount Debug:`);
      console.log(`  Total Amount: ${totalAmount}`);
      console.log(`  Voucher Discount: ${voucherDiscount}`);
      console.log(`  Amount Discount: ${amountDiscount}`);
      console.log(`  Percent Discount: ${percentDiscountAmount}`);
      console.log(`  Item Promotions: ${itemPromotions.length} promotions`);
      console.log(
        `  Percent Promotions: ${percentPromotions.length} promotions`
      );
      console.log(`  Final Amount: ${finalAmount}`);

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
      // Orders PENDING/CANCELLED/COMPLETED sẽ bị xóa sau 1 giờ
      // Orders CONFIRMED và RETURNED sẽ set expiresAt = null (không bao giờ xóa)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // **KIỂM TRA GHẾ TRƯỚC KHI TẠO ORDER**
      const seatIds = orderData.seats.map((seat) => seat.seatId);

      // Sử dụng thời gian trực tiếp từ frontend (Vietnam time)
      const showTime = orderData.showTime;

      // Set orderStatus based on paymentMethod
      // If PAY_LATER, set to WAITING; otherwise default to PENDING
      const initialOrderStatus =
        orderData.paymentMethod === "PAY_LATER" ? "WAITING" : "PENDING";

      // Nếu thanh toán sau (WAITING), ghế phải chuyển sang trạng thái occupied ngay lập tức
      // Các order PENDING giữ ghế bằng trạng thái "reserved"
      const seatStatus =
        orderData.paymentMethod === "PAY_LATER" ? "occupied" : "reserved";

      // Tạm giữ ghế trong showtime với trạng thái tương ứng
      try {
        await showtimeService.setSeatsStatus(
          orderData.showtimeId,
          orderData.showDate,
          showTime,
          orderData.room,
          seatIds,
          seatStatus,
          undefined, // onlyIfReservedByUserId
          orderData.userId // reservedByUserId
        );
        console.log(
          `🔒 Set seats ${seatIds.join(", ")} to ${seatStatus} for user ${
            orderData.userId
          }${
            seatStatus === "occupied"
              ? " (WAITING order, kept as occupied)"
              : " for 8 minutes"
          }`
        );
      } catch (seatError: any) {
        // Nếu ghế không available, return error response
        await session.abortTransaction();
        return {
          success: false,
          message: `Không thể tạm giữ ghế: ${seatError.message}`,
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
        amountDiscount,
        amountDiscountInfo,
        itemPromotions,
        percentPromotions,
        ticketPrice,
        comboPrice,
        totalAmount,
        finalAmount,
        paymentMethod: orderData.paymentMethod,
        orderStatus: initialOrderStatus,
        customerInfo: orderData.customerInfo,
        expiresAt,
      });

      const savedOrder = await newOrder.save({ session });

      console.log(
        "Order created and seats reserved successfully:",
        savedOrder.orderCode
      );

      // Note: Voucher sẽ được mark as used khi thanh toán thành công, không phải khi tạo order

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
        .populate("userId", "fullName email phoneNumber gender")
        .populate("movieId", "title poster duration")
        .populate("theaterId", "theaterCode name location")
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
      .populate("userId", "fullName email phoneNumber gender")
      .populate("movieId", "title poster duration posterImage")
      .populate("theaterId", "name location")
      .populate("showtimeId", "startTime date")
      .populate("foodCombos.comboId", "name price")
      .populate("voucherId", "code discountPercent");
  }

  // Lấy order theo orderCode
  async getOrderByCode(orderCode: string): Promise<IOrder | null> {
    return await Order.findOne({ orderCode })
      .populate("userId", "fullName email phoneNumber gender")
      .populate("movieId", "title poster duration posterImage")
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
        .populate("userId", "fullName email phoneNumber gender")
        .populate("movieId", "title poster duration posterImage")
        .populate("theaterId", "theaterCode name location")
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

      // Chuẩn bị $unset nếu cần xóa expiresAt
      let shouldUnsetExpiresAt = false;

      // Nếu order được thanh toán thành công hoặc được confirm, xóa expiresAt để không bao giờ xóa
      if (
        updateData.paymentStatus === "PAID" ||
        updateData.orderStatus === "CONFIRMED"
      ) {
        delete updateData.expiresAt; // Xóa khỏi updateData
        shouldUnsetExpiresAt = true; // Đánh dấu cần $unset
        if (updateData.paymentStatus === "PAID") {
          updateData.orderStatus = "CONFIRMED";
        }
        console.log(
          `✅ Order ${orderId} confirmed and expiresAt will be unset`
        );

        // Nếu order đang ở trạng thái WAITING (thanh toán sau), đảm bảo ghế được set occupied
        // Khi thanh toán thành công, orderStatus chuyển sang CONFIRMED và ghế giữ trạng thái occupied
        if (
          currentOrder.orderStatus === "WAITING" &&
          updateData.paymentStatus === "PAID"
        ) {
          try {
            const seatIds = currentOrder.seats.map((seat) => seat.seatId);
            const showTime = currentOrder.showTime;

            console.log(
              "Attempting to mark seats as occupied for paid WAITING order:",
              {
                orderId: currentOrder._id,
                orderCode: currentOrder.orderCode,
                showtimeId: currentOrder.showtimeId.toString(),
                showDate: currentOrder.showDate,
                showTime: currentOrder.showTime,
                room: currentOrder.room,
                seatIds: seatIds,
                newSeatStatus: "occupied",
              }
            );

            // Đảm bảo ghế ở trạng thái occupied sau khi thanh toán thành công cho order WAITING
            // Sau khi thanh toán thành công, orderStatus sẽ chuyển sang CONFIRMED
            await showtimeService.setSeatsStatus(
              currentOrder.showtimeId.toString(),
              currentOrder.showDate,
              showTime,
              currentOrder.room,
              seatIds,
              "occupied",
              currentOrder.userId.toString(), // Chỉ user này mới có thể confirm ghế của họ
              currentOrder.userId.toString()
            );
            console.log(
              `✅ Marked seats ${seatIds.join(", ")} as occupied for user ${
                currentOrder.userId
              } after successful payment for WAITING order (order changed from WAITING to CONFIRMED)`
            );
          } catch (seatError) {
            console.error(
              "Error marking seats as occupied for paid WAITING order:",
              seatError
            );
            // Log error nhưng không fail transaction vì payment đã thành công
          }
        }
      }

      // Nếu order được trả vé (RETURNED), xóa expiresAt để không bao giờ xóa
      if (updateData.orderStatus === "RETURNED") {
        delete updateData.expiresAt; // Xóa khỏi updateData
        shouldUnsetExpiresAt = true; // Đánh dấu cần $unset
        console.log(`✅ Order ${orderId} returned and expiresAt will be unset`);

        // Mark voucher as used khi thanh toán thành công (fallback cho trường hợp updateOrder được gọi)
        if (currentOrder.voucherId && currentOrder.voucherDiscount > 0) {
          try {
            const { UserVoucher } = await import("../models/UserVoucher");
            const updateResult = await UserVoucher.findByIdAndUpdate(
              currentOrder.voucherId,
              {
                $set: {
                  status: "used",
                  usedAt: new Date(),
                },
              }
            );

            if (updateResult) {
              console.log(
                `✅ Voucher ${updateResult.code} marked as used after successful payment (via updateOrder)`
              );
            } else {
              console.log(
                `❌ Failed to mark voucher as used: voucher not found`
              );
            }
          } catch (error) {
            console.error(`❌ Error marking voucher as used:`, error);
          }
        }

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

          // Chuyển ghế từ "reserved" sang "selected" khi thanh toán thành công
          await showtimeService.setSeatsStatus(
            currentOrder.showtimeId.toString(),
            currentOrder.showDate,
            showTime,
            currentOrder.room,
            seatIds,
            "selected",
            currentOrder.userId.toString(), // Chỉ user này mới có thể confirm ghế của họ
            currentOrder.userId.toString()
          );
          console.log(
            `✅ Confirmed seats ${seatIds.join(", ")} for user ${
              currentOrder.userId
            } after successful payment`
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

      // Chuẩn bị update object với $set và $unset nếu cần
      const updateObj: any = { $set: updateData };
      if (shouldUnsetExpiresAt) {
        updateObj.$unset = { expiresAt: "" }; // Xóa field expiresAt để ngăn TTL index xóa order
      }

      const updatedOrder = await Order.findByIdAndUpdate(orderId, updateObj, {
        new: true,
        runValidators: true,
        session,
      })
        .populate("userId", "fullName email phoneNumber")
        .populate("movieId", "title poster duration")
        .populate("theaterId", "theaterCode name location")
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
              {
                seatId: { $in: currentOrder.seats.map((s) => s.seatId) },
                room: (currentOrder as any).roomId || undefined,
              },
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

      if (order.orderStatus === "RETURNED") {
        throw new Error("Order đã được trả vé");
      }

      // Nếu đơn đã thanh toán, đây là trả vé (RETURNED), không phải hủy
      if (order.paymentStatus === "PAID") {
        // Trả vé cho đơn đã thanh toán
        // Release ghế trong showtime khi trả vé
        try {
          const seatIds = order.seats.map((seat) => seat.seatId);

          // Cập nhật trạng thái ghế về available
          await showtimeService.setSeatsStatus(
            order.showtimeId.toString(),
            order.showDate,
            order.showTime,
            order.room,
            seatIds,
            "available"
          );
          console.log("Seats released for returned order:", order.orderCode);
        } catch (seatError) {
          console.error("Error releasing seats for returned order:", seatError);
          // Log error nhưng vẫn tiếp tục trả vé
        }

        // Tính toán số tiền hoàn lại dựa trên thời gian trả vé
        const now = new Date();
        const returnDate = new Date();

        // Parse thời gian chiếu
        const parseTimeTo24Hour = (
          timeStr: string
        ): { hours: number; minutes: number } | null => {
          try {
            let hours: number;
            let minutes: number;

            if (timeStr.includes("AM") || timeStr.includes("PM")) {
              const timePart = timeStr.replace(/\s*(AM|PM)/i, "");
              const [h, m] = timePart.split(":").map(Number);
              const isPM = /PM/i.test(timeStr);

              if (isPM && h !== 12) {
                hours = h + 12;
              } else if (!isPM && h === 12) {
                hours = 0;
              } else {
                hours = h;
              }
              minutes = m;
            } else {
              const [h, m] = timeStr.split(":").map(Number);
              hours = h;
              minutes = m;
            }
            return { hours, minutes };
          } catch (error) {
            console.error("Error parsing time:", error);
            return null;
          }
        };

        const parsedTime = parseTimeTo24Hour(order.showTime);
        if (!parsedTime) {
          throw new Error("Không thể parse thời gian chiếu");
        }

        // Tạo Date object cho thời gian bắt đầu chiếu
        const showDate = new Date(order.showDate);
        const showDateTime = new Date(showDate);
        showDateTime.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);

        // Tính số giờ còn lại từ thời điểm trả vé đến giờ chiếu
        const hoursUntilShowtime =
          (showDateTime.getTime() - returnDate.getTime()) / (1000 * 60 * 60);

        // Xác định tỷ lệ hoàn tiền
        let refundPercentage: number;
        let isBefore2Hours: boolean;

        if (hoursUntilShowtime > 2) {
          // Trả vé trước (> 2 giờ) trước giờ chiếu: hoàn lại 90% (trừ 10%)
          refundPercentage = 90;
          isBefore2Hours = true;
        } else {
          // Trả vé sau (<= 2 giờ) trước giờ chiếu: hoàn lại 75% (trừ 25%)
          refundPercentage = 75;
          isBefore2Hours = false;
        }

        // Tính số tiền hoàn lại
        const refundAmount = Math.round(
          (order.finalAmount * refundPercentage) / 100
        );

        console.log(`💰 Refund calculation for order ${order.orderCode}:`, {
          finalAmount: order.finalAmount,
          hoursUntilShowtime: hoursUntilShowtime.toFixed(2),
          isBefore2Hours,
          refundPercentage,
          refundAmount,
        });

        // Cập nhật trạng thái order thành RETURNED với thông tin trả vé và hoàn tiền
        const updatedOrder = await Order.findByIdAndUpdate(
          orderId,
          {
            $set: {
              orderStatus: "RETURNED",
              paymentStatus: "REFUNDED",
              returnInfo: {
                reason: reason || "Khách hàng yêu cầu trả vé",
                returnDate: returnDate,
                refundAmount: refundAmount,
                refundPercentage: refundPercentage,
                returnedBeforeHours: hoursUntilShowtime,
                isBefore2Hours: isBefore2Hours,
              },
            },
            $unset: {
              expiresAt: "", // Xóa field expiresAt để ngăn TTL index xóa order RETURNED
            },
          },
          { new: true }
        );
        return updatedOrder;
      }

      // Hủy order chưa thanh toán (bao gồm cả order WAITING với ghế occupied)
      // Bỏ logic hoàn trả FoodCombo vì đã xóa các trường quantity, price

      // Release ghế trong showtime khi hủy order
      // QUAN TRỌNG: Khi order CANCELLED, ghế PHẢI về available (bao gồm cả ghế occupied từ order WAITING)
      try {
        const seatIds = order.seats.map((seat) => seat.seatId);

        console.log(
          `🔄 Attempting to release seats for cancelled order ${order.orderCode}:`,
          {
            orderId: order._id,
            showtimeId: order.showtimeId.toString(),
            showDate: order.showDate,
            showTime: order.showTime,
            room: order.room,
            seatIds: seatIds,
            currentOrderStatus: order.orderStatus,
            isWaitingOrder: order.orderStatus === "WAITING",
          }
        );

        // Cập nhật trạng thái ghế về available
        // Điều này áp dụng cho TẤT CẢ các trạng thái ghế: reserved, occupied, selected
        // Khi order bị CANCELLED, ghế PHẢI về available
        await showtimeService.setSeatsStatus(
          order.showtimeId.toString(),
          order.showDate,
          order.showTime,
          order.room,
          seatIds,
          "available"
        );
        console.log(
          `✅ Seats released successfully for cancelled order: ${
            order.orderCode
          } (from ${order.orderStatus} to CANCELLED, seats from ${
            order.orderStatus === "WAITING" ? "occupied" : "reserved/selected"
          } to available)`
        );
      } catch (seatError) {
        console.error(
          `❌ Error releasing seats for cancelled order ${order.orderCode}:`,
          seatError
        );
        // Throw error để đảm bảo việc hủy đơn hàng không thành công nếu không giải phóng được ghế
        throw new Error(
          `Không thể giải phóng ghế cho đơn hàng ${order.orderCode}: ${
            seatError instanceof Error ? seatError.message : String(seatError)
          }`
        );
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

  async getUserYearlySpending(
    userId: string,
    year: number
  ): Promise<{ year: number; totalOrders: number; totalAmount: number }> {
    const startOfYear = new Date(year, 0, 1);
    startOfYear.setHours(0, 0, 0, 0);
    const startOfNextYear = new Date(year + 1, 0, 1);
    startOfNextYear.setHours(0, 0, 0, 0);

    const [result] = await Order.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startOfYear, $lt: startOfNextYear },
          paymentStatus: "PAID",
          orderStatus: { $nin: ["CANCELLED"] },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$finalAmount" },
        },
      },
    ]);

    return {
      year,
      totalOrders: result?.totalOrders || 0,
      totalAmount: result?.totalAmount || 0,
    };
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

  // Tự động hủy đơn hàng WAITING quá hạn thanh toán (5 tiếng trước giờ chiếu)
  async cancelExpiredWaitingOrders(): Promise<{
    cancelledCount: number;
    cancelledOrderIds: string[];
  }> {
    try {
      const now = new Date();
      const cancelledOrderIds: string[] = [];

      // Lấy tất cả đơn hàng có trạng thái WAITING
      const waitingOrders = await Order.find({
        orderStatus: "WAITING",
        paymentStatus: { $ne: "PAID" },
      })
        .populate("showtimeId")
        .lean();

      console.log(`🔍 Found ${waitingOrders.length} WAITING orders to check`);

      for (const order of waitingOrders) {
        try {
          // Tính toán thời gian bắt đầu chiếu
          const showDate = new Date(order.showDate);
          const showTimeStr = order.showTime;

          // Parse thời gian chiếu
          let showHours = 0;
          let showMinutes = 0;

          if (showTimeStr.includes("AM") || showTimeStr.includes("PM")) {
            const timePart = showTimeStr.replace(/\s*(AM|PM)/i, "");
            const [h, m] = timePart.split(":").map(Number);
            const isPM = /PM/i.test(showTimeStr);

            if (isPM && h !== 12) {
              showHours = h + 12;
            } else if (!isPM && h === 12) {
              showHours = 0;
            } else {
              showHours = h;
            }
            showMinutes = m;
          } else {
            const [h, m] = showTimeStr.split(":").map(Number);
            showHours = h;
            showMinutes = m;
          }

          // Tạo Date object cho thời gian bắt đầu chiếu
          const showDateTime = new Date(showDate);
          showDateTime.setHours(showHours, showMinutes, 0, 0);

          // Tính thời gian hết hạn thanh toán (5 tiếng trước giờ chiếu)
          const paymentDeadline = new Date(
            showDateTime.getTime() - 5 * 60 * 60 * 1000
          );

          // Nếu thời gian hiện tại đã qua hạn thanh toán
          if (now > paymentDeadline) {
            console.log(
              `⏰ Order ${
                order._id
              } has passed payment deadline (deadline: ${paymentDeadline.toISOString()}, now: ${now.toISOString()}). Cancelling...`
            );

            try {
              // Hủy đơn hàng - hàm này sẽ tự động giải phóng ghế
              const cancelledOrder = await this.cancelOrder(
                order._id.toString(),
                "Quá hạn thanh toán (5 tiếng trước giờ chiếu)"
              );

              if (cancelledOrder) {
                cancelledOrderIds.push(order._id.toString());
                console.log(
                  `✅ Successfully cancelled order ${order._id} and released seats`
                );
              } else {
                console.error(
                  `❌ Failed to cancel order ${order._id} - cancelOrder returned null`
                );
              }
            } catch (cancelError) {
              console.error(
                `❌ Error cancelling order ${order._id}:`,
                cancelError
              );
              // Tiếp tục xử lý các đơn hàng khác ngay cả khi có lỗi
            }
          }
        } catch (error) {
          console.error(
            `❌ Error processing order ${order._id} for cancellation:`,
            error
          );
          // Tiếp tục xử lý các đơn hàng khác
        }
      }

      console.log(
        `✅ Cancelled ${cancelledOrderIds.length} expired WAITING orders`
      );

      return {
        cancelledCount: cancelledOrderIds.length,
        cancelledOrderIds,
      };
    } catch (error) {
      console.error("❌ Error cancelling expired waiting orders:", error);
      throw error;
    }
  }
}

export default new OrderService();
