// @ts-nocheck
require("dotenv")
.config();
import express, { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import CustomerModel from "../models/customer.model";
import TransactionModel from "../models/transaction.model";


interface IAddCustomer {
    name: string;
    address: string;
    contact: string;
}

export const addCustomer = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {name, address, contact, route, businessName} : IAddCustomer = req.body;
        const createdBy= req.user._id;

        const doesExist = await CustomerModel.findOne({contact});
        if(doesExist){
            return next(new ErrorHandler("Account already exists for this contact", 400))
        }
        const customer = await CustomerModel.create({name, address, contact, createdBy, route, businessName});
        res.status(200).json({
            success: true,
            customer
        })
        

    } catch (error) {
        return next(new ErrorHandler(error.message,500))
    }
})

export const editCustomer = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id} = req.params;
        const data = req.body;
        const doesExist = await CustomerModel.findById(id);
        if(!doesExist){
            return next(new ErrorHandler("Customer with this id not found",400))
        }
        if(data){
            const customer = await CustomerModel.findByIdAndUpdate(id,{$set: data},{new: true});
            res.status(200).json({
                success: true,
                customer
            })
        }


    } catch (error) {
        return next(new ErrorHandler(error.message,500))
        
    }
})

export const getCustomer = CatchAsyncError(async(req: Request, res: Response, next: NextFunction) => {
    try {
        const customers = await CustomerModel.aggregate([
            {
                $addFields: { createdBy: { $toObjectId: "$createdBy" } } // Convert string to ObjectId
            },
            {
                $lookup: {
                    from: "users", // Collection name of the users
                    localField: "createdBy", // Field in the customers collection
                    foreignField: "_id", // Field in the users collection
                    as: "createdByUser" // Output array field
                }
            },
            { 
                $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true } 
            }, 
            { 
                $sort: { createdAt: -1 } 
            }
        ]);

        if (!customers || customers.length === 0) {
            return next(new ErrorHandler("No customers found", 404));
        }

        res.status(200).json({
            success: true,
            customers
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});


export const deleteCustomer = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id} = req.params;

    const customer = await CustomerModel.findById(id);

    if(!customer){
        return next(new ErrorHandler("Customer not found with this id", 400 ))
    }

    await CustomerModel.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message:"Deleted the customer successfully"
    })
    } catch (error) {
        return next(new ErrorHandler(error.message,500))
        
    }
})
export const getCustomerById = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params; // Extract the id from params

        // Find the customer by ID
        const customer = await CustomerModel.findById(id);

        if (!customer) {
            return next(new ErrorHandler("Customer not found", 404));
        }

        res.status(200).json({
            success: true,
            customer,
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

export const returnUdhar = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const { id } = req.params; // Extract the id from params
        const {returnUdhar} = req.body
        const createdBy= req.user._id;

        // Find the customer by ID
        const customer = await CustomerModel.findById(id);

        if (!customer) {
            return next(new ErrorHandler("Customer not found", 404));
        }

        if(returnUdhar> customer.udhar){
            return next(new ErrorHandler("Cannot pay more than udhar amount",400))
        }
        const type="sale";
        const transaction = await TransactionModel.create({createdBy,type, amount: returnUdhar, description:`${customer.name}-${customer.address} paid from his udhar ${customer.udhar}`})
        if(!transaction){
            return next(new ErrorHandler("Couldn't make transaction",500))
        }
        customer.udhar = customer.udhar-returnUdhar;
        await customer.save();
        res.status(200).json({
            success: true,
            message: `Udhar is now ${customer.udhar} PKR`
        })

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
        
    }
})
