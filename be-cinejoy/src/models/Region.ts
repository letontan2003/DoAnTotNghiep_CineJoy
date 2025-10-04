import { Schema, model, Document, Types } from "mongoose";

export interface IRegion extends Document {
    _id: string;
    regionCode: string;
    name: string;
}

const RegionSchema = new Schema<IRegion>({
    regionCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
});

export const Region = model<IRegion>("Region", RegionSchema);