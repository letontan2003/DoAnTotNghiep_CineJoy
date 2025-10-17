import ShowSession, { IShowSession } from '../models/ShowSession';

class ShowSessionService {
    // Get all show sessions
    async getAllShowSessions(): Promise<IShowSession[]> {
        return await ShowSession.find().sort({ startTime: 1 });
    }

    // Get show session by ID
    async getShowSessionById(sessionId: string): Promise<IShowSession | null> {
        return await ShowSession.findById(sessionId);
    }

    // Create new show session
    async createShowSession(sessionData: Partial<IShowSession>): Promise<IShowSession> {
        const session = new ShowSession(sessionData);
        return await session.save();
    }

    // Update show session
    async updateShowSession(sessionId: string, updateData: Partial<IShowSession>): Promise<IShowSession | null> {
        return await ShowSession.findByIdAndUpdate(
            sessionId,
            updateData,
            { new: true, runValidators: true }
        );
    }

    // Delete show session
    async deleteShowSession(sessionId: string): Promise<boolean> {
        const deletedSession = await ShowSession.findByIdAndDelete(sessionId);
        return !!deletedSession;
    }

    // Check if show session name already exists
    async isSessionNameExists(sessionName: string, excludeSessionId?: string): Promise<boolean> {
        const query: any = { name: sessionName };
        
        if (excludeSessionId) {
            query._id = { $ne: excludeSessionId };
        }
        
        const existingSession = await ShowSession.findOne(query);
        return !!existingSession;
    }

    // Get active show session based on current time
    async getCurrentActiveSession(): Promise<IShowSession | null> {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        
        // Tìm ca chiếu đang hoạt động
        const activeSession = await ShowSession.findOne({
            startTime: { $lte: currentTime },
            endTime: { $gte: currentTime }
        });

        // Nếu không tìm thấy, kiểm tra ca đêm qua ngày (VD: 20:30 - 00:00)
        if (!activeSession) {
            const currentHour = now.getHours();
            
            // Nếu hiện tại là 0h sáng, có thể thuộc ca đêm qua ngày
            if (currentHour === 0) {
                return await ShowSession.findOne({
                    startTime: { $gte: '20:00' }, // Bắt đầu từ 20h trở đi
                    endTime: '00:00'              // Kết thúc lúc 0h
                });
            }
        }
        
        return activeSession;
    }

    // Get show sessions that overlap with given time range
    // So sánh theo phút để xử lý chính xác ca qua ngày (ví dụ 20:30 -> 00:00)
    async getOverlappingSessions(startTime: string, endTime: string, excludeSessionId?: string): Promise<IShowSession[]> {
        const filter: any = {};
        if (excludeSessionId) {
            filter._id = { $ne: excludeSessionId };
        }

        const sessions = await ShowSession.find(filter);

        const toMinutes = (time: string): number => {
            const [h, m] = time.split(":").map((v) => parseInt(v, 10));
            return h * 60 + m;
        };

        const newStart = toMinutes(startTime);
        let newEnd = toMinutes(endTime);
        // Nếu end <= start, coi như qua ngày => cộng 24h vào end
        if (newEnd <= newStart) newEnd += 24 * 60;

        const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => {
            return aStart < bEnd && aEnd > bStart;
        };

        const result: IShowSession[] = [];
        for (const s of sessions) {
            let existStart = toMinutes(s.startTime);
            let existEnd = toMinutes(s.endTime);
            if (existEnd <= existStart) existEnd += 24 * 60; // ca qua ngày

            // Kiểm tra chồng lấn với cả hai mốc dịch chuyển 24h để bao hết các trường hợp
            const isOverlap =
                overlaps(newStart, newEnd, existStart, existEnd) ||
                overlaps(newStart, newEnd, existStart + 24 * 60, existEnd + 24 * 60) ||
                overlaps(newStart + 24 * 60, newEnd + 24 * 60, existStart, existEnd);

            if (isOverlap) {
                result.push(s);
            }
        }

        return result;
    }

}

export default new ShowSessionService();
