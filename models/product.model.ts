require("dotenv").config();
import mongoose, {Document, Model, Schema} from "mongoose";

export type History = {
    qty: number;
    totalBill: number;
    purchasePrice: number;
    date: Date;
}

export interface IProduct extends Document{
    name: string;
    category: string;
    price: number;
    stockQty: number;
    inStock: boolean;
    purchasePrice: number;
    discount: number;
    history: History[];
};

export const ProductSchema = new Schema<IProduct>({
    name:{type: String, required:true},
    category: {type: String, required:true},
    price:{type: Number, required:true},
    stockQty:{type: Number, required:true},
    inStock:{type: Boolean, required:true},
    purchasePrice: Number,
    discount: Number,
    history:[]
},{timestamps: true});

const ProductModel: Model<IProduct> = mongoose.model<IProduct>("Product", ProductSchema);

export default ProductModel;