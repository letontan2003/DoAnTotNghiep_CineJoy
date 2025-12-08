import { Theater, ITheater } from "../models/Theater";
import Room from "../models/Room";
import Seat from "../models/Seat";
import mongoose from "mongoose";

export default class TheaterService {
    async getTheaters(): Promise<ITheater[]> {
        return Theater.find();
    }

    async getTheaterById(id: string): Promise<ITheater | null> {
        return Theater.findById(id);
    }

    async addTheater(theaterData: Partial<ITheater>): Promise<ITheater> {
        const theater = new Theater(theaterData);
        return theater.save();
    }

    async updateTheater(id: string, theaterData: Partial<ITheater>): Promise<ITheater | null> {
        return Theater.findByIdAndUpdate(id, theaterData, { new: true });
    }

    async deleteTheater(id: string): Promise<ITheater | null> {
        const session = await mongoose.startSession();
        
        try {
            session.startTransaction();
            
            // 1. Tìm tất cả rooms thuộc theater này
            const rooms = await Room.find({ theater: id }).session(session);
            
            // 2. Xóa tất cả seats trong các rooms này
            for (const room of rooms) {
                await Seat.deleteMany({ room: room._id }).session(session);
            }
            
            // 3. Xóa tất cả rooms thuộc theater này
            await Room.deleteMany({ theater: id }).session(session);
            
            // 4. Xóa theater
            const deletedTheater = await Theater.findByIdAndDelete(id).session(session);
            
            await session.commitTransaction();
            return deletedTheater;
            
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}