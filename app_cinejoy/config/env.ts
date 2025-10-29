// Environment configuration for React Native
const ENV = {
  development: {
    API_URL: 'http://192.168.16.118:5000',
  },
  staging: {
    API_URL: 'https://staging-api.cinejoy.com',
  },
  production: {
    API_URL: 'https://api.cinejoy.com',
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
