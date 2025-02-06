require("dotenv").config();
import express, { Request, Response, NextFunction } from "express";
import {User as IUser} from "../models/user.model";

interface ITokenOptions{
    expires: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: "lax" | "strict" | "none" | undefined;
    secure?: boolean; 
}

const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '300', 10)
const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '1200', 10)

// options for cookies 
export const accessTokenOptions : ITokenOptions ={
    expires: new Date(Date.now()+ accessTokenExpire+(1000*60*60)),
    maxAge: accessTokenExpire+60*60*1000,
    httpOnly: true,
    sameSite: "none",
    secure: true,
}

export const refreshTokenOptions : ITokenOptions ={
    expires: new Date(Date.now()+ refreshTokenExpire+(1000*60*60*24)),
    maxAge: accessTokenExpire+60*60*24*1000,
    httpOnly: true,
    sameSite: "none",
    secure: true,
}

export const sendToken = ( user: IUser, statusCode: number, res: Response)=>{
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();



    if(process.env.NODE_ENV === 'production'){
        accessTokenOptions.secure = true;
    }

    res.cookie("access_token", accessToken, accessTokenOptions)
    res.cookie("refresh_token", refreshToken, refreshTokenOptions)

    res.status(statusCode).json({
        success: true,
        user,
        accessToken
    })
}