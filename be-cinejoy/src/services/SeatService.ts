import Seat, { ISeat } from '../models/Seat';
import Room from '../models/Room';

class SeatService {
    // Get all seats with room information
    async getAllSeats(): Promise<ISeat[]> {
        return await Seat.find()
            .populate({
                path: 'room',
                select: 'name theater capacity',
                populate: {
                    path: 'theater',
                    select: 'name address'
                }
            })
            .sort({ room: 1, row: 1, number: 1 });
    }

    // Get seats by room
    async getSeatsByRoom(roomId: string): Promise<ISeat[]> {
        return await Seat.find({ room: roomId })
            .sort({ row: 1, number: 1 });
    }

    // Get seat by ID
    async getSeatById(seatId: string): Promise<ISeat | null> {
        return await Seat.findById(seatId)
            .populate({
                path: 'room',
                select: 'name theater capacity',
                populate: {
                    path: 'theater',
                    select: 'name address'
                }
            });
    }

    // Create new seat
    async createSeat(seatData: Partial<ISeat>): Promise<ISeat> {
        const seat = new Seat(seatData);
        return await seat.save();
    }

    // Create multiple seats at once
    async createMultipleSeats(seatsData: Partial<ISeat>[]): Promise<ISeat[]> {
        // For bulk creation, we assume seats have been pre-deleted
        // No need to check for existing seats as this is handled by the calling function
        console.log(`Creating ${seatsData.length} seats using insertMany...`);
        
        try {
            return await Seat.insertMany(seatsData) as ISeat[];
        } catch (error: any) {
            console.error('insertMany error:', error);
            if (error.code === 11000) {
                // Duplicate key error - some seats still exist
                console.error('Duplicate key details:', error.writeErrors);
                
                // Extract seatId from writeErrors
                let duplicateSeatId = 'unknown';
                if (error.writeErrors && error.writeErrors.length > 0) {
                    const firstError = error.writeErrors[0];
                    if (firstError.err && firstError.err.keyValue) {
                        duplicateSeatId = firstError.err.keyValue.seatId || 'unknown';
                    }
                }
                
                throw new Error(`Ghế ${duplicateSeatId} đã tồn tại trong phòng này. Vui lòng đảm bảo ghế cũ đã được xóa hoàn toàn.`);
            }
            throw error;
        }
    }

    // Update seat
    async updateSeat(seatId: string, updateData: Partial<ISeat>): Promise<ISeat | null> {
        return await Seat.findByIdAndUpdate(
            seatId,
            updateData,
            { new: true, runValidators: true }
        );
    }

    // Delete seat
    async deleteSeat(seatId: string): Promise<boolean> {
        const deletedSeat = await Seat.findByIdAndDelete(seatId);
        return !!deletedSeat;
    }

    // Delete all seats in a room
    async deleteAllSeatsInRoom(roomId: string): Promise<boolean> {
        console.log(`🗑️ Deleting all seats in room: ${roomId}`);
        
        // First, count existing seats
        const existingCount = await Seat.countDocuments({ room: roomId });
        console.log(`📊 Found ${existingCount} seats to delete in room ${roomId}`);
        
        if (existingCount === 0) {
            console.log('✅ No seats to delete');
            return true;
        }
        
        // Delete all seats
        const result = await Seat.deleteMany({ room: roomId });
        console.log(`🗑️ Deleted ${result.deletedCount} seats from room ${roomId}`);
        
        return result.deletedCount > 0;
    }

    // Check if seat ID exists in room
    async isSeatIdExists(roomId: string, seatId: string, excludeSeatId?: string): Promise<boolean> {
        const query: any = { room: roomId, seatId };
        
        if (excludeSeatId) {
            query._id = { $ne: excludeSeatId };
        }
        
        const existingSeat = await Seat.findOne(query);
        return !!existingSeat;
    }

    // Generate seat layout for a room
    async generateSeatLayout(roomId: string, rows: string[], seatsPerRow: number[], seatTypes: { [key: string]: string } = {}): Promise<ISeat[]> {
        const room = await Room.findById(roomId);
        if (!room) {
            throw new Error('Phòng chiếu không tồn tại');
        }

        const seats: Partial<ISeat>[] = [];
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const seatCount = seatsPerRow[i] || seatsPerRow[0];
            
            for (let j = 1; j <= seatCount; j++) {
                const seatId = `${row}${j}`;
                const seatType = seatTypes[seatId] || 'normal';
                
                // Calculate price based on seat type
                let price = 75000; // Base price
                switch (seatType) {
                    case 'vip':
                        price = 100000;
                        break;
                    case 'couple':
                        price = 150000;
                        break;
                }
                
                seats.push({
                    seatId,
                    room: roomId as any,
                    row,
                    number: j,
                    type: seatType as any,
                    price,
                    status: 'available',
                    position: {
                        x: j - 1,
                        y: i
                    }
                });
            }
        }
        
        return await this.createMultipleSeats(seats);
    }

    // Get seat statistics for a room
    async getSeatStatistics(roomId: string) {
        const stats = await Seat.aggregate([
            { $match: { room: roomId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    available: {
                        $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
                    },
                    maintenance: {
                        $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] }
                    },
                    blocked: {
                        $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] }
                    },
                    normal: {
                        $sum: { $cond: [{ $eq: ['$type', 'normal'] }, 1, 0] }
                    },
                    vip: {
                        $sum: { $cond: [{ $eq: ['$type', 'vip'] }, 1, 0] }
                    },
                    couple: {
                        $sum: { $cond: [{ $eq: ['$type', 'couple'] }, 1, 0] }
                    }
                }
            }
        ]);
        
        return stats[0] || {
            total: 0,
            available: 0,
            maintenance: 0,
            blocked: 0,
            normal: 0,
            vip: 0,
            couple: 0
        };
    }

     // Lấy danh sách các loại ghế duy nhất từ database
     async getUniqueSeatTypes(): Promise<string[]> {
        const uniqueTypes = await Seat.distinct('type');
        return uniqueTypes.sort();
    }


}

 


export default new SeatService();
