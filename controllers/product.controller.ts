// @ts-nocheck
require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import { History } from "../models/product.model";
import ProductModel from "../models/product.model";
import TransactionModel from "../models/transaction.model";
export const addProduct = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const { name, category, price, stockQty, totalBill, discount } = req.body;
        const createdBy= req.user._id;
        let inStock = false;
        // console.log(name, category, price, stockQty, totalBill, discount)
        if(name && category && price && stockQty &&totalBill){   
            const product = await ProductModel.findOne({name, category});
            
            if(product){
                return next(new ErrorHandler(`Product already exists`,400))
            }
            if(stockQty>0){
                inStock = true
            }
            let purchasePrice = totalBill/stockQty;
            let history = [];
            let historyIndices : History = {
                qty: stockQty,
                totalBill: totalBill,
                purchasePrice,
                date: new Date(Date.now())
            }
            history.push(historyIndices);
            const createdProduct = await ProductModel.create({name, category, price, stockQty, inStock, purchasePrice, discount, history})
            await TransactionModel.create({createdBy,type:"investment",amount: totalBill, description:`added new product ${name}(${category})`})

            res.status(200).json({
                success: true,
                createdProduct
            })
        }else{
            return next(new ErrorHandler("Something is missing from arguments",400))
        }
    } catch (error) {
        return next(new ErrorHandler(error.message,500))
        
    }
})

export const editProduct = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const { name, category, price, stockQty } = req.body;
        const {id} = req.params;
        let inStock = false;

        const targetProduct = await ProductModel.findById(id);
        if(!targetProduct){
            return next(new ErrorHandler("Target product not found",400))
        }

        const sameProduct = await ProductModel.findOne({name, category, price, stockQty})

        if(sameProduct){
            return next(new ErrorHandler("Same product found so you cannot proceed",400));
        }
        if(stockQty>0){
            inStock = true
        }

        const data = { name, category, price, stockQty, inStock };
        const editedOne = await ProductModel.findByIdAndUpdate(id,{$set:data},{new: true})

        res.status(200).json({
            success:true,
            editedOne
        })
    } catch (error) {
        return next(new ErrorHandler(error.message,500))
        
    }
})

export const getProducts = CatchAsyncError(async(req: Request, res: Response, next: NextFunction) => {
    try {
        const products = await ProductModel.aggregate([
            {
                $addFields: {
                    _idString: { $toString: "$_id" } // Convert ObjectId to string
                }
            },
            {
                $lookup: {
                    from: "product-sales", // Ensure this matches the actual collection name
                    localField: "_idString", // Use the converted string ID
                    foreignField: "productId", // Match against string productId
                    as: "productSale"
                }
            },
            {
                $project: {
                    _idString: 0 // Remove the extra field after lookup
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        if (!products || products.length === 0) {
            return next(new ErrorHandler("No products found", 404));
        }

        res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});



export const deleteProduct = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id} = req.params;

    const product = await ProductModel.findById(id);

    if(!product){
        return next(new ErrorHandler("Product not found with this id", 400 ))
    }

    await ProductModel.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message:"Deleted the product successfully"
    })
    } catch (error) {
        return next(new ErrorHandler(error.message,500))
        
    }
})

export const restockProduct = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const { price, stockQty, discount, totalBill } = req.body;
        const {id} = req.params;
        const createdBy= req.user._id;

        let inStock = false;
        if(!(price && stockQty && totalBill)){
            return next(new ErrorHandler("something is missing",400))
        }
        const targetProduct = await ProductModel.findById(id);
        if(!targetProduct){
            return next(new ErrorHandler("Target product not found",400))
        }
        if(stockQty>0){
            inStock = true
        }
        let purchasePrice = totalBill/stockQty;
        let history = targetProduct.history;
        let historyIndices : History = {
            qty: stockQty,
            totalBill: totalBill,
            purchasePrice,
            date: new Date(Date.now())
        }
        history.push(historyIndices)
        const data = {price, stockQty: targetProduct.stockQty+stockQty, discount, totalBill, purchasePrice, history};
        const editedOne = await ProductModel.findByIdAndUpdate(id,{$set:data},{new: true})
        await TransactionModel.create({createdBy,type:"investment",amount: totalBill, description:`restocked the product ${targetProduct.name}(${targetProduct.category})`})

        res.status(200).json({
            success:true,
            editedOne
        })
    } catch (error) {
        return next(new ErrorHandler(error.message,500))
        
    }
})