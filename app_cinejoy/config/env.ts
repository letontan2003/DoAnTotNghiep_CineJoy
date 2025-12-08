// Environment configuration for React Native
const ENV = {
  development: {
    API_URL: "http://192.168.1.11:5000",
    WEB_PAYMENT_SUCCESS_URL: "http://192.168.1.11:3000/payment/success",
    WEB_PAYMENT_CANCEL_URL: "http://192.168.1.11:3000/payment/cancel",
    WEB_BOOKING_HISTORY_URL: "http://192.168.1.11:3000/booking-history",
    APP_PAYMENT_SUCCESS_URL: "cinejoy://payment/success",
    APP_PAYMENT_CANCEL_URL: "cinejoy://payment/cancel",
  },
  staging: {
    API_URL: "https://staging-api.cinejoy.com",
    WEB_PAYMENT_SUCCESS_URL: "https://staging.cinejoy.com/payment/success",
    WEB_PAYMENT_CANCEL_URL: "https://staging.cinejoy.com/payment/cancel",
    WEB_BOOKING_HISTORY_URL: "https://staging.cinejoy.com/booking-history",
    APP_PAYMENT_SUCCESS_URL: "cinejoy://payment/success",
    APP_PAYMENT_CANCEL_URL: "cinejoy://payment/cancel",
  },
  production: {
    API_URL: "https://api-cinejoy.onrender.com",
    WEB_PAYMENT_SUCCESS_URL: "https://cinejoy.vercel.app/payment/success",
    WEB_PAYMENT_CANCEL_URL: "https://cinejoy.vercel.app/payment/cancel",
    WEB_BOOKING_HISTORY_URL: "https://cinejoy.vercel.app/booking-history",
    APP_PAYMENT_SUCCESS_URL: "cinejoy://payment/success",
    APP_PAYMENT_CANCEL_URL: "cinejoy://payment/cancel",
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
