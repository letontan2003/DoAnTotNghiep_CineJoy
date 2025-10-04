import { Schema, model, Document } from "mongoose";
import bcrypt from "bcrypt";

export enum Gender {
  Nam = "Nam",
  Nu = "Nữ",
  Khac = "Khác",
}

export enum Role {
  Admin = "ADMIN",
  User = "USER",
}

export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  gender: Gender;
  avatar: string;
  dateOfBirth: Date;
  role: Role;
  isActive: boolean;
  point: number;
  otp?: string;
  otpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  settings?: {
    darkMode: boolean;
  };
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    gender: {
      type: String,
      required: true,
      enum: Object.values(Gender),
    },
    avatar: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    role: {
      type: String,
      required: true,
      enum: Object.values(Role),
    },
    isActive: { type: Boolean, default: true },
    point: { type: Number, default: 50 },
    otp: { type: String, required: false },
    otpExpires: { type: Date, required: false },
    settings: {
      darkMode: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return await bcrypt.compare(candidate, (this as IUser).password);
};

export const User = model<IUser>("User", UserSchema);
