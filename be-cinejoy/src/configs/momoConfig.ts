export interface MoMoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  ipnUrl: string;
  returnUrl?: string;
  environment: "sandbox" | "production";
}

class MoMoConfiguration {
  private readonly config: MoMoConfig;

  constructor() {
    this.config = {
      partnerCode: process.env.MOMO_PARTNER_CODE || "MOMO",
      accessKey: process.env.MOMO_ACCESS_KEY || "",
      secretKey: process.env.MOMO_SECRET_KEY || "",
      endpoint: process.env.MOMO_ENDPOINT || this.getDefaultEndpoint(),
      ipnUrl:
        process.env.MOMO_IPN_URL ||
        "http://localhost:8000/api/payments/momo/callback",
      returnUrl:
        process.env.MOMO_RETURN_URL ||
        "https://cinejoy.vercel.app/payment/success",
      environment:
        (process.env.MOMO_ENVIRONMENT as "sandbox" | "production") || "sandbox",
    };

    this.validateConfig();
  }

  private getDefaultEndpoint(): string {
    const environment = process.env.MOMO_ENVIRONMENT || "sandbox";
    return environment === "production"
      ? "https://payment.momo.vn/v2/gateway/api/create"
      : "https://test-payment.momo.vn/v2/gateway/api/create";
  }

  private validateConfig(): void {
    const requiredFields = ["partnerCode", "accessKey", "secretKey"];
    const missingFields = requiredFields.filter(
      (field) => !this.config[field as keyof MoMoConfig]
    );

    if (missingFields.length > 0) {
      console.warn(
        `⚠️  MoMo Config Warning: Missing required fields: ${missingFields.join(
          ", "
        )}`
      );
      console.warn("Please ensure these environment variables are set:");
      missingFields.forEach((field) => {
        console.warn(`  - MOMO_${field.toUpperCase()}`);
      });
    }
  }

  public getConfig(): MoMoConfig {
    return { ...this.config };
  }

  public getPartnerCode(): string {
    return this.config.partnerCode;
  }

  public getAccessKey(): string {
    return this.config.accessKey;
  }

  public getSecretKey(): string {
    return this.config.secretKey;
  }

  public getEndpoint(): string {
    return this.config.endpoint;
  }

  public getIpnUrl(): string {
    return this.config.ipnUrl;
  }

  public getReturnUrl(): string {
    return this.config.returnUrl || "http://localhost:3000/payment/return";
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
    return !!(
      this.config.partnerCode &&
      this.config.accessKey &&
      this.config.secretKey &&
      this.config.partnerCode !== "MOMO"
    );
  }

  // Get config with sensitive data masked for logging
  public getConfigForLogging(): Partial<MoMoConfig> {
    return {
      partnerCode: this.config.partnerCode,
      endpoint: this.config.endpoint,
      ipnUrl: this.config.ipnUrl,
      returnUrl: this.config.returnUrl,
      environment: this.config.environment,
      accessKey: this.config.accessKey
        ? `${this.config.accessKey.substring(0, 8)}***`
        : "NOT_SET",
      secretKey: this.config.secretKey ? "***HIDDEN***" : "NOT_SET",
    };
  }
}

// Export singleton instance
export const momoConfig = new MoMoConfiguration();
export default momoConfig;
