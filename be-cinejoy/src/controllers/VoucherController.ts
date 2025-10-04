import { Request, Response, NextFunction } from "express";
import VoucherService from "../services/VoucherService";
import { AuthenticatedRequest } from "../middlewares/AuthMiddleware";
const voucherService = new VoucherService();

export default class VoucherController {
    async getVouchers(req: Request, res: Response): Promise<void> {
        try {
            const vouchers = await voucherService.getVouchers();
            res.status(200).json(vouchers);
        } catch (error) {
            res.status(500).json({ message: "Error fetching vouchers", error });
        }
    }

    async getVoucherById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const voucher = await voucherService.getVoucherById(id);
            if (!voucher) {
                res.status(404).json({ message: "Voucher not found" });
                return;
            }
            res.status(200).json(voucher);
        } catch (error) {
            res.status(500).json({ message: "Error fetching voucher", error });
        }
    }

    async addVoucher(req: Request, res: Response): Promise<void> {
        try {
            const body = req.body as any;

            // ========= Map input to new structure =========
            // Header fields
            const name = body.name;
            const promotionalCodeRaw = body.promotionalCode || body.code;
            const promotionalCode = typeof promotionalCodeRaw === 'string' ? promotionalCodeRaw.trim().toUpperCase() : undefined;
            const description = body.description ?? body.headerDescription;
            const startDate = body.startDate ?? body.validityPeriod?.startDate;
            const endDate = body.endDate ?? body.validityPeriod?.endDate;
            const status = body.status ?? 'hoạt động';

            // Lines: optional, do not auto-create from legacy anymore
            const lines = Array.isArray(body.lines) ? body.lines : [];

            // ========= Validations =========
            if (!name) {
                res.status(400).json({ message: 'Thiếu tên khuyến mãi' });
                return;
            }
            if (!startDate || !endDate) {
                res.status(400).json({ message: 'Thiếu startDate/endDate cho voucher' });
                return;
            }
            if (!promotionalCode) {
                res.status(400).json({ message: 'Thiếu promotionalCode' });
                return;
            }
            // Lines không bắt buộc khi tạo header

            // Build payload
            const payload = {
                name,
                description,
                promotionalCode,
                startDate,
                endDate,
                status,
                lines,
            } as any;

            const newVoucher = await voucherService.addVoucher(payload);
            res.status(201).json(newVoucher);
        } catch (error) {
            const message = (error as any)?.message || 'Error adding voucher';
            res.status(500).json({ message, error });
        }
    }

    async updateVoucher(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const updatedVoucher = await voucherService.updateVoucher(id, req.body);
            if (!updatedVoucher) {
                res.status(404).json({ message: "Voucher not found" });
                return;
            }
            res.status(200).json(updatedVoucher);
        } catch (error) {
            res.status(500).json({ message: "Error updating voucher", error });
        }
    }

    async deleteVoucher(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const deletedVoucher = await voucherService.deleteVoucher(id);
            if (!deletedVoucher) {
                res.status(404).json({ message: "Voucher not found" });
                return;
            }
            res.status(200).json({ message: "Voucher deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Error deleting voucher", error });
        }
    }

    async getMyVouchers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try { 
            const vouchers = await voucherService.getUserVouchers(req.user!._id as string);
            res.json({
                status: true,
                error: 0,
                message: "Lấy danh sách voucher thành công",
                data: vouchers
            });
        } catch (err) {
            res.status(500).json({
                status: false,
                error: 1,
                message: "Lỗi lấy voucher của bạn!",
                data: null
            });
        }
    };

    async addPromotionLine(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const lineData = req.body;
            
            // Validation
            if (!lineData.promotionType) {
                res.status(400).json({ 
                    status: false, 
                    error: 1, 
                    message: "Thiếu promotionType", 
                    data: null 
                });
                return;
            }

            if (!lineData.startDate || !lineData.endDate) {
                res.status(400).json({ 
                    status: false, 
                    error: 1, 
                    message: "Thiếu startDate hoặc endDate", 
                    data: null 
                });
                return;
            }

            const updatedVoucher = await voucherService.addPromotionLine(id, lineData);
            if (!updatedVoucher) {
                res.status(404).json({ 
                    status: false, 
                    error: 1, 
                    message: "Voucher không tồn tại", 
                    data: null 
                });
                return;
            }

            res.json({
                status: true,
                error: 0,
                message: "Thêm chi tiết khuyến mãi thành công",
                data: updatedVoucher
            });
        } catch (error: any) {
            res.status(500).json({
                status: false,
                error: 1,
                message: error.message || "Lỗi thêm chi tiết khuyến mãi",
                data: null
            });
        }
    }

    async updatePromotionLine(req: Request, res: Response): Promise<void> {
        const { id, lineIndex } = req.params;
        try {
            const lineData = req.body;
            
            // Validation
            if (!lineData.promotionType) {
                res.status(400).json({ 
                    status: false, 
                    error: 1, 
                    message: "Thiếu promotionType", 
                    data: null 
                });
                return;
            }

            if (!lineData.startDate || !lineData.endDate) {
                res.status(400).json({ 
                    status: false, 
                    error: 1, 
                    message: "Thiếu startDate hoặc endDate", 
                    data: null 
                });
                return;
            }

            const index = parseInt(lineIndex);
            if (isNaN(index) || index < 0) {
                res.status(400).json({ 
                    status: false, 
                    error: 1, 
                    message: "Line index không hợp lệ", 
                    data: null 
                });
                return;
            }

            const updatedVoucher = await voucherService.updatePromotionLine(id, index, lineData);
            if (!updatedVoucher) {
                res.status(404).json({ 
                    status: false, 
                    error: 1, 
                    message: "Voucher hoặc line không tồn tại", 
                    data: null 
                });
                return;
            }

            res.json({
                status: true,
                error: 0,
                message: "Cập nhật chi tiết khuyến mãi thành công",
                data: updatedVoucher
            });
        } catch (error: any) {
            res.status(500).json({
                status: false,
                error: 1,
                message: error.message || "Lỗi cập nhật chi tiết khuyến mãi",
                data: null
            });
        }
    }

    async deletePromotionLine(req: Request, res: Response): Promise<void> {
        const { id, lineIndex } = req.params;
        try {
            const index = parseInt(lineIndex);
            if (isNaN(index) || index < 0) {
                res.status(400).json({ 
                    status: false, 
                    error: 1, 
                    message: "Line index không hợp lệ", 
                    data: null 
                });
                return;
            }

            const updatedVoucher = await voucherService.deletePromotionLine(id, index);
            if (!updatedVoucher) {
                res.status(404).json({ 
                    status: false, 
                    error: 1, 
                    message: "Voucher hoặc line không tồn tại", 
                    data: null 
                });
                return;
            }

            res.json({
                status: true,
                error: 0,
                message: "Xóa chi tiết khuyến mãi thành công",
                data: updatedVoucher
            });
        } catch (error: any) {
            res.status(500).json({
                status: false,
                error: 1,
                message: error.message || "Lỗi xóa chi tiết khuyến mãi",
                data: null
            });
        }
    }

    async redeemVoucher(req: any, res: any) {
        try {
            const userId = req.user!._id as string;
            const { voucherId, detailId } = req.body;
            if (!voucherId) {
                return res.status(400).json({ status: false, error: 1, message: "Thiếu voucherId", data: null });
            }
            const userVoucher = await voucherService.redeemVoucher(userId, { voucherId, detailId });
            res.json({
                status: true,
                error: 0,
                message: "Đổi voucher thành công",
                data: userVoucher
            });
        } catch (err: any) {
            res.status(400).json({
                status: false,
                error: 1,
                message: err.message || "Lỗi đổi voucher",
                data: null
            });
        }
    }
}