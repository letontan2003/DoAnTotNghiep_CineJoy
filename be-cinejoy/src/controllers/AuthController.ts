import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/AuthMiddleware";
import authService from "../services/AuthService";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.register(req.body);

    if (result.error === 0 && result.data) {
      res.cookie("refreshToken", result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { refreshToken, ...rest } = result.data;
      res.status(200).json({ ...result, data: rest });
      return;
    }
    
    res.status(200).json(result);
    return;

  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: error.message,
      data: null,
    });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu email hoặc mật khẩu",
        data: null,
      });
      return;
    }

    const result = await authService.login(email, password);

    if (result.error === 0 && result.data) {
      res.cookie("refreshToken", result.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { refreshToken, ...rest } = result.data;
      res.status(200).json({ ...result, data: rest });
      return;
    }

    res.status(200).json(result);
    return;

  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: error.message,
      data: null,
    });
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      res.status(401).json({
        status: false,
        error: 1,
        message: "Thiếu refresh token",
        data: null,
      });
      return;
    }

    const result = await authService.refreshAccessToken(refreshToken);
    res.status(200).json(result);
    return;
  } catch (error: any) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: error.message,
      data: null,
    });
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.logout(req.user!._id as string);
    res.clearCookie("refreshToken");
    res.status(200).json(result);
    return;
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: error.message,
      data: null,
    });
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu email",
        data: null,
      });
      return;
    }

    const result = await authService.forgotPassword(email);
    res.status(200).json(result);
    return;
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: error.message,
      data: null,
    });
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu email hoặc mã OTP",
        data: null,
      });
      return;
    }

    const result = await authService.verifyOtp(email, otp);
    res.status(200).json(result);
    return;
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: error.message,
      data: null,
    });
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({
        status: false,
        error: 1,
        message: "Thiếu email hoặc mật khẩu mới",
        data: null,
      });
      return;
    }

    const result = await authService.resetPassword(email, newPassword);
    res.status(200).json(result);
    return;
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: error.message,
      data: null,
    });
  }
};

export const getAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const delay = parseInt(req.headers.delay as string) || 0;
    if (delay > 0 && delay <= 5000) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const result = await authService.getAccount(req.user!._id as string);
    res.status(200).json(result);
    return;
  } catch (error: any) {
    console.error("Get account error:", error);
    res.status(500).json({
      status: false,
      error: -1,
      message: error.message,
      data: null,
    });
  }
};
