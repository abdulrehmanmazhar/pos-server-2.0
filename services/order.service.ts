import schedule from "node-schedule";
import OrderModel from "../models/order.model";
import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import CustomerModel from "../models/customer.model";
import TransactionModel from "../models/transaction.model";
import { User } from "../models/user.model";
import TargetModel from "../models/target.model";
import { accessTokenOptions } from "../utils/jwt";

// Schedule the job to run at 10:05 PM
export function runScheduler() {
  schedule.scheduleJob("updateOrderPayments", "30 23 * * *", async () => {
    console.log("Running nightly order payment check...");

    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0); // Midnight in UTC

      const tomorrow = new Date(today);
      tomorrow.setUTCDate(today.getUTCDate() + 1); // Next day's midnight in UTC

      const orders = await OrderModel.find({
        deliveryDate: { $gte: today, $lt: tomorrow },
        payment: { $exists: false },
      });

      for (const order of orders) {
        console.log(
          `Order Number: ${order.orderNumber} - Payment added: ${order.price}`
        );
        order.payment = order.price;
        order.deliveryStatus = true;
        await order.save(); // Save changes to the database
        await TransactionModel.create({
          type: "sale",
          description: `Sale against order number ${order.orderNumber} as sale`,
          amount: order.price,
          orderId: order._id,
          createdBy: "machine",
        });
      }
    } catch (error) {
      console.log("failed to add full payment", error);
    }
  });

  console.log("in scheduler");
}
// export async function targetUpdation(user: string) {
//   try {
//     const targets = await TargetModel.find({
//       userId: user,
//       endDate: { $gte: new Date() },
//     });
//     let results:any = 'result';

//     for (const target of targets) {
//       switch (target.type) {
//         case "orders":
//           console.log("orders");
//           if(target?.productId){
//             const orders = await OrderModel.find({
//               createdBy: user,
//               createdAt: { $gte: target.startDate, $lte: target.endDate },
//               cart: {
//                   $elemMatch: {
//                       "product._id": target.productId
//                   }
//               }
//           });
//             const ordersLength = orders.length;
//             results = ordersLength;
//           }
//           else{
//             const orders = await OrderModel.find({createdBy: user, createdAt:{$gte:target.startDate, $lte: target.endDate}});
//             const ordersLength = orders.length;
//             results = ordersLength;
//           }
//           break;


//         case "quantity":
//           console.log("quantity");
//           if(target?.productId){
//             const orders = await OrderModel.find({
//               createdBy: user,
//               createdAt: { $gte: target.startDate, $lte: target.endDate },
//               cart: {
//                   $elemMatch: {
//                       "product._id": target.productId
//                   }
//               }
//           });
//             const flattenedCart = orders.flatMap(order => order.cart);
//             const filteredCart = flattenedCart.filter((item)=>item.product._id === target.productId)
//             const ordersQuantity = filteredCart.reduce((acc, now)=>acc+now.qty,0);
//             results = ordersQuantity
//           }
//           else{
//             const orders = await OrderModel.find({createdBy: user, createdAt:{$gte:target.startDate, $lte: target.endDate}});
//             const flattenedCart = orders.flatMap(order => order.cart);
//             const ordersQuantity = flattenedCart.reduce((acc, now)=>acc+now.qty,0);
//             results = ordersQuantity
//           }
//           break;


//         case "sales":
//           console.log("sales");
//           if(target?.productId){
//             const orders = await OrderModel.find({
//               createdBy: user,
//               createdAt: { $gte: target.startDate, $lte: target.endDate },
//               cart: {
//                   $elemMatch: {
//                       "product._id": target.productId
//                   }
//               }
//           });
//             const ordersPayment = orders.reduce((accumulator, currentValue, currentIndex, array)=>accumulator+currentValue.payment,0);
//             results = ordersPayment;
//           }
//           else{
//             const orders = await OrderModel.find({createdBy: user, createdAt:{$gte:target.startDate, $lte: target.endDate}});
//             const ordersPayment = orders.reduce((accumulator, currentValue, currentIndex, array)=>accumulator+currentValue.payment,0);
//             results = ordersPayment;
//           }
//           break;

