import Payment, { IPayment } from "../models/Payment";
import Order from "../models/Order";
import crypto from "crypto";
import axios from "axios";
import momoConfig from "../configs/momoConfig";

export interface CreatePaymentData {
  orderId: string;
  amount: number;
  paymentMethod: "MOMO" | "VNPAY";
  returnUrl: string;
  cancelUrl: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface MoMoPaymentRequest {
  partnerCode: string;
  requestId: string;
  amount: number;
  orderId: string;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
  extraData: string;
  requestType: string;
  signature: string;
  lang: string;
  // Optional expiration support (MoMo may accept one of these depending on API version)
  expiredTime?: number; // ms epoch
  validDuration?: number; // seconds
}

export interface MoMoPaymentResponse {
  partnerCode: string;
  requestId: string;
  orderId: string;
  amount: number;
  responseTime: number;
  message: string;
  resultCode: number;
  payUrl?: string;
  deeplink?: string;
  qrCodeUrl?: string;
}

class PaymentService {
  // Tạo payment record
  async createPayment(paymentData: CreatePaymentData): Promise<IPayment> {
    const payment = new Payment({
      orderId: paymentData.orderId,
      paymentMethod: paymentData.paymentMethod,
      amount: paymentData.amount,
      metadata: {
        returnUrl: paymentData.returnUrl,
        cancelUrl: paymentData.cancelUrl,
        ipAddress: paymentData.ipAddress,
        userAgent: paymentData.userAgent,
      },
    });

    return await payment.save();
  }

