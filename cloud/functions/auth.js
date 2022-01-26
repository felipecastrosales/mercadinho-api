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