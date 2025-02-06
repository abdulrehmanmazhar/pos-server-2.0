const calculateBill = (cart: any) =>{
    let total=0;
    for(const item of cart){
         total+=item.qty*(item.product.price);
    }
    return total;
}
export default calculateBill;