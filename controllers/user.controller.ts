require("dotenv").config();
import { Request, Response, NextFunction } from "express";
import userModel, {User as IUser} from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import Jwt, { JwtPayload } from "jsonwebtoken";
// import ejs from "ejs";
// import path from "path";
import sendMail from "../utils/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { getAllUsers, getUserById, updateUserRole } from "../services/user.service";
import cloudinary from "cloudinary"
// register user 

interface RegistrationBody{
    name: string;
    email: string;
    password: string;
    avatar?: string;
}

export const registrationUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {name, email, password} = req.body;
        const isEmailExist = await userModel.findOne({email});
        if(isEmailExist){
            return next(new ErrorHandler('Email already exist', 400))
        }

        const user: RegistrationBody ={
            name,
            email,
            password
        }

        const activationToken = createActivationToken(user);

        const activationCode = activationToken.activationCode
        
        const data = {user: {name:user.name}, activationCode};

        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                template: "activation-mail.ejs",
                data,
            });
            res.status(201).json({
                success: true,
                message: `Please check your email ${user.email} to activate your account`,
                activationToken: activationToken.token,
            })
        } catch (error:any) {
            return next(new ErrorHandler(error.message, 400))
        }
    } catch (error) {
        return next(new ErrorHandler(error.message,400));
    }
});

interface IActivationToken{
    token: string;
    activationCode: string;

}

export const createActivationToken = (user: any): IActivationToken =>{
    const activationCode = Math.floor(1000 + Math.random()*9000).toString()

    const token = Jwt.sign({
        user, activationCode
    }, process.env.ACTIVATION_SECRET,{
        expiresIn: "5m"
    })

    return{token, activationCode};
}

// activating user account 

interface IActivationRequest{
    activation_token: string;
    activation_code: string;
}

export const activateUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {activation_token, activation_code} = req.body as IActivationRequest;
        const newUser: {user: IUser; activationCode:string} = Jwt.verify(activation_token, process.env.ACTIVATION_SECRET as string) as {user: IUser; activationCode: string};
        if(newUser.activationCode !== activation_code){
            return next(new ErrorHandler("Invalid activation code", 400))
        }
        const {name, email, password} = newUser.user
        const existUser = await userModel.findOne({email});

        if(existUser){
            return next(new ErrorHandler("email already exist", 400))
        }
        await userModel.create({
            name,
            email,
            password
        })
        res.status(201).json({
            success: true,
            message: 'user activated successfully'
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400))
    }
});

// login user 

interface ILoginRequest {
    email: string;
    password: string;
}

export const LoginUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {email, password} = req.body as ILoginRequest;

        if(!email || !password){
            return next(new ErrorHandler("Please enter email and password", 400))
        }

        const user = await userModel.findOne({email}).select("+password");

        if(!user){
            return next(new ErrorHandler("Invalid email or password", 400))
        }

        const isPasswordMatch = await user.comparePassword(password);
        
        if(!isPasswordMatch){
            return next(new ErrorHandler("Invalid email or password", 400));
        }
        if(!user.isVerified){
            return next(new ErrorHandler("Cannot login without being verified by admin",400))
        }
        sendToken(user, 200, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

export const logoutUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        res.cookie("access_token", "", {maxAge: 1,sameSite:"none", secure:true});
        res.cookie("refresh_token", "", {maxAge: 1,sameSite:"none", secure:true});
        const userId = req.user?._id || "";
        res.status(201).json({
            success: true,
            message: "Logged out successfully"
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
        
    }
})

// update access token 
export const updateAccessToken = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const refresh_token = req.cookies.refresh_token as string
        const decoded = Jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload
        if(!decoded){
            return next(new ErrorHandler("Couldn't refresh token", 400))
        }
        const session = await userModel.findById(decoded.id) as any;
        if(!session){
            return next(new ErrorHandler("Couldn't refresh token", 400))
        }
        // const user = JSON.parse(session)
        const user = session;
        const accessToken = Jwt.sign ({id:user._id}, process.env.ACCESS_TOKEN , {
            expiresIn: '5m',

        })
        const refreshToken = Jwt.sign({id: user._id}, process.env.REFRESH_TOKEN ,{
            expiresIn: '3d'
        })
        req.user = user;
        res.cookie("access_token",accessToken, accessTokenOptions)
        res.cookie("refresh_token",refreshToken, refreshTokenOptions)
        res.status(200).json({
            status: "success",
            accessToken,
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
        
    }
})


// get user info 
export const getUserInfo = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const userId = req.user?._id;
        getUserById(userId, res);
        
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
        
    }
})

interface ISocialBody {
    email:string;
    name: string;
    avatar: string;
}

// social auth 
export const socialAuth = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {email, name, avatar} = req.body as ISocialBody;
        const user = await userModel.findOne({email});
        if(!user){
            const newUser = await userModel.create({email, name, avatar});
            sendToken(newUser, 200, res);
        }else{
            sendToken(user, 200, res)
        }
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
        
    }
})

