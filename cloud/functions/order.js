const Order = Parse.Object.extend('Order');
const OrderItem = Parse.Object.extend('OrderItem');

const product = require('./product');

Parse.Cloud.define('checkout', async (request) => {
	if (request.user == null) throw 'INVALID_USER';
	const queryCartItems = new Parse.Query(CartItem);
	queryCartItems.equalTo('user', request.user);
	queryCartItems.include('product');
	const resultCartItems = await queryCartItems.find({useMasterKey: true});
	let total = 0;
	for (let item of resultCartItems) {
		item = item.toJSON();
		total += item.quantity * item.product.price;
	}
	if (request.params.total != total) throw 'INVALID_TOTAL';
	const order = new Order();
	order.set('total', total);
	order.set('user', request.user);
	const saveOrder = await order.save(null, {useMasterKey: true});
	for (let item of resultCartItems) {
		const orderItem = new OrderItem();
		orderItem.set('order', order);
		orderItem.set('user', request.user);
		orderItem.set('product', item.get('product'));
		orderItem.set('quantity', item.get('quantity'));
		orderItem.set('price', item.toJSON().product.price);
		await orderItem.save(null, {useMasterKey: true});
	}
	await Parse.Object.destroyAll(resultCartItems, {useMasterKey: true});
	return {
		id: saveOrder.id
	}
});

Parse.Cloud.define('get-orders', async (request) => {
	if (request.user == null) throw 'INVALID_USER';
	const queryOrders = new Parse.Query(Order);
	queryOrders.equalTo('user', request.user);
	const resultOrders = await queryOrders.find({useMasterKey: true});
	return resultOrders.map(function (o) {
		o = o.toJSON();
		return {
			id: o.objectId,
			total: o.total,
			createdAt: o.createdAt,
		}
	});
});

Parse.Cloud.define('get-order-items', async (request) => {
	if (request.user == null) throw 'INVALID_USER';
	if (request.params.orderId == null) throw 'INVALID_ORDER';
	const order = new Order();
	order.id = request.params.orderId;
	const queryOrdersItems = new Parse.Query(OrderItem);
	queryOrdersItems.equalTo('order', order);
	queryOrdersItems.equalTo('user', request.user);
	queryOrdersItems.include('product');
	queryOrdersItems.include('product.category');
	const resultOrdersItems = await queryOrdersItems.find({useMasterKey: true});
	return resultOrdersItems.map(function (o) {
		o = o.toJSON();
		return {
			id: o.objectId,
			quantity: o.quantity,
			price: o.price,
			product: product.formatProduct(o.product)
		}
	});
});