//         default:
//             console.log("unknown bug")
//           break;
//       }
//       console.log(results);
//     }
//   } catch (error) {
//     console.log("could not update the target", error);
//   }
// }

import mongoose from "mongoose";

export async function targetUpdation(user: string) {
  try {
    const targets = await TargetModel.find({
      userId: user,
      endDate: { $gte: new Date() },
    });

    let results: any = "result";

    // Execute all queries in parallel using Promise.all
    await Promise.all(
      targets.map(async (target) => {
        switch (target.type) {
          case "orders":
            console.log("orders");
            if (target?.productId) {
              const productObjectId = new mongoose.Types.ObjectId(target.productId);
              const orders = await OrderModel.find({
                createdBy: user,
                createdAt: { $gte: target.startDate, $lte: target.endDate },
                cart: {
                  $elemMatch: {
                    "product._id": productObjectId,
                  },
                },
              });
              results = orders.length;
            } else {
              const orders = await OrderModel.find({
                createdBy: user,
                createdAt: { $gte: target.startDate, $lte: target.endDate },
              });
              results = orders.length;
            }
            break;

          case "quantity":
            console.log("quantity");
            if (target?.productId) {
              const productObjectId = new mongoose.Types.ObjectId(target.productId);
              const orders = await OrderModel.find({
                createdBy: user,
                createdAt: { $gte: target.startDate, $lte: target.endDate },
                cart: {
                  $elemMatch: {
                    "product._id": productObjectId,
                  },
                },
              });

              const ordersQuantity = orders.reduce((acc, order) => {
                return (
                  acc +
                  order.cart
                    .filter((item) => item.product._id.toString() === productObjectId.toString())
                    .reduce((sum, item) => sum + item.qty, 0)
                );
              }, 0);

              results = ordersQuantity;
            } else {
              const orders = await OrderModel.find({
                createdBy: user,
                createdAt: { $gte: target.startDate, $lte: target.endDate },
              });

              const ordersQuantity = orders.reduce(
                (acc, order) => acc + order.cart.reduce((sum, item) => sum + item.qty, 0),
                0
              );

              results = ordersQuantity;
            }
            break;

          case "sales":
            console.log("sales");
            if (target?.productId) {
              const productObjectId = new mongoose.Types.ObjectId(target.productId);
              const orders = await OrderModel.find({
                createdBy: user,
                createdAt: { $gte: target.startDate, $lte: target.endDate },
                cart: {
                  $elemMatch: {
                    "product._id": productObjectId,
                  },
                },
              });

              results = orders.reduce((acc, order) => acc + order.payment, 0);
            } else {
              const orders = await OrderModel.find({
                createdBy: user,
                createdAt: { $gte: target.startDate, $lte: target.endDate },
              });

              results = orders.reduce((acc, order) => acc + order.payment, 0);
            }
            break;

          default:
            console.log("Unknown target type:", target.type);
            break;
        }

        console.log(`Result for ${target.type}:`, results);
        target.progress = results;
        await target.save();
      })
    );
  } catch (error) {
    console.error("Could not update the target:", error);
  }
}


export const addPayment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { payment } = req.body;
      const { id } = req.params;
      const user = req.user;
      const order = await OrderModel.findById(id);

      if (!order) {
        return next(new ErrorHandler("order was not found", 404));
      }
      if (payment > order.price) {
        return next(
          new ErrorHandler("Cannot accept payment more than order value", 400)
        );
      }
      order.payment = payment;
      const credit = order.price - payment;

      const customer = await CustomerModel.findById(order.customerId);
      const previousUdhar = customer.udhar;
      customer.udhar = previousUdhar + credit;

      order.save();
      customer.save();

      await TransactionModel.create({
        type: "sale",
        description: `Sale against order number ${order.orderNumber} as sale`,
        amount: payment,
        orderId: order._id,
        createdBy: user,
      });

      res.status(200).json({
        success: true,
        message: "payment added successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
