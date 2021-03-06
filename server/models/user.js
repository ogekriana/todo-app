const mongoose = require('mongoose')
const validator = require('validator')
const jwt = require('jsonwebtoken')
const _ = require('lodash')
const bcrypt = require('bcryptjs')

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
	let seletedObject = _.pick(userObject, ['_id', 'email', ''])
	seletedObject.token = userObject.tokens[0].token

	return seletedObject
}

UserSchema.methods.generateAuthToken = function() {
	var user = this
	var access = 'auth'
	var token = jwt.sign({_id: user._id.toHexString(), access}, process.env.JWT_SECRET, {
      expiresIn: 86400 // expires in 24 hours
    }).toString()

	// user.tokens.push({access, token})
	// user.tokens = [ ...user.tokens, ...[{access, token}] ]
	user.tokens = user.tokens.concat([{access, token}])

	return user.save().then(() => {
		return token
	})
}

UserSchema.methods.removeToken = function(token) {
	var user = this
	return user.update({ $pull: {
		tokens: {token}
	} })
}

UserSchema.statics.findByToken = function(token) {
	var user = this
	var decode

	try{
		decode = jwt.verify(token, process.env.JWT_SECRET)
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

UserSchema.statics.findByCredentials = function(email, password) {
	var user = this
	return user.findOne({email}).then((user) => {
		if(!user)
			return Promise.reject()

		return new Promise((resolve, reject) => {
			bcrypt.compare(password, user.password, (err, res) => {
				if(res)
					resolve(user)
				else
					reject()
			})
		})
	})
}

UserSchema.pre('save', function(next){
	let user = this
	if(user.isModified('password')){
		bcrypt.genSalt(10, (err, salt) => {
			bcrypt.hash(user.password, salt, (err, hash) => {
				user.password = hash
				next()
			})
		})
	}else{
		next()
	}
})

var User = mongoose.model('User', UserSchema)

module.exports = { User }