import ProductSaleModel from "../models/productSale.model";

const productReducer = async (customerId,product,qty,action) => {
    let newStockState;
    if(action === 'add'){
        newStockState = product.stockQty+qty;
        product.stockQty = newStockState;
        await ProductSaleModel.create({customerId, productId:product._id, stockQtyLeft: newStockState, sold: Number(-qty) });
    }
    else if(action === 'minus'){
        newStockState = product.stockQty-qty;
        product.stockQty = newStockState;
        await ProductSaleModel.create({customerId, productId:product._id, stockQtyLeft: newStockState, sold: qty });
    }
    if(newStockState <= 0){
        product.inStock = false;
    }else{
        product.inStock = true;
    }
    await product.save();
    return true;
}
export default productReducer;