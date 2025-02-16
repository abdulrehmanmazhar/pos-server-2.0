import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import TargetModel from "../models/target.model";
import userModel from "../models/user.model";


// 📌 **1️⃣ Create Target**
export const createTarget = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: userId } = req.params; // Get userId from params
        const { type, value, productId, startDate, endDate } = req.body;

        // Validate user existence
        const doesUserExist = await userModel.findById(userId);
        if (!doesUserExist) {
            return next(new ErrorHandler("User does not exist", 400));
        }

        // Validate required fields
        if (!type || !value || !startDate || !endDate) {
            return next(new ErrorHandler("Please provide all required fields", 400));
        }

        // Create Target
        const newTarget = await TargetModel.create({
            userId,
            type,
            value,
            productId: productId || null,
            startDate,
            endDate,
        });

        res.status(201).json({
            success: true,
            message: "Target created successfully",
            target: newTarget,
        });

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// 📌 **2️⃣ Get All Targets**
export const getAllTargets = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targets = await TargetModel.find().populate("userId", "name email").populate("productId", "name category");

        res.status(200).json({
            success: true,
            count: targets.length,
            targets,
        });

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// 📌 **3️⃣ Get Targets by User ID**
export const getTargetsByUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: userId } = req.params;

        // Validate user existence
        const doesUserExist = await userModel.findById(userId);
        if (!doesUserExist) {
            return next(new ErrorHandler("User does not exist", 400));
        }

        const userTargets = await TargetModel.find({ userId }).populate("productId", "name category");

        res.status(200).json({
            success: true,
            count: userTargets.length,
            targets: userTargets,
        });

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});

export const updateTargetProgress = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: targetId } = req.params; // Target ID from URL
        const { progress } = req.body; // New progress value from request body

        // Validate input
        if (progress === undefined || typeof progress !== "number") {
            return next(new ErrorHandler("Progress value must be a number", 400));
        }

        // Find the target document
        const target = await TargetModel.findById(targetId);
        if (!target) {
            return next(new ErrorHandler("Target not found", 404));
        }

        // Update progress
        target.progress = progress;

        // Check if target is achieved
        if (target.progress >= target.value) {
            target.achieved = true;
        } else {
            target.achieved = false;
        }

        // Save updated target
        await target.save();

        res.status(200).json({
            success: true,
            message: "Target progress updated successfully",
            target,
        });

    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
});
