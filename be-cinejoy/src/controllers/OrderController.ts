import { Request, Response } from "express";
import OrderService, { CreateOrderData } from "../services/OrderService";
import PaymentService from "../services/PaymentService";

class OrderController {
  // Tạo order mới
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const orderData: CreateOrderData = req.body;

      // Validation
      if (
        !orderData.userId ||
        !orderData.movieId ||
        !orderData.theaterId ||
        !orderData.showtimeId
      ) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Thiếu thông tin bắt buộc",
          data: null,
        });
        return;
      }

      if (!orderData.seats || orderData.seats.length === 0) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Phải chọn ít nhất một ghế",
          data: null,
        });
        return;
      }

      if (
        !orderData.paymentMethod ||
        !["MOMO", "VNPAY"].includes(orderData.paymentMethod)
      ) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Phương thức thanh toán không hợp lệ",
          data: null,
        });
        return;
      }

      if (
        !orderData.customerInfo ||
        !orderData.customerInfo.fullName ||
        !orderData.customerInfo.phoneNumber ||
        !orderData.customerInfo.email
      ) {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Thông tin khách hàng không đầy đủ",
          data: null,
        });
        return;
      }

      const result = await OrderService.createOrder(orderData);

      if (!result.success) {
        res.status(200).json({
          status: false,
          error: 400,
          message: result.message,
          data: null,
        });
        return;
      }

      res.status(201).json({
        status: true,
        error: 0,
        message: result.message,
        data: result.order,
      });
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }

  // Lấy tất cả orders (Admin)
  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await OrderService.getAllOrders(page, limit);

      res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy danh sách đơn hàng thành công",
        data: result,
      });
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server",
        data: null,
      });
    }
  }

  // Lấy order theo ID
  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await OrderService.getOrderById(id);

      if (!order) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không tìm thấy đơn hàng",
          data: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy thông tin đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      console.error("Get order by id error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server",
        data: null,
      });
    }
  }

  // Lấy order theo orderCode
  async getOrderByCode(req: Request, res: Response): Promise<void> {
    try {
      const { orderCode } = req.params;
      const order = await OrderService.getOrderByCode(orderCode);

      if (!order) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không tìm thấy đơn hàng",
          data: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy thông tin đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      console.error("Get order by code error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server",
        data: null,
      });
    }
  }

  // Lấy orders theo userId
  async getOrdersByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await OrderService.getOrdersByUserId(userId, page, limit);

      res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy lịch sử đơn hàng thành công",
        data: result,
      });
    } catch (error) {
      console.error("Get orders by user id error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server",
        data: null,
      });
    }
  }

  // Cập nhật order
  async updateOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const order = await OrderService.updateOrder(id, updateData);

      if (!order) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không tìm thấy đơn hàng",
          data: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Cập nhật đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      console.error("Update order error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }

  // Hủy order
  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await OrderService.cancelOrder(id, reason);

      if (!order) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không tìm thấy đơn hàng",
          data: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Hủy đơn hàng thành công",
        data: order,
      });
    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }

  // Xóa order (Admin only)
  async deleteOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await OrderService.deleteOrder(id);

      if (!success) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không tìm thấy đơn hàng",
          data: null,
        });
        return;
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Xóa đơn hàng thành công",
        data: null,
      });
    } catch (error) {
      console.error("Delete order error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server",
        data: null,
      });
    }
  }

  // Lấy thống kê orders (Admin only)
  async getOrderStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await OrderService.getOrderStats();

      res.status(200).json({
        status: true,
        error: 0,
        message: "Lấy thống kê đơn hàng thành công",
        data: stats,
      });
    } catch (error) {
      console.error("Get order stats error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: "Lỗi server",
        data: null,
      });
    }
  }

  // Tạo payment cho order
  async createPayment(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { paymentMethod, returnUrl, cancelUrl } = req.body;

      // Lấy thông tin order
      const order = await OrderService.getOrderById(orderId);
      if (!order) {
        res.status(404).json({
          status: false,
          error: 404,
          message: "Không tìm thấy đơn hàng",
          data: null,
        });
        return;
      }

      if (order.paymentStatus === "PAID") {
        res.status(400).json({
          status: false,
          error: 400,
          message: "Đơn hàng đã được thanh toán",
          data: null,
        });
        return;
      }

      // Kiểm tra paymentMethod có khớp với order không
      if (order.paymentMethod !== paymentMethod) {
        res.status(400).json({
          status: false,
          error: 400,
          message: `Phương thức thanh toán không khớp. Order yêu cầu: ${order.paymentMethod}`,
          data: null,
        });
        return;
      }

      // Tạo payment record
      const payment = await PaymentService.createPayment({
        orderId: order._id,
        amount: order.finalAmount,
        paymentMethod,
        returnUrl,
        cancelUrl,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      let paymentUrl = "";

      // Tạo payment URL tùy theo phương thức
      if (paymentMethod === "MOMO") {
        try {
          paymentUrl = await PaymentService.createMoMoPayment(payment);
        } catch (error: any) {
          console.error(
            "MoMo payment creation failed:",
            error.response?.data || error.message
          );

          // Uncomment dòng dưới để xem chi tiết lỗi MoMo thay vì dùng mock
          // throw new Error(`MoMo Error: ${error.response?.data?.message || error.message}`);

          // Fallback to mock payment for testing
          paymentUrl = `http://localhost:5000/v1/api/payments/mock?paymentId=${payment._id}&amount=${order.finalAmount}`;
          console.log("🔧 Using mock payment URL for testing:", paymentUrl);
        }
      } else if (paymentMethod === "VNPAY") {
        // TODO: Implement VNPay integration
        throw new Error("VNPay chưa được tích hợp");
      }

      res.status(200).json({
        status: true,
        error: 0,
        message: "Tạo thanh toán thành công",
        data: {
          paymentId: payment._id,
          paymentUrl,
          orderId: order._id,
          orderCode: order.orderCode,
          amount: order.finalAmount,
        },
      });
    } catch (error) {
      console.error("Create payment error:", error);
      res.status(500).json({
        status: false,
        error: 500,
        message: error instanceof Error ? error.message : "Lỗi server",
        data: null,
      });
    }
  }
}

export default new OrderController();
