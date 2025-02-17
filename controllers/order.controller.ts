require("dotenv").config();

import { Request, Response, NextFunction } from "express";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import ProductModel, { IProduct } from "../models/product.model";
import OrderModel, { IOrder } from "../models/order.model";
import CustomerModel from "../models/customer.model";
import productReducer from "../utils/productReducer";
import { sendMessage } from "../utils/whatsapp";
import TransactionModel from "../models/transaction.model";
import { targetUpdation } from "../services/order.service";

interface CustomerOrder {
  product: IProduct;
  qty: number;
}

export const createCart = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cart } = req.body;
    const { id: customerId } = req.params;
    const createdBy = req.user._id;

    // Fetch customer once
    const customer = await CustomerModel.findById(customerId);
    if (!customer) return next(new ErrorHandler("Customer not found", 400));

    // Extract product IDs from cart
    const productIds = cart.map((item) => item.productId);

    // Fetch all products in a single query
    const products = await ProductModel.find({ _id: { $in: productIds } });

    // Check if all products exist
    if (products.length !== productIds.length) return next(new ErrorHandler("Some products not found", 400));

    // Find an existing order (if any)
    let order = await OrderModel.findOne({ customerId, status: { $exists: false } });

    // Process cart items
    for (let { productId, qty } of cart) {
      const product = products.find((p) => p._id.toString() === productId);
      if (!product) continue; // Skip invalid product

      // Reduce stock
      const reducerResponse = await productReducer(customerId, product, qty, "minus");
      if (!reducerResponse) return next(new ErrorHandler("Reducer failed to function", 500));

      // If order exists, update it; otherwise, create a new one
      if (order) {
        const existingProduct = order.cart.find((item) => item.product._id.toString() === productId);
        existingProduct ? (existingProduct.qty += qty) : order.cart.push({ product, qty });
      } else {
        order = await OrderModel.create({ customerId, createdBy, cart: [{ product, qty }] });
      }
    }

    if (!order) return next(new ErrorHandler("Failed to create or update order", 500));

    await order.save();
    await targetUpdation(req.user._id);

    res.status(200).json({
      success: true,
      message: `Added to cart successfully`,
      order,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

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

export const addOrder = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: orderId } = req.params;
    const { deliveryDate, message="", additionalDiscount = 0 } = req.body;

    const order = await OrderModel.findById(orderId);
    if (!order) return next(new ErrorHandler("Order not found", 400));
    if (!deliveryDate) return next(new ErrorHandler("Missing required fields", 400));

    // Get the last order number and increment it
    const lastOrder = await OrderModel.findOne().sort({ orderNumber: -1 });

    order.orderNumber = lastOrder?.orderNumber ? lastOrder.orderNumber + 1 : 1;

    // Update order details
    order.deliveryDate = new Date(deliveryDate);
    order.deliveryDate.setUTCHours(0, 0, 0, 0);
    order.message = message;
    order.status = "saved";
    order.deliveryStatus = false;

    // Calculate price and discount safely
    if (Array.isArray(order.cart)) {
      order.price = order.cart.reduce((acc, item) => acc + (item?.product?.price ?? 0) * (item?.qty ?? 0), 0);
      order.discount = order.cart.reduce((acc, item) => acc + (item?.product?.discount ?? 0) * (item?.qty ?? 0), 0) + additionalDiscount;
    } else {
      order.price = 0;
      order.discount = additionalDiscount;
    }

    await order.save();

    // Update customer's orders
    const customer = await CustomerModel.findById(order.customerId);
    if (!customer) return next(new ErrorHandler("Customer not found", 400));

    customer.orders.push(orderId);
    await customer.save();

    // Send response
    res.status(200).json({ success: true, message: "Order saved successfully" });

    // Send receipt message via WhatsApp
    let contact = customer.contact.startsWith("0") ? `92${customer.contact.slice(1)}` : customer.contact;
    if (contact.length !== 12) return console.log("Invalid contact number, cannot send message");

    const receiptMessage = `
    🧾 *Receipt*
    ━━━━━━━━━━━━━━━━━━━━
    🏢 *Business:* ${customer.businessName}
    👤 *Customer:* ${customer.name}
    📞 *Contact:* ${customer.contact}
    📍 *Address:* ${customer.address}
    ━━━━━━━━━━━━━━━━━━━━
    🛒 *Order Details:*
    ${order.cart.map((item, index) => `🔹 *${index + 1}.* ${item.product.name}  
       📦 Qty: ${item.qty}  💵 Price: ${item.product.price} PKR`).join("\n")}
    ━━━━━━━━━━━━━━━━━━━━
    📅 *Delivery Date:* ${new Date(order.deliveryDate).toLocaleDateString()}
    💰 *Discount:* ${order.discount} PKR
    💵 *Total Bill:* ${order.price - order.discount} PKR
    ━━━━━━━━━━━━━━━━━━━━
    ✨ *Thank you for your order!* We appreciate your business. 😊
    `;
    

    try {
      await sendMessage(contact, receiptMessage);
    } catch (error) {
      console.log("Error sending the WhatsApp receipt:", error);
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});


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
        const reducerResponse = await productReducer(
          order.customerId,
          product,
          item.qty,
          "add"
        );
        if (!reducerResponse) {
          return next(new ErrorHandler("Reducer failed to function", 500));
        }
      };
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
  
  export const addOrderPayment = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id: orderId } = req.params;
        const { payment } = req.body;
        const user = req.user._id;
  
        // Ensure payment is a valid number
        if (typeof payment !== "number" || isNaN(payment) || payment < 0) {
          return next(new ErrorHandler("Order payment must be a valid non-negative number", 400));
        }
  
        // Fetch order details
        const order = await OrderModel.findById(orderId).lean();
        if (!order) {
          return next(new ErrorHandler("Order not found", 404));
        }
  
        // Ensure order.price is valid
        const orderPrice = typeof order.price === "number" ? order.price : 0;
  
        // Ensure discount is valid
        const discount = typeof order.discount === "number" ? order.discount : 0;

              // **FIX:** Prevent any changes if payment (even 0) already exists
      if (order.payment !== undefined && order.payment !== null) {
        return next(new ErrorHandler("Payment has already been made and cannot be changed", 400));
      }
  
        // Ensure order.payment is properly checked
        if (typeof order.payment === "number" && order.payment > 0) {
          return next(new ErrorHandler("Order payment already exists", 400));
        }
  
        // Calculate remaining amount
        const remainingAmount = orderPrice - discount - (order.payment || 0);
        if (payment > remainingAmount) {
          return next(new ErrorHandler("Cannot pay more than remaining amount", 400));
        }
  
        // Update order payment
        const updateOrder = OrderModel.findByIdAndUpdate(orderId, { payment }, { new: true });
  
        // Create transaction if payment is greater than 0
        const createTransaction =
          payment > 0
            ? TransactionModel.create({ createdBy: user, type: "sale", amount: payment, description: "Sales from order" })
            : Promise.resolve();
  
        // Fetch customer
        const customer = await CustomerModel.findById(order.customerId);
        if (!customer) {
          return next(new ErrorHandler("Customer not found", 404));
        }
  
        // Ensure customer.udhar is a valid number
        customer.udhar = Math.max((customer.udhar || 0) + remainingAmount - payment, 0);
        const updateCustomer = customer.save();
  
        // Execute all DB operations in parallel
        const [updatedOrder] = await Promise.all([updateOrder, createTransaction, updateCustomer]);
  
        res.status(200).json({
          success: true,
          order: updatedOrder,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  );
  
  export const returnOrderUdhar = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id: orderId } = req.params;
        const { payment } = req.body;
        const user = req.user._id;
  
        // Validate payment input
        if (typeof payment !== "number" || isNaN(payment) || payment < 0) {
          return next(new ErrorHandler("Payment must be a valid non-negative number", 400));
        }
  
        // Fetch order
        const order = await OrderModel.findById(orderId);
        if (!order) {
          return next(new ErrorHandler("Order not found", 404));
        }
  
        // Ensure order payment is already made (even if 0)
        if (order.payment === undefined || order.payment === null) {
          return next(new ErrorHandler("Cannot modify this order's payment", 400));
        }
  
        // Prevent making further payments if order is already fully paid
        const totalPayable = order.price - (order.discount || 0);
        if (order.payment >= totalPayable) {
          return next(new ErrorHandler("This order is already fully paid", 400));
        }
  
        // Fetch customer
        const customer = await CustomerModel.findById(order.customerId);
        if (!customer) {
          return next(new ErrorHandler("Customer not found", 404));
        }
  
        // Prevent overpayment beyond the remaining order balance
        const remainingAmount = totalPayable - order.payment;
        if (payment > remainingAmount) {
          return next(new ErrorHandler("Cannot pay more than the remaining amount", 400));
        }
  
        // Prevent overpayment beyond customer's udhar
        if (payment > customer.udhar) {
          return next(new ErrorHandler("Cannot pay more than customer's udhar amount", 400));
        }
  
        // If payment is zero, just prevent additional payments but allow the function to execute
        if (payment === 0 && order.payment === 0) {
          return next(new ErrorHandler("Payment has already been recorded as zero", 400));
        }
  
        // Create transaction
        const transaction = await TransactionModel.create({
          createdBy: user,
          type: "sale",
          amount: payment,
          description: `${customer.name} (${customer.address}) paid from their udhar: ${customer.udhar}`,
        });
  
        if (!transaction) {
          return next(new ErrorHandler("Couldn't create transaction", 500));
        }
  
        // Deduct payment from customer's udhar
        customer.udhar = Math.max(customer.udhar - payment, 0);
        await customer.save();
  
        // Update order payment
        order.payment += payment;
        await order.save();
  
        res.status(200).json({
          success: true,
          order,
        });
      } catch (error) {
        return next(new ErrorHandler(error.message, 500));
      }
    }
  );
  