  // Tạo MoMo payment URL
  async createMoMoPayment(payment: IPayment): Promise<string> {
    try {
      const order = await Order.findById(payment.orderId);
      if (!order) {
        throw new Error("Order không tồn tại");
      }

      const requestId = payment.transactionId!;
      const orderId = order.orderCode;
      const orderInfo = `Thanh toán đơn hàng CineJoy ${orderId}`;
      const amount = payment.amount;
      const extraData = "";
      const requestType = "captureWallet";
      // Set payment expiration to 5 minutes
      const expiredTime = Date.now() + 5 * 60 * 1000; // milliseconds

      // Tạo signature
      const rawSignature = `accessKey=${momoConfig.getAccessKey()}&amount=${amount}&extraData=${extraData}&ipnUrl=${momoConfig.getIpnUrl()}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${momoConfig.getPartnerCode()}&redirectUrl=${
        payment.metadata?.returnUrl
      }&requestId=${requestId}&requestType=${requestType}`;

      const signature = crypto
        .createHmac("sha256", momoConfig.getSecretKey())
        .update(rawSignature)
        .digest("hex");

      const requestBody: MoMoPaymentRequest = {
        partnerCode: momoConfig.getPartnerCode(),
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl: payment.metadata?.returnUrl || "",
        ipnUrl: momoConfig.getIpnUrl(),
        extraData,
        requestType,
        signature,
        lang: "vi",
        expiredTime,
        validDuration: 300,
      };

      console.log("MoMo Request:", JSON.stringify(requestBody, null, 2));

      const response = await axios.post<MoMoPaymentResponse>(
        momoConfig.getEndpoint(),
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      console.log("MoMo Response:", JSON.stringify(response.data, null, 2));

      // Cập nhật payment với response từ MoMo
      await Payment.findByIdAndUpdate(payment._id, {
        $set: {
          gatewayResponse: response.data,
          gatewayTransactionId: response.data.requestId,
        },
      });

      if (response.data.resultCode === 0 && response.data.payUrl) {
        return response.data.payUrl;
      } else {
        throw new Error(`MoMo Error: ${response.data.message}`);
      }
    } catch (error) {
      console.error("MoMo Payment Error:", error);

      // Cập nhật payment status thành failed
      await Payment.findByIdAndUpdate(payment._id, {
        $set: {
          status: "FAILED",
          gatewayResponse: {
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date(),
          },
        },
      });

      throw error;
    }
  }

  // Xử lý MoMo IPN callback
  async handleMoMoCallback(
    callbackData: any
  ): Promise<{ status: string; message: string }> {
    try {
      console.log("MoMo Callback Data:", JSON.stringify(callbackData, null, 2));

      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      } = callbackData;

      // Verify signature
      const rawSignature = `accessKey=${momoConfig.getAccessKey()}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

      const expectedSignature = crypto
        .createHmac("sha256", momoConfig.getSecretKey())
        .update(rawSignature)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Invalid signature:", { signature, expectedSignature });
        return { status: "error", message: "Invalid signature" };
      }

      // Tìm order và payment
      const order = await Order.findOne({ orderCode: orderId });
      if (!order) {
        console.error("Order not found:", orderId);
        return { status: "error", message: "Order not found" };
      }

      const payment = await Payment.findOne({ orderId: order._id });
      if (!payment) {
        console.error("Payment not found for order:", order._id);
        return { status: "error", message: "Payment not found" };
      }

      // Cập nhật payment và order status
      if (resultCode === 0) {
        // Thanh toán thành công
        await Promise.all([
          Payment.findByIdAndUpdate(payment._id, {
            $set: {
              status: "SUCCESS",
              gatewayTransactionId: transId,
              gatewayResponse: callbackData,
            },
          }),
          Order.findByIdAndUpdate(order._id, {
            $set: {
              paymentStatus: "PAID",
              orderStatus: "CONFIRMED",
              "paymentInfo.transactionId": transId,
              "paymentInfo.paymentDate": new Date(),
              "paymentInfo.paymentGatewayResponse": callbackData,
            },
          }),
        ]);

        console.log("Payment success for order:", orderId);
        return { status: "success", message: "Payment processed successfully" };
      } else {
        // Thanh toán thất bại
        await Promise.all([
          Payment.findByIdAndUpdate(payment._id, {
            $set: {
              status: "FAILED",
              gatewayResponse: callbackData,
            },
          }),
          Order.findByIdAndUpdate(order._id, {
            $set: {
              paymentStatus: "FAILED",
              "paymentInfo.paymentGatewayResponse": callbackData,
            },
          }),
        ]);

        console.log("Payment failed for order:", orderId, "Message:", message);
        return { status: "error", message: message || "Payment failed" };
      }
    } catch (error) {
      console.error("MoMo Callback Error:", error);
      return { status: "error", message: "Internal server error" };
    }
  }

  // Lấy payment theo ID
  async getPaymentById(paymentId: string): Promise<IPayment | null> {
    return await Payment.findById(paymentId).populate("orderId");
  }

  // Lấy payment theo orderId
  async getPaymentByOrderId(orderId: string): Promise<IPayment | null> {
    return await Payment.findOne({ orderId }).populate("orderId");
  }

  // Lấy payment theo transactionId
  async getPaymentByTransactionId(
    transactionId: string
  ): Promise<IPayment | null> {
    return await Payment.findOne({ transactionId }).populate("orderId");
  }

  // Cập nhật payment status
  async updatePaymentStatus(
    paymentId: string,
    status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED" | "REFUNDED",
    gatewayResponse?: any
  ): Promise<IPayment | null> {
    const updateData: any = { status };
    if (gatewayResponse) {
      updateData.gatewayResponse = gatewayResponse;
    }

    return await Payment.findByIdAndUpdate(
      paymentId,
      { $set: updateData },
      { new: true }
    ).populate("orderId");
  }

  // Hoàn tiền
  async refundPayment(
    paymentId: string,
    refundAmount: number,
    reason: string
  ): Promise<IPayment | null> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new Error("Payment không tồn tại");
    }

    if (payment.status !== "SUCCESS") {
      throw new Error("Chỉ có thể hoàn tiền cho payment đã thành công");
    }

    if (refundAmount > payment.amount) {
      throw new Error("Số tiền hoàn không được lớn hơn số tiền gốc");
    }

    // TODO: Implement MoMo refund API call here

    const refundTransactionId = `REFUND_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    return await Payment.findByIdAndUpdate(
      paymentId,
      {
        $set: {
          status: "REFUNDED",
          refundInfo: {
            refundAmount,
            refundDate: new Date(),
            refundTransactionId,
            reason,
          },
        },
      },
      { new: true }
    ).populate("orderId");
  }

  // Lấy thống kê payments
  async getPaymentStats(): Promise<{
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    totalAmount: number;
    todayPayments: number;
    todayAmount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalPayments,
      successfulPayments,
      failedPayments,
      totalAmountResult,
      todayStats,
    ] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: "SUCCESS" }),
      Payment.countDocuments({ status: "FAILED" }),
      Payment.aggregate([
        { $match: { status: "SUCCESS" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: {
              $sum: { $cond: [{ $eq: ["$status", "SUCCESS"] }, "$amount", 0] },
            },
          },
        },
      ]),
    ]);

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      totalAmount: totalAmountResult[0]?.total || 0,
      todayPayments: todayStats[0]?.count || 0,
      todayAmount: todayStats[0]?.amount || 0,
    };
  }
}

export default new PaymentService();
