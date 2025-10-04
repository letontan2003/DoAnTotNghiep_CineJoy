import { Schema, model, Document, Types } from "mongoose";

export interface IUserVoucher extends Document {
    userId: Types.ObjectId;
    voucherId: Types.ObjectId;
    code: string;
    status: 'unused' | 'used' | 'expired';
    redeemedAt: Date;
    usedAt?: Date;
}

const UserVoucherSchema = new Schema<IUserVoucher>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    code: { type: String, required: true, unique: true },
    status: { type: String, enum: ['unused', 'used', 'expired'], default: 'unused' },
    redeemedAt: { type: Date, default: Date.now },
    usedAt: { type: Date },
});

export const UserVoucher = model<IUserVoucher>('UserVoucher', UserVoucherSchema); 