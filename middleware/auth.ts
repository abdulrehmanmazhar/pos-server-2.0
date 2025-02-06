import express, { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncError";
import ErrorHandler from "../utils/ErrorHandler";
import Jwt, { JwtPayload } from "jsonwebtoken";
import { User as IUser } from "../models/user.model";
import userModel from "../models/user.model";

export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token;

    if (!access_token) {
        return next(new ErrorHandler("User is not authenticated", 401));
    }

    try {
        // Verify the token
        const decoded = Jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;

        if (!decoded) {
            return next(new ErrorHandler("Access token is not valid", 400));
        }

        const user = (await userModel.findById(decoded.id)) as any;

        if (!user) {
            return next(new ErrorHandler("User not found", 400));
        }

        req.user = user;
        next();
    } catch (error: any) {
        // Explicitly handle token expiration
        if (error.name === "TokenExpiredError") {
            return next(new ErrorHandler("JWT token has expired", 401));
        }
        return next(new ErrorHandler("Authentication failed", 400));
    }
});

export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user?.role)) {
            return next(new ErrorHandler(`Role: ${req.user?.role} is not allowed to access this resource`, 403));
        }
        next();
    };
};