interface IUpdateUserInfo{
    name: string;
    email: string;
}

export const updateUserInfo = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {name, email} = req.body as IUpdateUserInfo
        const userId = req.user?._id;
        const user = await userModel.findById(userId);
        if( email && user ){
            const isEmailExist = await userModel.findOne({email});

            if(isEmailExist){
                return next(new ErrorHandler("Email already exist", 200))
            }
            user.email = email;
        }
        if(name && user){
            user.name = name;
        }

        await user?.save()
        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
        
    }
})

// update user password 

interface IUpdatePassword{
    oldPassword: string;
    newPassword: string;
}

export const updatePassword = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {oldPassword, newPassword} = req.body as IUpdatePassword;
        console.log(oldPassword, newPassword);
        if(!oldPassword || !newPassword){
            return next(new ErrorHandler("Please enter old or new password", 400))
        }
        const user = await userModel.findById(req.user?._id).select("+password");

        if(user?.password === undefined){
            return next(new ErrorHandler("Invalid user", 400))
        }
        const isPasswordMatch = await user?.comparePassword(oldPassword);
        
        if(!isPasswordMatch){
            return next(new ErrorHandler("Invalid password", 400));
        }
        user.password = newPassword;

        await user.save();
        res.status(201).json({
            success: true,
            user
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
        
    }
})

interface IUpdateProfilePicture {
    avatar: string
}
export const updateProfilePicture = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    const {avatar} = req.body as IUpdateProfilePicture;
    const userId = req.user?._id
    const user = await userModel.findById(req.user?._id)

    try {
       if(avatar && user){
        if(user?.avatar?.public_id){
            await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
            const myCloud = await cloudinary.v2.uploader.upload(avatar,{
                folder: "avatars",
                width: 150,
            });
            user.avatar={
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }else{
            const myCloud = await cloudinary.v2.uploader.upload(avatar,{
                folder: "avatars",
                width: 150,
            });
            user.avatar={
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }
       }
       await user?.save()

       res.status(200).json({
        success: true,
        user
       })
        
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
        
    }
})

// get all users for admin

export const fetchAllUsers = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        getAllUsers(res);
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
        
    }
})

// update user role for admin 

export const updateRole = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id, role} = req.body;
        updateUserRole(res,id,role);
    } catch (error) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// delete user for admin 

export const deleteUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id} = req.params;
        const user = await userModel.findById(id);

        if(!user){
            return next(new ErrorHandler("User not found", 404))
        }
        await user.deleteOne({id})

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        })
    } catch (error) {
        return next(new ErrorHandler(error.message, 400))
        
    }
})

// add user without email authorization for admin

export const addUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {name, email, password} = req.body;
        const isEmailExist = await userModel.findOne({email});
        if(isEmailExist){
            return next(new ErrorHandler('Email already exist', 400))
        }


        const user = await userModel.create({
            name,
            email,
            password,
            isVerified: true
        })
        res.status(201).json({
            success: true,
            message: 'user added successfully'
        })
    } catch (error) {
        return next(new ErrorHandler(error.message,400));
    }
});

export const verifyUser = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id} = req.params;
        const doesUserExist = await userModel.findById(id);
        if(!doesUserExist){
            return next(new ErrorHandler('User Does not exist', 400))
        }

        doesUserExist.isVerified = true;

        doesUserExist.save();

        res.status(201).json({
            success: true,
            message: 'user verified successfully'
        })
    } catch (error) {
        return next(new ErrorHandler(error.message,400));
    }
});

export const routeAssign = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id: userId} = req.params;
        const route: string = req.body.route as string;
        const doesUserExist = await userModel.findById(userId);
        if(!doesUserExist){
            return next(new ErrorHandler('User Does not exist', 400))
        }
        if(!route){
            return next(new ErrorHandler('Assign appropriate route', 400))
        }
        const routeArray = doesUserExist.routes;
        doesUserExist.routes = routeArray.push(route);

        doesUserExist.save();
        res.status(201).json({                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
            success: true,
            message: 'assigned route to user successfully'
        })

    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
});

export const routeAssignDeletion = CatchAsyncError(async(req: Request, res: Response, next: NextFunction)=>{
    try {
        const {id: userId, index} = req.params;
        const doesUserExist = await userModel.findById(userId);
        if(!doesUserExist){
            return next(new ErrorHandler('User Does not exist', 400))
        }
        const routeArray = doesUserExist.routes;
        doesUserExist.routes = routeArray.splice(parseInt(index,10),1);

        doesUserExist.save();
        res.status(201).json({
            success: true,
            message: 'deleted assigned route from user successfully'
        })

    } catch (error) {
        return next(new ErrorHandler(error.message,400))
    }
});