export interface VNPayConfig {
  vnp_TmnCode: string;
  vnp_HashSecret: string;
  vnp_Url: string;
  vnp_ReturnUrl: string;
  vnp_IpnUrl: string;
  vnp_IpAddr?: string;
  environment: "sandbox" | "production";
}

class VNPayConfiguration {
  private readonly config: VNPayConfig;

  constructor() {
    this.config = {
      vnp_TmnCode: process.env.VNPAY_TMN_CODE || "",
      vnp_HashSecret: process.env.VNPAY_HASH_SECRET || "",
      vnp_Url: process.env.VNPAY_URL || this.getDefaultUrl(),
      vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || "http://localhost:5000/v1/api/payments/vnpay/return",
      vnp_IpnUrl: process.env.VNPAY_IPN_URL || "https://9710f2af6929.ngrok-free.app/v1/api/payments/vnpay/callback",
      vnp_IpAddr: process.env.VNPAY_IP_ADDR || "127.0.0.1",
      environment: (process.env.VNPAY_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    };

    this.validateConfig();
  }

  private getDefaultUrl(): string {
    const environment = process.env.VNPAY_ENVIRONMENT || "sandbox";
    return environment === "production"
      ? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
      : "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  }

  private validateConfig(): void {
    const requiredFields = ["vnp_TmnCode", "vnp_HashSecret"];
    const missingFields = requiredFields.filter(
      (field) => !this.config[field as keyof VNPayConfig]
    );

    if (missingFields.length > 0) {
      console.warn(
        `⚠️  VNPay Config Warning: Missing required fields: ${missingFields.join(", ")}`
      );
      console.warn("Please ensure these environment variables are set:");
      missingFields.forEach((field) => {
        console.warn(`  - VNPAY_${field.toUpperCase().replace("VNP_", "")}`);
      });
    }
  }

  public getConfig(): VNPayConfig {
    return { ...this.config };
  }

  public getTmnCode(): string {
    return this.config.vnp_TmnCode;
  }

  public getHashSecret(): string {
    return this.config.vnp_HashSecret;
  }

  public getUrl(): string {
    return this.config.vnp_Url;
  }

  public getReturnUrl(): string {
    return this.config.vnp_ReturnUrl;
  }

  public getIpAddr(): string {
    return this.config.vnp_IpAddr || "127.0.0.1";
  }

  public getEnvironment(): "sandbox" | "production" {
    return this.config.environment;
  }

  public isProduction(): boolean {
    return this.config.environment === "production";
  }

  public isSandbox(): boolean {
    return this.config.environment === "sandbox";
  }

  // Utility method to check if config is properly set up
  public isConfigured(): boolean {
    return !!(this.config.vnp_TmnCode && this.config.vnp_HashSecret);
  }

  // Get config with sensitive data masked for logging
  public getConfigForLogging(): Partial<VNPayConfig> {
    return {
      vnp_TmnCode: this.config.vnp_TmnCode,
      vnp_Url: this.config.vnp_Url,
      vnp_ReturnUrl: this.config.vnp_ReturnUrl,
      vnp_IpAddr: this.config.vnp_IpAddr,
      environment: this.config.environment,
      vnp_HashSecret: this.config.vnp_HashSecret ? "***HIDDEN***" : "NOT_SET",
    };
  }
}

// Export singleton instance
export const vnpayConfig = new VNPayConfiguration();
export default vnpayConfig;
