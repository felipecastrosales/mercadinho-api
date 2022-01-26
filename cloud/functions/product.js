const Product = Parse.Object.extend('Product');
const Category = Parse.Object.extend('Category');

Parse.Cloud.define('get-product-list', async (request) => {
    const queryProducts = new Parse.Query(Product);
	if (request.params.title != null) {
		queryProducts.fullText('title', request.params.title);
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

module.exports = {formatProduct};