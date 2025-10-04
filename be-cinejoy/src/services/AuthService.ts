import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { User } from "../models/User";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from "../configs/config";
import { sendResetPasswordEmail, sendWelcomeEmail } from "../utils/emailService";

const generateAccessToken = (userId: string): string => {
  const payload = { id: userId };
  const secret: Secret = JWT_SECRET;
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
  };

  return jwt.sign(payload, secret, options);
};

const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
};

const register = async (body: any) => {
    let { email, password, avatar, role, ...rest } = body;
  
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return {
        status: false,
        error: 1,
        message: "Email đã tồn tại. Vui lòng sử dụng email khác",
        data: null,
      };
    }

    if (!avatar) {
      avatar = "https://res.cloudinary.com/dd1vwmybp/image/upload/v1752052447/cinejoy/izdwmlk2mca4hsdy3vgl.png";
    }

    if (!role) {
      role = "USER";
    }
  
    const user = await User.create({
      ...rest,
      email,
      password,
      avatar,
      role,
    });

    const emailResult = await sendWelcomeEmail(user.email, user.fullName);
  
    if (!emailResult.status) {
      console.log("Lỗi gửi email chào mừng:", emailResult.message);
    }

    const { password: _, ...userWithoutPassword } = user.toObject();

    const accessToken = generateAccessToken(user._id?.toString() || '');
    const refreshToken = generateRefreshToken(user._id?.toString() || '');
  
    return {
      status: true,
      error: 0,
      message: "Đăng ký thành công",
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
    };
  };
  

const login = async (email: string, password: string) => {
  const rawUser = await User.findOne({ email });
  if (!rawUser || !rawUser.isActive) {
    return {
      status: false,
      error: 1,
      message: "Tài khoản hoặc mật khẩu không chính xác",
      data: null,
    };
  }
  
  const isMatch = await rawUser.comparePassword(password);

  if (!isMatch) {
    return {
      status: false,
      error: 1,
      message: "Tài khoản hoặc mật khẩu không chính xác",
      data: null,
    };
  }
  const accessToken = generateAccessToken(rawUser._id?.toString() || '');
  const refreshToken = generateRefreshToken(rawUser._id?.toString() || '');

  const { password: _, ...userWithoutPassword } = rawUser.toObject();

  return {
    status: true,
    error: 0,
    message: "Đăng nhập thành công",
    data: {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    },
  };
};

const refreshAccessToken = async (refreshToken: string) => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: string };
    
    const rawUser = await User.findById(decoded.id);
    if (!rawUser || !rawUser.isActive) {
      return {
        status: false,
        error: 1,
        message: "Người dùng không tồn tại hoặc bị khóa",
        data: null,
      };
    }

    const newAccessToken = generateAccessToken(rawUser._id?.toString() || '');

    return {
      status: true,
      error: 0,
      message: "Làm mới access token thành công",
      data: {
        accessToken: newAccessToken,
      },
    };
  } catch {
    return {
      status: false,
      error: 1,
      message: "Refresh token không hợp lệ hoặc đã hết hạn",
      data: null,
    };
  }
};

const logout = async (userId: string) => {
  return {
    status: true,
    error: 0,
    message: "Đăng xuất thành công",
    data: null,
  };
};

const getAccount = async (userId: string) => {
  const rawUser = await User.findById(userId);
  if (!rawUser) {
    return {
      status: false,
      error: 1,
      message: "Không tìm thấy tài khoản",
      data: null,
    };
  }

  const { password, ...userWithoutPassword } = rawUser.toObject();

  return {
    status: true,
    error: 0,
    message: "Lấy thông tin tài khoản thành công",
    data: {
      user: userWithoutPassword
    },
  };
};

const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    return {
      status: false,
      error: 1,
      message: "Email không tồn tại trong hệ thống",
      data: null,
    };
  };

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
  await user.save();

  const emailResult = await sendResetPasswordEmail(
    user.email,
    user.fullName,
    otp
  );

  if (!emailResult.status) {
    return {
      status: false,
      error: -1,
      message: "Lỗi khi gửi email: " + emailResult.message,
      data: null,
    };
  }

  return {
    status: true,
    error: 0,
    message: "Đã gửi OTP đến email của bạn",
    data: null,
  };
};

const verifyOtp = async (email: string, otp: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    return {
      status: false,
      error: 1,
      message: "Email không tồn tại trong hệ thống",
      data: null,
    };
  }

  if (
    !user.otp ||
    !user.otpExpires ||
    user.otp !== otp ||
    user.otpExpires.getTime() < Date.now()
  ) {
    return {
      status: false,
      error: 1,
      message: "Mã xác nhận không hợp lệ hoặc đã hết hạn",
      data: null,
    };
  }

  return {
    status: true,
    error: 0,
    message: "Xác minh OTP thành công",
    data: null,
  };
};

const resetPassword = async (email: string, newPassword: string) => {
    const rawUser = await User.findOne({ email });
    if (!rawUser) {
        return {
          status: false,
          error: 1,
          message: "Email không tồn tại trong hệ thống",
          data: null,
        };
    }

    rawUser.password = newPassword;
    rawUser.otp = undefined;
    rawUser.otpExpires = undefined;
    await rawUser.save();

    return {
        status: true,
        error: 0,
        message: "Đặt lại mật khẩu thành công",
        data: null,
    };
};  

export default {
  register,
  login,
  refreshAccessToken,
  logout,
  getAccount,
  forgotPassword,
  verifyOtp,
  resetPassword,
};
