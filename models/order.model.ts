require("dotenv").config();
import mongoose, {Document, Model, Schema} from "mongoose";
import { IProduct } from '../models/product.model';
export interface IOrder extends Document{
    customerId: string;
    orderNumber: number;
    cart: {product: IProduct; qty: number;}[];
    price: number;
    payment: number;
    discount: number;
    status: string;
    deliveryStatus: boolean;
    deliveryDate: Date;
    message: string;
    createdAt: Date;
    createdBy: string;
    
};

export const OrderSchema = new Schema<IOrder>({
    customerId:{type: String },
    orderNumber: {type: Number},
    cart: {type: [Object]},
    price:{type: Number},
    payment:{type: Number},
    discount:{type: Number},
    status: {type: String},
    deliveryStatus: {type: Boolean},
    deliveryDate: {type: Date},
    message: {type: String},
    createdBy: { type: String, required: true },

},{timestamps: true});

const OrderModel: Model<IOrder> = mongoose.model<IOrder>("Order", OrderSchema);

export default OrderModel;