const Product = Parse.Object.extend('Product');

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