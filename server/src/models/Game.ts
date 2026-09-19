import mongoose, { Schema, Document } from 'mongoose';

export interface IProperty {
  id: string;
  name: string;
  position: number;
  price: number;
  rent: number;
  rentWithHouse: number[];
  rentWithHotel: number;
  houseCost: number;
  color: string;
  category: string; // Allow any category string
  ownerId?: string;
  houses: number; // 0-4 (4 = hotel)
  isRailroad?: boolean;
  isUtility?: boolean;
  isSpecial?: boolean;
  specialType?: 'go' | 'jail' | 'free-parking' | 'go-to-jail' | 'chance' | 'community-chest' | 'tax';
}

export interface IPlayer {
  id: string;
  name: string;
  avatar: string;
  position: number;
  money: number;
  properties: string[]; // Property IDs
  inJail: boolean;
  jailTurns: number;
  socketId?: string;
}

export interface IGame extends Document {
  roomCode: string;
  status: 'waiting' | 'in-progress' | 'finished';
  players: IPlayer[];
  currentTurn: string; // Player ID
  turnNumber: number;
  startTime: Date;
  lastActivity?: Date;
  boardState: IProperty[];
  activeDuel?: {
    id: string;
    challengerId: string;
    defenderId: string;
    propertyId: string;
    problemId: string;
    startTime: Date;
    status: 'active' | 'challenger-won' | 'defender-won' | 'timeout';
  };
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  position: { type: Number, required: true },
  price: { type: Number, required: true },
  rent: { type: Number, required: true },
  rentWithHouse: [Number],
  rentWithHotel: { type: Number, required: true },
  houseCost: { type: Number, required: true },
  color: { type: String, required: true },
  category: { type: String, required: true },
  ownerId: String,
  houses: { type: Number, default: 0 },
  isRailroad: Boolean,
  isUtility: Boolean,
  isSpecial: Boolean,
  specialType: String,
});

const PlayerSchema = new Schema<IPlayer>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  avatar: { type: String, required: true },
  position: { type: Number, default: 0 },
  money: { type: Number, default: 1500 },
  properties: [String],
  inJail: { type: Boolean, default: false },
  jailTurns: { type: Number, default: 0 },
  socketId: String,
});

const GameSchema = new Schema<IGame>({
  roomCode: { type: String, required: true, unique: true, uppercase: true },
  status: { type: String, enum: ['waiting', 'in-progress', 'finished'], default: 'waiting' },
  players: [PlayerSchema],
  currentTurn: String,
  turnNumber: { type: Number, default: 1 },
  startTime: Date,
  lastActivity: { type: Date, default: Date.now },
  boardState: [PropertySchema],
  activeDuel: {
    id: String,
    challengerId: String,
    defenderId: String,
    propertyId: String,
    problemId: String,
    startTime: Date,
    status: String,
  },
}, {
  timestamps: true,
});

export const Game = mongoose.model<IGame>('Game', GameSchema);

