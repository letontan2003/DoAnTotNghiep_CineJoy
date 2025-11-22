// Environment configuration for React Native
const ENV = {
  development: {
    API_URL: "http://192.168.1.12:5000",
    WEB_PAYMENT_SUCCESS_URL: "http://192.168.1.12:3000/payment/success",
    WEB_PAYMENT_CANCEL_URL: "http://192.168.1.12:3000/payment/cancel",
    WEB_BOOKING_HISTORY_URL: "http://192.168.1.12:3000/booking-history",
  },
  staging: {
    API_URL: "https://staging-api.cinejoy.com",
    WEB_PAYMENT_SUCCESS_URL: "https://staging.cinejoy.com/payment/success",
    WEB_PAYMENT_CANCEL_URL: "https://staging.cinejoy.com/payment/cancel",
    WEB_BOOKING_HISTORY_URL: "https://staging.cinejoy.com/booking-history",
  },
  production: {
    API_URL: "https://api.cinejoy.com",
    WEB_PAYMENT_SUCCESS_URL: "https://cinejoy.vn/payment/success",
    WEB_PAYMENT_CANCEL_URL: "https://cinejoy.vn/payment/cancel",
    WEB_BOOKING_HISTORY_URL: "https://cinejoy.vn/booking-history",
  },
};

const getEnv = () => {
  // For React Native, you can use __DEV__ to detect development mode
  if (__DEV__) {
    return ENV.development;
  }
  // You can add more logic here to detect staging/production
  return ENV.production;
};

export const config = getEnv();
export default config;
