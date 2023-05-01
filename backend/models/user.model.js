const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
	email: {
		type: String,
		required: true,
		unique: true
	},
	password: {
		type: String,
		required: true
	},
	name: {
		type: String
	},
	image: {
		type: Buffer,
		contentType: String
	},
	role: {
		type: String,
		default: 'user'
	},
	favouritesProducts: {
		items: [
			{
				productId: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true
				}
			}
		]
	}
});

userSchema.statics.signup = async function (email, password) {
	if (!email || !password) {
		throw Error('All fields are required');
	}

	if (!validator.isEmail(email)) {
		throw Error('Email is not valid');
	}

	if (!validator.isStrongPassword(password)) {
		throw Error('Password is not strong enough');
	}

	const exists = await this.findOne({ email });

	if (exists) {
		throw Error('This email is already in use');
	}

	// The higher the value of saltRounds, the more secure the password is, but the longer the signup process takes
	const saltRounds = 10;
	const salt = await bcrypt.genSalt(saltRounds);
	const hash = await bcrypt.hash(password, salt);

	const user = await this.create({ email, password: hash });

	return user;
};

userSchema.statics.login = async function (email, password) {
	if (!email || !password) {
		throw Error('All fields are required');
	}

	if (!validator.isEmail(email)) {
		throw Error('Email is not valid');
	}

	const user = await this.findOne({ email });

	if (!user) {
		throw Error('Wrong email');
	}

	const match = await bcrypt.compare(password, user.password);

	if (!match) {
		throw Error('Incorrect password');
	}

	return user;
};

userSchema.statics.addToFavourites = async function (userId, productId) {
	const user = await this.findById(userId);

	if (!user) {
		throw Error('User not found');
	}

	const exists = user.favouritesProducts.items.find(
		(item) => item.productId.toString() === productId.toString()
	);

	if (exists) {
		throw Error('This product is already in favourites');
	}

	user.favouritesProducts.items.push({ productId });

	return user.save();
};

userSchema.statics.removeFromFavourites = async function (userId, productId) {
	const user = await this.findById(userId);

	if (!user) {
		throw Error('User not found');
	}

	user.favouritesProducts.items = user.favouritesProducts.items.filter(
		(item) => item.productId.toString() !== productId.toString()
	);

	return user.save();
};

userSchema.statics.getFavourites = async function (userId) {
	const user = await this.findById(userId).populate(
		'favouritesProducts.items.productId'
	);

	if (!user) {
		throw Error('User not found');
	}

	return user.favouritesProducts.items;
};

userSchema.statics.updateProfile = async function (userId, data) {
	const user = await this.findById(userId);

	if (!user) {
		throw Error('User not found');
	}
	const { name, image, favourites } = data;

	user.name = name || user.name;
	user.image = image || user.image;
	user.favouritesProducts.items = favourites || user.favouritesProducts.items;

	return user.save();
};

module.exports = mongoose.model('User', userSchema);