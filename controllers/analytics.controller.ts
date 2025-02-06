// @ts-nocheck
require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import TransactionModel from "../models/transaction.model";

interface IFilter {
    type: string;
    createdAt?: {
        $gte?: Date;
        $lte?: Date;
    };
}

export const getSales = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type, dateRange, startDate, endDate } = req.body;

        const transactions = await (async function (type: string, dateRange: string, startDate: string, endDate: string) {
            // console.log("Function invoked with parameters:", { type, dateRange, startDate, endDate });

            let filter: IFilter = { type: type };
            const now = new Date();

            if (dateRange === 'today') {
                const startOfDay = new Date(now.setHours(0, 0, 0, 0));
                const endOfDay = new Date(now.setHours(23, 59, 59, 999));
                filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
            } else if (dateRange === 'month') {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                filter.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
            } else if (dateRange === 'year') {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                filter.createdAt = { $gte: startOfYear, $lte: endOfYear };
            } else if (dateRange === 'custom') {
                if (startDate && endDate) {
                    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
                } else {
                    throw new Error('Custom range requires both startDate and endDate');
                }
            }

            // console.log("Filter created:", filter);
            const result = await TransactionModel.find(filter);
            // console.log("Transactions fetched:", result);
            return result;
        })(type, dateRange, startDate, endDate);

        res.status(200).json({ success: true, transactions });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});
