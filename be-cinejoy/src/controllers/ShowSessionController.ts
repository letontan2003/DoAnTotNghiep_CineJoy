import { Request, Response } from 'express';
import ShowSessionService from '../services/ShowSessionService';
import { successResponse as createSuccessResponse, errorResponse as createErrorResponse } from '../utils/apiResponse';

// Helper functions for sending responses
const successResponse = (res: Response, statusCode: number, message: string, data?: any) => {
    res.status(statusCode).json(createSuccessResponse(message, data));
};

const errorResponse = (res: Response, statusCode: number, message: string) => {
    res.status(statusCode).json(createErrorResponse(message, statusCode));
};

class ShowSessionController {
    // Get all show sessions
    async getAllShowSessions(req: Request, res: Response) {
        try {
            const sessions = await ShowSessionService.getAllShowSessions();
            successResponse(res, 200, 'Lấy danh sách ca chiếu thành công', sessions);
        } catch (error: unknown) {
            console.error('Lỗi khi lấy danh sách ca chiếu:', error);
            errorResponse(res, 500, 'Lỗi server khi lấy danh sách ca chiếu');
        }
    }

    // Get show session by ID
    async getShowSessionById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const session = await ShowSessionService.getShowSessionById(id);
            
            if (!session) {
                return errorResponse(res, 404, 'Không tìm thấy ca chiếu');
            }
            
            successResponse(res, 200, 'Lấy thông tin ca chiếu thành công', session);
        } catch (error: unknown) {
            console.error('Lỗi khi lấy thông tin ca chiếu:', error);
            errorResponse(res, 500, 'Lỗi server khi lấy thông tin ca chiếu');
        }
    }

    // Create new show session
    async createShowSession(req: Request, res: Response) {
        try {
            const { shiftCode, name, startTime, endTime } = req.body;

            // Validate required fields
            if (!shiftCode || !name || !startTime || !endTime) {
                return errorResponse(res, 400, 'Vui lòng cung cấp đầy đủ thông tin ca chiếu');
            }

            // Check if session name already exists
            const isNameExists = await ShowSessionService.isSessionNameExists(name);
            if (isNameExists) {
                return errorResponse(res, 400, 'Ca chiếu đã tồn tại');
            }

            // Check for overlapping sessions
            const overlappingSessions = await ShowSessionService.getOverlappingSessions(startTime, endTime);
            if (overlappingSessions.length > 0) {
                return errorResponse(res, 400, `Ca chiếu này bị trùng với ca chiếu: ${overlappingSessions.map(s => s.name).join(', ')}`);
            }

            const sessionData = {
                shiftCode,
                name,
                startTime,
                endTime
            };

            const newSession = await ShowSessionService.createShowSession(sessionData);
            successResponse(res, 201, 'Tạo ca chiếu thành công', newSession);
        } catch (error: unknown) {
            console.error('Lỗi khi tạo ca chiếu:', error);
            
            if (error instanceof Error && error.message.includes('validation')) {
                return errorResponse(res, 400, 'Dữ liệu ca chiếu không hợp lệ');
            }
            
            return errorResponse(res, 500, 'Lỗi server khi tạo ca chiếu');
        }
    }

    // Update show session
    async updateShowSession(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { shiftCode, name, startTime, endTime } = req.body;

            // Check if session exists
            const existingSession = await ShowSessionService.getShowSessionById(id);
            if (!existingSession) {
                return errorResponse(res, 404, 'Không tìm thấy ca chiếu');
            }

            // Check if new name already exists (excluding current session)
            if (name) {
                const isNameExists = await ShowSessionService.isSessionNameExists(name, id);
                if (isNameExists) {
                    return errorResponse(res, 400, 'Ca chiếu đã tồn tại');
                }
            }

            // Check for overlapping sessions if time is being updated
            if (startTime || endTime) {
                const checkStartTime = startTime || existingSession.startTime;
                const checkEndTime = endTime || existingSession.endTime;
                
                const overlappingSessions = await ShowSessionService.getOverlappingSessions(checkStartTime, checkEndTime, id);
                if (overlappingSessions.length > 0) {
                    return errorResponse(res, 400, `Ca chiếu này bị trùng với ca chiếu: ${overlappingSessions.map(s => s.name).join(', ')}`);
                }
            }

            const updateData = {
                ...(shiftCode && { shiftCode }),
                ...(name && { name }),
                ...(startTime && { startTime }),
                ...(endTime && { endTime })
            };

            const updatedSession = await ShowSessionService.updateShowSession(id, updateData);
            successResponse(res, 200, 'Cập nhật ca chiếu thành công', updatedSession);
        } catch (error: unknown) {
            console.error('Lỗi khi cập nhật ca chiếu:', error);
            
            if (error instanceof Error && error.message.includes('validation')) {
                return errorResponse(res, 400, 'Dữ liệu ca chiếu không hợp lệ');
            }
            
            return errorResponse(res, 500, 'Lỗi server khi cập nhật ca chiếu');
        }
    }

    // Delete show session
    async deleteShowSession(req: Request, res: Response) {
        try {
            const { id } = req.params;

            // Check if session exists
            const existingSession = await ShowSessionService.getShowSessionById(id);
            if (!existingSession) {
                return errorResponse(res, 404, 'Không tìm thấy ca chiếu');
            }

            const isDeleted = await ShowSessionService.deleteShowSession(id);
            
            if (isDeleted) {
                return successResponse(res, 200, 'Xóa ca chiếu thành công');
            } else {
                return errorResponse(res, 500, 'Không thể xóa ca chiếu');
            }
        } catch (error: unknown) {
            console.error('Lỗi khi xóa ca chiếu:', error);
            return errorResponse(res, 500, 'Lỗi server khi xóa ca chiếu');
        }
    }

    // Get current active session
    async getCurrentActiveSession(req: Request, res: Response) {
        try {
            const activeSession = await ShowSessionService.getCurrentActiveSession();
            
            if (!activeSession) {
                return successResponse(res, 200, 'Hiện tại không có ca chiếu nào đang hoạt động', null);
            }
            
            successResponse(res, 200, 'Lấy ca chiếu đang hoạt động thành công', activeSession);
        } catch (error: unknown) {
            console.error('Lỗi khi lấy ca chiếu đang hoạt động:', error);
            errorResponse(res, 500, 'Lỗi server khi lấy ca chiếu đang hoạt động');
        }
    }

}

export default new ShowSessionController();
