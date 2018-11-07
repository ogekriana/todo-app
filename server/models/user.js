const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const _ = require('lodash')

var UserSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		minlength: 1,
		trim: true,
		unique: true,
		validate: {
			validator: (value) => {
				return validator.isEmail(value)
			}
		},
		message: `Email is not valid email`
	},
	password: {
		type: String,
		required: true,
		minlength: 6
	},
	tokens: [{
		access: {
			type: String,
			required: true
		},
		token: {
			type: String,
			required: true
		}
	}]
})

UserSchema.methods.toJSON = function() {
	var user = this
	var userObject = user.toObject()

	return _.pick(userObject, ['_id', 'email'])
}

UserSchema.statics.findByToken = function(token) {
	var user = this
	var undefined

	try{
		decode = jwt.verify(token, 'kegoanair123')
	}catch(e){
		// return new Promise((resolve, reject) => reject() )
		// OR
		return Promise.reject()
	}

	return user.findOne({
		'_id': decode._id,
		'tokens.token': token,
		'tokens.access': 'auth'
	})
}

UserSchema.methods.generateAuthToken = function() {
	var user = this
	var access = 'auth'
	var token = jwt.sign({_id: user._id.toHexString(), access}, 'kegoanair123').toString()

	// user.tokens.push({access, token})
	user.tokens = user.tokens.concat([{access, token}])
	// user.tokens = [ ...user.tokens, ...[{access, token}] ]


	return user.save().then(() => {
		return token
	})
}

var User = mongoose.model('User', UserSchema)

module.exports = { User }