import userModel from "../models/user.model"
import express, { Request, Response, NextFunction } from "express";

export const getUserById = async(id: string, res:any)=>{
    const user = await userModel.findById(id);
    if(user){

        res.status(201).json({
            success: true,
            user
        })
    }
} 

export const getAllUsers = async(res: Response)=>{
    const users = await userModel.find().sort({createdAt: -1})
    res.status(200).json({
        success: true,
        users,
    })

}

export const updateUserRole = async(res:Response, id: string, role: string)=>{
    const user = await userModel.findByIdAndUpdate(id, {role}, {new: true});

    res.status(201).json({
        success: true,
        user
    })
}