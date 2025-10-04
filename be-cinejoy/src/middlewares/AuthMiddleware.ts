import { Request, Response, NextFunction } from "express";
import { IUser, User } from "../models/User";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        status: false,
        error: -1,
        message: "Không tìm thấy token xác thực",
        data: null,
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

    const user: IUser | null = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({
        status: false,
        error: -1,
        message: "Người dùng không tồn tại",
        data: null,
      });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({
        status: false,
        error: -1,
        message: "Tài khoản đã bị vô hiệu hóa",
        data: null,
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      status: false,
      error: -1,
      message: "Token không hợp lệ hoặc đã hết hạn",
      data: null,
    });
    return;
  }
};
