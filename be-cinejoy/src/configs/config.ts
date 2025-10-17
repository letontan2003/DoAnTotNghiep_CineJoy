require('dotenv').config();
export const JWT_SECRET = process.env.JWT_SECRET as string;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN as `${number}${"s" | "m" | "h" | "d" | "y"}`;
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN as `${number}${"s" | "m" | "h" | "d" | "y"}`;
