require("dotenv").config();
import mongoose, {Document, Model, Schema} from "mongoose";
export interface ICustomer extends Document{
    name: string;
    businessName: string;
    address: string;
    contact: string;
    orders: string[];
    udhar: number;
    route: string;
    createdBy: string;
};

const CustomerSchema = new Schema<ICustomer>({
    name: { type: String, required: true },
    businessName: {type: String},
    address: { type: String, required: true },
    contact: { type: String, required: true, unique: true },
    orders: [String],
    udhar: {type: Number},
    route:{type: String},
    createdBy: { type: String, required: true },
},{timestamps: true});

const CustomerModel: Model<ICustomer> = mongoose.model<ICustomer>("Customer", CustomerSchema);

export default CustomerModel;