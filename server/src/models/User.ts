import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  avatar: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalEarnings: number;
  problemsSolved: number;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, index: true },
    avatar: { type: String, default: '💻' },
    gamesPlayed: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    problemsSolved: { type: Number, default: 0 },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
