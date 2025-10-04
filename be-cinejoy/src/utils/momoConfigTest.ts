import momoConfig from "../configs/momoConfig";

/**
 * Test MoMo Configuration
 * This utility helps verify that MoMo configuration is properly set up
 */
export class MoMoConfigTest {
  /**
   * Run all configuration tests
   */
  static runTests(): void {
    console.log("🔍 Testing MoMo Configuration...\n");

    this.testBasicConfig();
    this.testEnvironmentSettings();
    this.testValidation();
    this.testSecurity();

    console.log("\n✅ MoMo Configuration Tests Completed");
  }

  /**
   * Test basic configuration values
   */
  private static testBasicConfig(): void {
    console.log("📋 Basic Configuration:");

    const config = momoConfig.getConfigForLogging();
    console.log(`  Partner Code: ${config.partnerCode}`);
    console.log(`  Environment: ${config.environment}`);
    console.log(`  Endpoint: ${config.endpoint}`);
    console.log(`  IPN URL: ${config.ipnUrl}`);
    console.log(`  Return URL: ${config.returnUrl}`);
    console.log(`  Access Key: ${config.accessKey}`);
    console.log(`  Secret Key: ${config.secretKey}`);
  }

  /**
   * Test environment-specific settings
   */
  private static testEnvironmentSettings(): void {
    console.log("\n🌍 Environment Settings:");

    const environment = momoConfig.getEnvironment();
    const isProduction = momoConfig.isProduction();
    const isSandbox = momoConfig.isSandbox();

    console.log(`  Current Environment: ${environment}`);
    console.log(`  Is Production: ${isProduction}`);
    console.log(`  Is Sandbox: ${isSandbox}`);

    // Test endpoint matches environment
    const endpoint = momoConfig.getEndpoint();
    const expectedProdEndpoint =
      "https://payment.momo.vn/v2/gateway/api/create";
    const expectedSandboxEndpoint =
      "https://test-payment.momo.vn/v2/gateway/api/create";

    if (isProduction && endpoint.includes("test-payment")) {
      console.log("  ⚠️  Warning: Production environment using test endpoint");
    } else if (isSandbox && !endpoint.includes("test-payment")) {
      console.log(
        "  ⚠️  Warning: Sandbox environment using production endpoint"
      );
    } else {
      console.log("  ✅ Endpoint matches environment");
    }
  }

  /**
   * Test configuration validation
   */
  private static testValidation(): void {
    console.log("\n✔️  Configuration Validation:");

    const isConfigured = momoConfig.isConfigured();
    console.log(`  Is Properly Configured: ${isConfigured}`);

    if (!isConfigured) {
      console.log(
        "  ❌ Configuration is incomplete. Please check your .env file."
      );
      console.log(
        "  Required variables: MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY"
      );
    } else {
      console.log("  ✅ All required configuration fields are present");
    }
  }

  /**
   * Test security features
   */
  private static testSecurity(): void {
    console.log("\n🔒 Security Features:");

    const secretKey = momoConfig.getSecretKey();
    const accessKey = momoConfig.getAccessKey();

    // Test that sensitive data is not empty
    if (secretKey && secretKey !== "") {
      console.log("  ✅ Secret Key is set");
    } else {
      console.log("  ❌ Secret Key is missing");
    }

    if (accessKey && accessKey !== "") {
      console.log("  ✅ Access Key is set");
    } else {
      console.log("  ❌ Access Key is missing");
    }

    // Test that logging config masks sensitive data
    const loggingConfig = momoConfig.getConfigForLogging();
    if (
      loggingConfig.secretKey === "***HIDDEN***" ||
      loggingConfig.secretKey === "NOT_SET"
    ) {
      console.log("  ✅ Secret Key is properly masked in logging");
    } else {
      console.log("  ⚠️  Secret Key may not be properly masked");
    }
  }

  /**
   * Quick health check
   */
  static healthCheck(): boolean {
    return momoConfig.isConfigured();
  }

  /**
   * Get configuration summary
   */
  static getConfigSummary(): object {
    return {
      configured: momoConfig.isConfigured(),
      environment: momoConfig.getEnvironment(),
      endpoint: momoConfig.getEndpoint(),
      partnerCode: momoConfig.getPartnerCode(),
      hasAccessKey: !!momoConfig.getAccessKey(),
      hasSecretKey: !!momoConfig.getSecretKey(),
    };
  }
}

// Export for easy testing
export default MoMoConfigTest;
