require("dotenv").config();
import mongoose, {Document, Model, Schema} from "mongoose";

export interface IProductSale extends Document{
    productId: string;
    stockQtyLeft: number;
    sold: number;
    customerId: string;
};
export const ProductSaleSchema = new Schema<IProductSale>({
    productId:{type:String, required: true},
    stockQtyLeft:{type: Number, required:true},
    sold:{type: Number, required:true},
    customerId:{type:String, required: true},

},{timestamps: true});

const ProductSaleModel: Model<IProductSale> = mongoose.model<IProductSale>("Product-Sale", ProductSaleSchema);

export default ProductSaleModel;