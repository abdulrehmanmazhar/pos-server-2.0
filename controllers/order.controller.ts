require("dotenv").config();

import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ProductModel, { IProduct } from "../models/product.model";
import OrderModel, { IOrder } from "../models/order.model";
import CustomerModel from "../models/customer.model";
import productReducer from "../utils/productReducer";
import { sendMessage } from "../utils/whatsapp";

interface CustomerOrder {
  product: IProduct;
  qty: number;
}

export const createCart = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cart } = req.body;
      const { id: customerId } = req.params;
      const createdBy = req.user._id;
      let order;

      for (let { productId, qty } of cart) {
        const customer = await CustomerModel.findById(customerId);
        if (!customer) {
          return next(new ErrorHandler("Customer not found", 400));
        }

        const product = await ProductModel.findById(productId);
        if (!product) {
          return next(new ErrorHandler("Product not found", 400));
        }

        const unDoneOrder = await OrderModel.findOne({
          customerId,
          status: { $exists: false },
        });

        const reducerResponse = await productReducer(
          customerId,
          product,
          qty,
          "minus"
        );
        if (!reducerResponse) {
          return next(new ErrorHandler("Reducer failed to function", 500));
        }

        if (unDoneOrder) {
          const existingProduct = unDoneOrder.cart.find(
            (item) => item.product._id === productId
          );
          if (existingProduct) {
            existingProduct.qty += qty;
          } else {
            unDoneOrder.cart.push({ product, qty });
          }
          order = await unDoneOrder.save();
        } else {
          order = await OrderModel.create({
            customerId,
            createdBy,
            cart: [{ product, qty }],
          });
        }

        res.status(200).json({
          success: true,
          message: `added to cart successfully`,
          order,
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const deleteCart = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: orderId } = req.params;
      const { index } = req.params;

      const order = await OrderModel.findById(orderId);
      if (!order) {
        return next(new ErrorHandler("Order not found", 400));
      }

      const cartItem = order.cart[index];
      if (!cartItem) {
        return next(new ErrorHandler("Cart item not found", 400));
      }

      const oldProduct = await ProductModel.findById(cartItem.product._id);
      if (!oldProduct) {
        return next(new ErrorHandler("Product not found", 400));
      }

      const reducerResponse = await productReducer(
        order.customerId,
        oldProduct,
        cartItem.qty,
        "add"
      );
      if (!reducerResponse) {
        return next(new ErrorHandler("Reducer failed to function", 500));
      }

      order.cart.splice(parseInt(index, 10), 1);
      await order.save();

      res.status(200).json({
        success: true,
        message: "Deleted successfully",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const addOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.id;
      const { deliveryDate, message, additionalDiscount } = req.body;
      let order = await OrderModel.findById(orderId);
      if (!order) {
        return next(new ErrorHandler("Order not found", 400));
      }

      if (!deliveryDate || !message || !additionalDiscount) {
        return next(new ErrorHandler("Some argument is missing", 400));
      }
      const orderDocuments: number = await OrderModel.countDocuments();
      order.deliveryDate = new Date(deliveryDate);
      order.message = message;
      order.status = "saved";
      order.deliveryStatus = false;
      order.orderNumber = orderDocuments;
      order.price = order.cart.reduce(
        (accumulator, currentValue) =>
          accumulator + currentValue.product.price * currentValue.qty,
        0
      );
      order.discount =
        order.cart.reduce(
          (accumulator, currentValue) =>
            accumulator + currentValue.product.discount * currentValue.qty,
          0
        ) + additionalDiscount;

      await order.save();

      const customer = await CustomerModel.findById(order.customerId);
      const customerOrder = customer.orders;
      customerOrder.push(orderId);
      customer.orders = customerOrder;

      await customer.save();

      res.status(200).json({
        success: true,
        message: "Order saved successfully",
      });
      let contact = customer.contact;
      // Construct receipt message
      if (contact.startsWith("0")) {
        contact = "92" + contact.slice(1);
      }
      if (contact.length > 12 || contact.length < 12) {
        return console.log("cannot send message bcause contact is invalid");
      }
      const receiptMessage = `
                🧾 *Receipt*
                ------------------------------
                👤 Customer: ${customer.name}
                📞 Contact: ${customer.contact}
                ------------------------------
                🛒 *Order Details:*
                ${order.cart
                  .map((item, index) => {
                    return `   ${index + 1}. ${item.product.name} - Qty: ${
                      item.qty
                    } - Price: ${item.product.price}`;
                  })
                  .join("\n")}
                ------------------------------
                📅 Estimated Delivery Date: ${new Date(
                  order.deliveryDate
                ).toLocaleDateString()}
                💰 Total Bill: ${order.price - order.discount} PKR
                ------------------------------
                ✨ Thank you for your booking!
                `;
      try {
        await sendMessage(contact, receiptMessage);
      } catch (error) {
        console.log("error sending the whatsapp receipt", error);
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const deleteOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: orderId } = req.params;

      const order = await OrderModel.findById(orderId);
      if (!order) {
        return next(new ErrorHandler("Order not found", 400));
      }

      const customer = await CustomerModel.findById(order.customerId);
      if (!customer) {
        return next(new ErrorHandler("Customer not found", 400));
      }

      customer.orders = customer.orders.filter(
        (orderId) => orderId !== order._id
      );
      await customer.save();

      for (const item of order.cart) {
        const product = await ProductModel.findById(item.product._id);
        if (product) {
          product.stockQty += item.qty;
          product.inStock = product.stockQty > 0;
          await product.save();
        }
      }

      await OrderModel.deleteOne({ _id: orderId });
      res.status(200).json({
        success: true,
        message: "Deleted order and returned products",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getOrder = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: orderId } = req.params;

      const order = await OrderModel.findById(orderId);
      if (!order) {
        return next(new ErrorHandler("Order not found", 404));
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getAllOrders = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const orders = await OrderModel.aggregate([
          {
            $addFields: { 
              createdBy: { $toObjectId: "$createdBy" }, // Convert string to ObjectId
              customerId: { $toObjectId: "$customerId" }, // Convert string to ObjectId
            },
          },
          {
            $lookup: {
              from: "users", // the name of the users collection
              localField: "createdBy", // the field in order collection
              foreignField: "_id", // the field in user collection
              as: "userDetails", // the name of the field where the result will be stored
            },
          },
          {
            $unwind: {
              path: "$userDetails",
              preserveNullAndEmptyArrays: true, // ensures if there's no matching user, it doesn't fail
            },
          },
          {
            $lookup: {
              from: "customers", // the name of the customers collection
              localField: "customerId", // the field in order collection
              foreignField: "_id", // the field in customer collection
              as: "customerDetails", // the name of the field where the result will be stored
            },
          },
          {
            $unwind: {
              path: "$customerDetails",
              preserveNullAndEmptyArrays: true, // ensures if there's no matching customer, it doesn't fail
            },
          },
          {
            $addFields: {
              userDetails: { $ifNull: ["$userDetails", { name: "Unknown User", email: "N/A" }] },
              customerDetails: { $ifNull: ["$customerDetails", { name: "Unknown Customer", contact: "N/A" }] },
            },
          },
        ]);
  
        if (!orders || orders.length === 0) {
          return next(new ErrorHandler("No orders found", 404));
        }
  
        res.status(200).json({
          success: true,
          orders,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  );
  