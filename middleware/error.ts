import ErrorHandler from "../utils/ErrorHandler";
import express, { Request, Response, NextFunction } from "express";

export const errorMiddleware =  (err : any, req : Request, res : Response, next : NextFunction)=>{
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "internal server error";

    // wrong mongodb id error
    if(err.name === "CastError"){
        const message = `Resource not found. Invalid: ${err.path}`;
        err = new ErrorHandler(message, 404);
    }
    // Duplicate key error
    if(err.code === 11000){
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`
        err = new ErrorHandler(message, 404);
    }
    // wrong jwt error
    if(err.name === "JsonWebTokenError"){
        const message = `json web token is invalid, try again`;
        err = new ErrorHandler(message, 404);
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message
    })
}