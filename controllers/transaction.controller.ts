// @ts-nocheck
require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import path from "path";
import multer from "multer";
import TransactionModel from "../models/transaction.model";
import cloudinary from 'cloudinary';
import fs from "fs";

const uploadDir = path.join(__dirname, "..", "proofs");
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "..","proofs")); // Use an absolute path to avoid errors
    },
    
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  });
  
  const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  };
  
  const upload = multer({ storage, fileFilter });

  export const createTransaction = [
    upload.single('proofImage'), // Middleware to handle file uploads
    CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
      const { type, amount, description, orderId } = req.body;
      const proofImage = req.file; // File uploaded by multer
      const createdBy = req.user._id;
  
      if (!type || !amount || !description ) {
        return next(new ErrorHandler("Missing required fields", 400));
      }
  
      const transactionData: any = { type, amount, description, createdBy };
  
      if (type === "sale") {
        if(orderId){
          return next(new ErrorHandler("Missing required fields", 400));
        }
        transactionData.orderId = orderId;
      }
      if(proofImage){
        const myCloud = await cloudinary.v2.uploader.upload(proofImage,{folder: "proofs"});
        transactionData.proofImage = myCloud.secure_url; // Save file path to transaction
      }
  
      const transaction = await TransactionModel.create(transactionData);
  
      if (!transaction) {
        return next(new ErrorHandler("Error occurred while creating transaction", 500));
      }
  
      res.status(200).json({
        success: true,
        transaction,
      });
    }),
  ];
export const deleteTransaction = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id} = req.params;
        const target = await TransactionModel.findById(id);
        if(!target){
            return next(new ErrorHandler("Targetted transaction not found",400))
        }
        let result = await TransactionModel.findByIdAndDelete(id);

            res.status(200).json({
                success: true,
                message: 'Transaction removed successfully'
            })
    } catch (error) {
        return next(new ErrorHandler(error.message,500))
        
    }
})

export const getTransactions = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const transactions = await TransactionModel.find().sort({createdAt:-1})

        if(!transactions){
            return next(new ErrorHandler("No transactions found",404))
        }
        res.status(200).json({
            success: true,
            transactions
        })
    } catch (error) {
        return next(new ErrorHandler(error.message,500))
        
    }
})

export const getTodayTransactions = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get the start and end of today in ISO format
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Start of the day

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // End of the day

        const transactions = await TransactionModel.find({
            createdAt: {
                $gte: startOfDay,
                $lte: endOfDay
            },
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            transactions
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});
