const Product = Parse.Object.extend('Product');
const CartItem = Parse.Object.extend('CartItem');

const product = require('./product');

Parse.Cloud.define('add-item-to-cart', async (request) => {
	if (request.user == null) throw 'INVALID_USER';
	if (request.params.quantity == null) throw 'INVALID_QUANTITY';
	if (request.params.productId == null) throw 'INVALID_PRODUCT';
	const cartItem = new CartItem();
	cartItem.set('quantity', request.params.quantity);
	const product = new Product();
	product.id = request.params.productId;
	cartItem.set('product', product);
	cartItem.set('user', request.user);
	const savedItem =  await cartItem.save(null, {useMasterKey: true});
	return {
		id: savedItem.id,
	}
});

Parse.Cloud.define('modify-item-quantity', async (request) => {
	if (request.params.cartItemId == null) throw 'INVALID_CART_ITEM';
	if (request.params.quantity == null) throw 'INVALID_QUANTITY';
	const cartItem = new CartItem();
	cartItem.id = request.params.cartItemId;
    if (request.params.quantity > 0) {
		cartItem.set('quantity', request.params.quantity);
		await cartItem.save(null, {useMasterKey: true});
	} else {
		await cartItem.destroy({useMasterKey: true});
	}
});

Parse.Cloud.define('get-cart-items', async (request) => {
	if (request.user == null) throw 'INVALID_USER';
	const queryCartItems = new Parse.Query(CartItem);
	queryCartItems.equalTo('user', request.user);
	queryCartItems.include('product');
	queryCartItems.include('product.category');
	const resultCartItem = await queryCartItems.find({useMasterKey: true});
	return resultCartItem.map(function (c){
		c = c.toJSON();
		return {
			id: c.objectId,
			quantity: c.quantity,
			product: product.formatProduct(c.product)
		}
	});
});