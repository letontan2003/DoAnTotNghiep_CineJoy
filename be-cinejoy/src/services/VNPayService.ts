import crypto from "crypto";
import { vnpayConfig } from "../configs/vnpayConfig";
import { IPayment } from "../models/Payment";
import { VNPay, ProductCode, VnpLocale, dateFormat, ignoreLogger } from "vnpay";

export interface VNPayPaymentRequest {
  vnp_Amount: number;
  vnp_Command: string;
  vnp_CreateDate: string;
  vnp_CurrCode: string;
  vnp_IpAddr: string;
  vnp_Locale: string;
  vnp_OrderInfo: string;
  vnp_OrderType: string;
  vnp_ReturnUrl: string;
  vnp_TmnCode: string;
  vnp_TxnRef: string;
  vnp_Version: string;
  vnp_SecureHash: string;
}

export interface VNPayPaymentResponse {
  vnp_Amount: string;
  vnp_BankCode: string;
  vnp_BankTranNo: string;
  vnp_CardType: string;
  vnp_OrderInfo: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_SecureHash: string;
  vnp_TmnCode: string;
  vnp_TransactionNo: string;
  vnp_TxnRef: string;
}

export class VNPayService {
  /**
   * Tạo URL thanh toán VNPay sử dụng SDK
   */
  static async createVNPayPayment(payment: IPayment): Promise<string> {
    try {
      const config = vnpayConfig.getConfig();
      
      if (!vnpayConfig.isConfigured()) {
        throw new Error("VNPay chưa được cấu hình đầy đủ");
      }
      
      // Debug config

      const orderId = payment.orderId;
      const amount = payment.amount;
      const orderInfo = `Thanh toan don hang CineJoy ${orderId}`;
      

      // Tạo VNPay instance với SDK
      const vnpay = new VNPay({
        tmnCode: config.vnp_TmnCode,
        secureSecret: config.vnp_HashSecret,
        vnpayHost: 'https://sandbox.vnpayment.vn',
        testMode: true,
        loggerFn: ignoreLogger,
      });

      // Tạo ngày hết hạn (ngày mai)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Tạo payment URL sử dụng SDK
      const vnpayResponse = await vnpay.buildPaymentUrl({
        vnp_Amount: amount,
        vnp_IpAddr: config.vnp_IpAddr || '127.0.0.1',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: ProductCode.Other,
        vnp_ReturnUrl: config.vnp_ReturnUrl,
        vnp_Locale: VnpLocale.VN,
        vnp_CreateDate: dateFormat(new Date()),
        vnp_ExpireDate: dateFormat(tomorrow),
      });

      
      return vnpayResponse;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Xử lý callback từ VNPay sử dụng SDK
   */
  static async handleVNPayCallback(callbackData: any): Promise<{ status: string; message: string }> {
    try {

      const {
        vnp_TxnRef,
        vnp_ResponseCode,
        vnp_TransactionNo,
        vnp_Amount,
        vnp_SecureHash,
        ...otherParams
      } = callbackData;

      // Tạo VNPay instance để validate hash
      const config = vnpayConfig.getConfig();
      const vnpay = new VNPay({
        tmnCode: config.vnp_TmnCode,
        secureSecret: config.vnp_HashSecret,
        vnpayHost: 'https://sandbox.vnpayment.vn',
        testMode: true,
        loggerFn: ignoreLogger,
      });

      // Validate hash bằng SDK
      const isValidHash = vnpay.verifyReturnUrl(callbackData);
      if (!isValidHash) {
        return { status: "error", message: "Invalid secure hash" };
      }

      // Kiểm tra response code
      if (vnp_ResponseCode === "00") {
        // Thanh toán thành công
        return { status: "success", message: "Payment processed successfully" };
      } else {
        // Thanh toán thất bại
        return { status: "failed", message: "Payment failed" };
      }
    } catch (error) {
      console.error("VNPay callback processing error:", error);
      return { status: "error", message: "Callback processing failed" };
    }
  }

  /**
   * Sắp xếp object theo alphabet
   */
  private static sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    
    keys.forEach(key => {
      sorted[key] = obj[key];
    });
    
    return sorted;
  }

  /**
   * Tạo query string từ object
   */
  private static createQueryString(obj: any): string {
    return Object.keys(obj)
      .map(key => `${key}=${encodeURIComponent(obj[key])}`)
      .join('&');
  }

  /**
   * Tạo secure hash cho VNPay
   */
  private static createSecureHash(queryString: string): string {
    const config = vnpayConfig.getConfig();
    const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
    hmac.update(queryString, 'utf8');
    return hmac.digest('hex');
  }

  /**
   * Tạo query string cho hash (không encode)
   */
  private static createHashQueryString(obj: any): string {
    return Object.keys(obj)
      .map(key => `${key}=${obj[key]}`)
      .join('&');
  }

  /**
   * Validate secure hash từ callback
   */
  private static validateSecureHash(callbackData: any): boolean {
    try {
      const { vnp_SecureHash, ...paramsWithoutHash } = callbackData;
      const sortedParams = this.sortObject(paramsWithoutHash);
      const hashQueryString = this.createHashQueryString(sortedParams); // Không encode cho hash
      const expectedHash = this.createSecureHash(hashQueryString);
      
      return vnp_SecureHash === expectedHash;
    } catch (error) {
      console.error("Hash validation error:", error);
      return false;
    }
  }

  /**
   * Kiểm tra trạng thái cấu hình VNPay
   */
  static getConfigStatus(): any {
    return {
      configured: vnpayConfig.isConfigured(),
      environment: vnpayConfig.getEnvironment(),
      config: vnpayConfig.getConfigForLogging(),
    };
  }
}

export default VNPayService;
