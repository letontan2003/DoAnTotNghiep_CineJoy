import Room, { IRoom } from '../models/Room';
import Seat from '../models/Seat';
import mongoose from 'mongoose';

class RoomService {
    // Get all rooms with theater information
    async getAllRooms(): Promise<IRoom[]> {
        return await Room.find()
            .populate('theater', 'name address location')
            .populate({
                path: 'seats',
                select: 'seatId type status price'
            })
            .sort({ createdAt: -1 });
    }

    // Get rooms by theater
    async getRoomsByTheater(theaterId: string): Promise<IRoom[]> {
        return await Room.find({ theater: theaterId })
            .populate({
                path: 'seats',
                select: 'seatId type status price'
            })
            .sort({ name: 1 });
    }

    // Get room by ID
    async getRoomById(roomId: string): Promise<IRoom | null> {
        return await Room.findById(roomId)
            .populate('theater', 'name address location')
            .populate({
                path: 'seats',
                select: 'seatId row number type status price position'
            });
    }

    // Create new room with optional seat layout
    async createRoom(roomData: Partial<IRoom> & { 
        seatLayout?: { 
            rows: number; 
            cols: number; 
            seats: { [key: string]: { type: 'normal' | 'vip' | 'couple' | '4dx'; status: 'available' | 'maintenance' } } 
        } 
    }): Promise<IRoom> {
        const { seatLayout, ...roomDataOnly } = roomData;
        
        // Add seatLayout structure to room data
        if (seatLayout) {
            (roomDataOnly as any).seatLayout = {
                rows: seatLayout.rows,
                cols: seatLayout.cols
            };
        }
        
        const room = new Room(roomDataOnly);
        const savedRoom = await room.save();

        // Auto-create seats if layout is provided
        if (seatLayout) {
            console.log('🎯 SeatLayout provided, calling generateSeatsForRoom...');
            console.log('SeatLayout details:', {
                rows: seatLayout.rows,
                cols: seatLayout.cols,
                seatsCount: Object.keys(seatLayout.seats).length
            });
            await this.generateSeatsForRoom(savedRoom._id, seatLayout);
        } else {
            console.log('⚠️ No seatLayout provided, skipping seat creation');
        }

        return savedRoom;
    }

    // Generate seats for room based on layout
    private async generateSeatsForRoom(
        roomId: string,
        layout: { rows: number; cols: number; seats: { [key: string]: { type: 'normal' | 'vip' | 'couple' | '4dx'; status: 'available' | 'maintenance' } } }
    ): Promise<void> {
        console.log('🚀 Starting generateSeatsForRoom...');
        console.log('RoomId:', roomId);
        console.log('Layout:', JSON.stringify(layout, null, 2));
        
        const seats = [];
        
        for (let row = 0; row < layout.rows; row++) {
            const rowLetter = String.fromCharCode(65 + row); // A, B, C...
            
            for (let col = 0; col < layout.cols; col++) {
                const seatId = `${rowLetter}${col + 1}`;
                const seatData = layout.seats[seatId];
                const seatType = seatData?.type || 'normal';
                const seatStatus = seatData?.status || 'available';
                
                // Calculate price based on seat type
                let price = 75000; // Base price
                switch (seatType) {
                    case 'vip':
                        price = 100000;
                        break;
                    case 'couple':
                        price = 150000;
                        break;
                    case '4dx':
                        price = 200000;
                        break;
                }
                
                const seatObject = {
                    seatId,
                    room: roomId,
                    row: rowLetter,
                    number: col + 1,
                    type: seatType,
                    price,
                    status: seatStatus,
                    position: {
                        x: col,
                        y: row
                    }
                };
                
                seats.push(seatObject);
                console.log(`Created seat: ${seatId} - ${seatType} - ${seatStatus} - $${price}`);
            }
        }

        console.log(`📊 Total seats to create: ${seats.length}`);
        console.log('Sample seats:', seats.slice(0, 3));

        try {
            // Bulk insert seats
            const insertedSeats = await Seat.insertMany(seats);
            console.log(`✅ Successfully created ${insertedSeats.length} seats for room ${roomId}`);
        } catch (error) {
            console.error('❌ Error creating seats:', error);
            throw error;
        }
    }

    // Update room
    async updateRoom(roomId: string, updateData: Partial<IRoom>): Promise<IRoom | null> {
        return await Room.findByIdAndUpdate(
            roomId,
            updateData,
            { new: true, runValidators: true }
        ).populate('theater', 'name address location');
    }

    // Delete room (also delete all seats in this room)
    async deleteRoom(roomId: string): Promise<boolean> {
        const session = await mongoose.startSession();
        
        try {
            session.startTransaction();
            
            // Delete all seats in this room
            await Seat.deleteMany({ room: roomId }).session(session);
            
            // Delete the room
            const deletedRoom = await Room.findByIdAndDelete(roomId).session(session);
            
            await session.commitTransaction();
            return !!deletedRoom;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // Check if room name exists in theater
    async isRoomNameExists(theaterId: string, roomName: string, excludeRoomId?: string): Promise<boolean> {
        const query: any = { theater: theaterId, name: roomName };
        
        if (excludeRoomId) {
            query._id = { $ne: excludeRoomId };
        }
        
        const existingRoom = await Room.findOne(query);
        return !!existingRoom;
    }

    // Get active rooms for a theater
    async getActiveRoomsByTheater(theaterId: string): Promise<IRoom[]> {
        return await Room.find({ 
            theater: theaterId, 
            status: 'active' 
        })
        .populate('theater', 'name address location')
        .sort({ name: 1 });
    }
}

export default new RoomService();
