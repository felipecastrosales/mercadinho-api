const Product = Parse.Object.extend('Product');
const Category = Parse.Object.extend('Category');
const User = Parse.Object.extend('User');

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
		return {
			id: p.objectId,
			title: p.title,
			description: p.description,
			price: p.price,
			unit: p.unit,
			picture: p.picture != null ? p.picture.url : null,
			category: {
				title: p.category.title,
				id: p.category.objectId
			},
		}
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
