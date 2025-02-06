// @ts-nocheck
require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ProductSaleModel from "../models/productSale.model";

interface IFilter {
    productId: string;
    createdAt?: {
        $gte?: Date;
        $lte?: Date;
    };
}

export const getProductSales = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { productId, dateRange, startDate, endDate } = req.body;

        const productSales = await (async function (productId: string, dateRange: string, startDate: string, endDate: string) {

            let filter: IFilter = { productId };
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
            const result = await ProductSaleModel.find(filter);
            return result;
        })(productId, dateRange, startDate, endDate);

        res.status(200).json({ success: true, productSales });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});
