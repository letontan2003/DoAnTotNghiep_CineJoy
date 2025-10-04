import { Schema, model, Document } from "mongoose";

export interface ITheater extends Document {
    _id: string;
    theaterCode: string;
    name: string;
    regionId: Schema.Types.ObjectId;
    location: {
        city: string;
        address: string;
    };
}

const TheaterSchema = new Schema<ITheater>({
    theaterCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    regionId: { type: Schema.Types.ObjectId, required: true, ref: "Region" },
    location: {
        city: { type: String, required: true },
        address: { type: String, required: true },
    },
});

export const Theater = model<ITheater>("Theater", TheaterSchema);
