const Product = Parse.Object.extend('Product');

Parse.Cloud.define('hello', (request) => {
	return 'Hello world from Mercadinho!';
});

Parse.Cloud.define('get-product-list', async (request) => {
    const queryProducts = new Parse.Query(Product);
	// Conditionals 
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
		} 
	});
});