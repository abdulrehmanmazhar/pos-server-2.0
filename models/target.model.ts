require("dotenv").config();
import mongoose, { Document, Model, Schema } from "mongoose";

// Interface for Target Document
export interface ITarget extends Document {
  userId: mongoose.Types.ObjectId;
  type: "sales" | "orders" | "quantity";
  value: number;
  productId?: mongoose.Types.ObjectId; // Optional if target is product-specific
  startDate: Date;
  endDate: Date;
  achieved: boolean;
  progress: number;
}

// Mongoose Schema
const TargetSchema = new Schema<ITarget>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["sales", "orders", "quantity"], required: true },
    value: { type: Number, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    achieved: { type: Boolean, default: false },
    progress: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Model
const TargetModel: Model<ITarget> = mongoose.model<ITarget>("Target", TargetSchema);

export default TargetModel;
