const calculateDiscount = (cart: any) =>{
    let total=0;
    for(const item of cart){
         total+=item.qty*(item.product.discount);
    }
    return total;
}
export default calculateDiscount;