import schedule from "node-schedule";
import OrderModel from "../models/order.model";
import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import CustomerModel from "../models/customer.model";
import TransactionModel from "../models/transaction.model";


// Schedule the job to run at 10:05 PM
export function runScheduler () {

    schedule.scheduleJob("updateOrderPayments", "30 23 * * *", async () => {
        console.log("Running nightly order payment check...");

        try {
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0); // Midnight in UTC
            
            const tomorrow = new Date(today);
            tomorrow.setUTCDate(today.getUTCDate() + 1); // Next day's midnight in UTC

        const orders = await OrderModel.find({deliveryDate: { $gte: today, $lt: tomorrow }, payment:{$exists: false}})

        for (const order of orders) {
            console.log(`Order Number: ${order.orderNumber} - Payment added: ${order.price}`);
            order.payment = order.price;
            await order.save(); // Save changes to the database
            await TransactionModel.create({type:'sale', description:`Sale against order number ${order.orderNumber} as sale`, amount: order.price, orderId: order._id, createdBy: 'machine'})
        }
        } catch (error) {
            console.log("failed to add full payment", error);
        }
    });
    
    console.log("in scheduler");
}

export const addPayment = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {payment} = req.body;
        const {id} = req.params;
        const user = req.user;
        const order = await OrderModel.findById(id);

        if (!order) {
            return next(new ErrorHandler("order was not found", 404));
        }
        if(payment> order.price){
            return next(new ErrorHandler("Cannot accept payment more than order value",400))
        }
        order.payment = payment;
        const credit = order.price-payment;

        const customer = await CustomerModel.findById(order.customerId);
        const previousUdhar = customer.udhar;
        customer.udhar = previousUdhar+credit;

        order.save();
        customer.save();

        await TransactionModel.create({type:'sale', description:`Sale against order number ${order.orderNumber} as sale`, amount:payment, orderId: order._id, createdBy: user})

        res.status(200).json({
            success: true,
            message: 'payment added successfully'
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});