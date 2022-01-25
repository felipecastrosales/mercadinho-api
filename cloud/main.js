const Product = Parse.Object.extend('Product');
const Category = Parse.Object.extend('Category');
const User = Parse.Object.extend('User');
const CartItem = Parse.Object.extend('CartItem');
const Order = Parse.Object.extend('Order');
const OrderItem = Parse.Object.extend('OrderItem');

Parse.Cloud.define('hello', (request) => {
	return 'Hello world from Mercadinho!';
});

Parse.Cloud.define('get-product-list', async (request) => {
    const queryProducts = new Parse.Query(Product);
	// Conditionals
	if (request.params.title != null) {
		queryProducts.fullText('title', request.params.title);
		// queryProducts.matches('title', '.*' + request.params.title + '.*');
	}
	if (request.params.categoryId != null) {
		const category = new Category();
		category.id = request.params.categoryId;
		queryProducts.equalTo('category', category);
	}
	const itemsPerPage = request.params.itemsPerPage || 20;
	if (itemsPerPage > 100) throw 'Invalid quantity of items per page';
	queryProducts.skip(itemsPerPage * request.params.page || 0);
	queryProducts.limit(itemsPerPage);
	queryProducts.include('category');
	const resultProducts = await queryProducts.find({useMasterKey: true});
	return resultProducts.map(function(p){
		p = p.toJSON();
		return formatProduct(p);
	});
});

Parse.Cloud.define('get-category-list', async (request) => {
    const queryCategories = new Parse.Query(Category);
	const resultCategories = await queryCategories.find({useMasterKey: true});
	return resultCategories.map(function(c){
		c = c.toJSON();
		return {
			id: c.objectId,
			title: c.title,
		}
	});
});

Parse.Cloud.define('signup', async (request) => {
	if (request.params.fullName == null) throw 'INVALID_FULLNAME';
	if (request.params.phone == null) throw 'INVALID_PHONE';
	if (request.params.cpf == null) throw 'INVALID_CPF';
	const user = new Parse.User();
	user.set('username', request.params.email);
	user.set('email', request.params.email);
	user.set('password', request.params.password);
	user.set('fullName', request.params.fullName);
	user.set('phone', request.params.phone);
	user.set('cpf', request.params.cpf);
	try {
		const resultUser = await user.signUp(null, {useMasterKey: true});
		const userJson = resultUser.toJSON();
		return formatUser(userJson);
	} catch (error) {
		throw 'INVALID_DATA';
	}
});

Parse.Cloud.define('login', async (request) => {
	try {
		const user = await Parse.User.logIn(request.params.email, request.params.password);
		const userJson = user.toJSON();
		return formatUser(userJson);
	} catch (error) {
		throw 'INVALID_CREDENTIALS';
	}
});

Parse.Cloud.define('validate-token', async (request) => {
	// request.user...
	try {
		return formatUser(request.user.toJSON());
	} catch (error) {
		throw 'INVALID_TOKEN';
	}
});

Parse.Cloud.define('change-password', async (request) => {
	if (request.user == null) throw 'INVALID_USER';
	request.user.set('');
	const user = await Parse.User.logIn(request.params.email, request.params.currentPassword);
	if (user.id != request.user.id) throw 'INVALID_USER';
	user.set('password', request.params.newPassword);
	await user.save(null, {useMasterKey: true});
});

Parse.Cloud.define('reset-password', async (request) => {
	await Parse.User.requestPasswordReset(request.params.email);
});

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
			product: formatProduct(c.product),
		}
	});
});

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

function formatUser(userJson) {
	return {
		id: userJson.objectId,
		fullName: userJson.fullName,
		email: userJson.email,
		phone: userJson.phone,
		cpf: userJson.cpf,
		token: userJson.sessionToken
	}
}

function formatProduct(productJson) {
	return {
		id: productJson.objectId,
		title: productJson.title,
		description: productJson.description,
		price: productJson.price,
		unit: productJson.unit,
		picture: productJson.picture != null ? productJson.picture.url : null,
		category: {
			title: productJson.category.title,
			id: productJson.category.objectId
		},
	}
}