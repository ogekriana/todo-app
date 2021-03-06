const expect = require('expect')
const request = require('supertest')
const { ObjectID } = require('mongodb')

const { app } = require('./../server')
const { Todo } = require('./../models/todo')
const { User } = require('./../models/user')
const { todos, populateTodo, users, populateUser } = require('./seed/seed');

beforeEach(populateUser);
beforeEach(populateTodo);

describe('POST /todos', () => {
	it('should create a new todo', (done) => {
		let text = 'testing new todo'

		request(app)
			.post('/todos')
			.set('x-auth', users[0].tokens[0].token)
			.send({text})
			.expect(200)
			.expect((res) => {
				expect(res.body.text).toBe(text)
			})
			.end((err, res) => {
				if(err)
					return done(err)

				Todo.find({text: text}).then((todos) => {
					expect(todos.length).toBe(1)
					expect(todos[0].text).toBe(text)
					done()
				}).catch(e => done(e))
			})
	})

	it('should not create todo with invalid data', (done) => {
		let text = ''
		request(app)
			.post('/todos')
			.set('x-auth', users[0].tokens[0].token)
			.send({text})
			.expect(400)
			.end((err, res) => {
				if(err)
					return done(err)

				Todo.find().then((todos) => {
					expect(todos.length).toBe(2)
					done()
				}).catch((e) => done(e))
			})
	})
})

describe('GET /todos', () => {
	it('should get list of todo', (done) => {
		request(app)
			.get('/todos')
			.set('x-auth', users[0].tokens[0].token)
			.expect(200)
			.expect((res) => {
				expect(res.body.todos.length).toBe(1)
			})
			.end(done)
	})
})

describe('GET /todos/:id', () => {
	it('should return todo doc', (done) => {
		request(app)
			.get(`/todos/${todos[0]._id.toHexString()}`)
			.set('x-auth', users[0].tokens[0].token)
			.expect(200)
			.expect((res) => {
				expect(res.body.todo.text).toBe(todos[0].text)
			})
			.end(done)
	})

	it('should not return todo doc cerated by other user', (done) => {
		request(app)
			.get(`/todos/${todos[1]._id.toHexString()}`)
			.set('x-auth', users[0].tokens[0].token)
			.expect(404)
			.end(done)
	})

	it('should return 404 if todo not found', (done) => {
		let hexId = new ObjectID()

		request(app)
			.get(`/todos/${hexId}`)
			.set('x-auth', users[1].tokens[0].token)
			.expect(404)
			.end(done)
	})

	it('should return 404 for non-objectid', (done) => {
		request(app)
			.get('/todos/123aaa')
			.set('x-auth', users[0].tokens[0].token)
			.expect(404)
			.end(done)
	})
})

describe('DELETE /todos/:id', () => {
	it('should remove a todo', (done) => {
		let hexid = todos[0]._id.toHexString()
		request(app)
			.delete(`/todos/${hexid}`)
			.set('x-auth', users[1].tokens[0].token)
			.expect(200)
			.expect((res) => {
				expect(res.body.todo._id).toBe(hexid)
			})
			.end((err, res) => {
				if(err)
					return done(err)

				Todo.findById(hexid).then((todo) => {
					expect(todo).toNotExist()
					done()
				}).catch((e) => done(e))
			})
	})

	it('should not remove a todo', (done) => {
		let hexid = todos[1]._id.toHexString()
		request(app)
			.delete(`/todos/${hexid}`)
			.set('x-auth', users[0].tokens[0].token)
			.expect(404)
			.end((err, res) => {
				if(err)
					return done(err)

				Todo.findById(hexid).then((todo) => {
					expect(todo).toExist()
					done()
				}).catch((e) => done(e))
			})
	})

	it('should return 404 if todo not found', (done) => {
		let hexId = new ObjectID()

		request(app)
			.delete(`/todos/${hexId}`)
			.set('x-auth', users[1].tokens[0].token)
			.expect(404)
			.end(done)
	})

	it('should return 404 for non-objectid', (done) => {
		request(app)
			.delete('/todos/123aaa')
			.set('x-auth', users[1].tokens[0].token)
			.expect(404)
			.end(done)
	})
})

describe('PATCH /todos/:id', () => {
	it('should updated the todo', (done) => {
		let hexid = todos[0]._id.toHexString()
		let text = 'testing update the data'

		request(app)
			.patch(`/todos/${hexid}`)
			.set('x-auth', users[0].tokens[0].token)
			.send({
				text,
				completed: true
			})
			.expect(200)
			.expect((res) => {
				expect(res.body.todo.text).toBe(text)
				expect(res.body.todo.completed).toBe(true)
				expect(res.body.todo.completedAt).toBeA('number')
			})
			.end(done)
	})

	it('should not updated the todo of other user', (done) => {
		let hexid = todos[1]._id.toHexString()
		let text = 'testing update the data'

		request(app)
			.patch(`/todos/${hexid}`)
			.set('x-auth', users[0].tokens[0].token)
			.send({
				text,
				completed: true
			})
			.expect(404)
			.end(done)
	})

	it('should clear completedAt when todo is not complete', (done) => {
		let hexid = todos[0]._id.toHexString()
		let text = 'testing update the data from testing'

		request(app)
			.patch(`/todos/${hexid}`)
			.set('x-auth', users[0].tokens[0].token)
			.send({
				text,
				completed: false
			})
			.expect(200)
			.expect((res) => {
				expect(res.body.todo.text).toBe(text)
				expect(res.body.todo.completed).toBe(false)
				expect(res.body.todo.completedAt).toNotExist
			})
			.end(done)
	})
})

describe('GET /users/me', () => {
	it('should return user if authenticated', (done) => {
		request(app)
			.get('/users/me')
			.set('x-auth', users[0].tokens[0].token)
			.expect(200)
			.expect((res) => {
				expect(res.body._id).toBe(users[0]._id.toHexString())
				expect(res.body.email).toBe(users[0].email)
			})
			.end(done)
	})

	it('should return 401 if not authenticated', (done) => {
		request(app)
			.get('/users/me')
			.expect(401)
			.expect((res) => {
				expect(res.body).toEqual({})
			})
			.end(done)
	})	
})

describe('POST /users', () => {
	it('should create user', (done) => {
		let email = 'mahliariana@gmail.com'
		let password = 'lalayeyeye'

		request(app)
			.post('/users')
			.send({ email, password })
			.expect(200)
			.expect((res) => {
				expect(res.header['x-auth']).toExist()
				expect(res.body._id).toExist()
				expect(res.body.email).toBe(email)
			})
			.end((err, res) => {
				if(err)
					return done(err)

				User.findOne({email}).then((user) => {
					expect(user).toExist()
					expect(user.password).toNotEqual(password)
					done()
				}).catch((e) => done(e))
			})
	})

	it('should return validation error if invalid request', (done) => {
		request(app)
			.post('/users')
			.send({
				email: 'lalayeye',
				password: 'haha',
			})
			.expect(400)
			.end(done)
	})

	it('should not cerate user if user exist', (done) => {
		request(app)
			.post('/users')
			.send({
				email: users[0].email,
				password: 'lalayeyeye'
			})
			.expect(400)
			.end(done)
	})
})

describe('POST /users/login', () => {
	it('should login user and return auth token', (done) => {
		request(app)
			.post('/users/login')
			.send({
				email: users[1].email,
				password: users[1].password
			})
			.expect(200)
			.expect((res) => {
				expect(res.header['x-auth']).toExist()
			})
			.end((err, res) => {
				if(err)
					done(err)

				User.findById(users[1]._id).then((user) => {
					expect(user.tokens[1]).toInclude({
						access: 'auth',
						token: res.header['x-auth']
					})
					done()
				}).catch((e) => done(e))
			})
	})

	it('should reject invalid login', (done) => {
		request(app)
			.post('/users/login')
			.send({
				email: users[1].email,
				password: users[1].password+'123'
			})
			.expect(400)
			.expect((res) => {
				expect(res.header['x-auth']).toNotExist()
			})
			.end((err, res) => {
				if(err)
					done(err)

				User.findById(users[1]._id).then((user) => {
					expect(user.tokens.length).toBe(1)
					done()
				}).catch((e) => done(e))
			})

	})
})

describe('DELETE /users/me/token', () => {
	it('should remove a token when logout', (done) => {
		request(app)
			.delete('/users/me/token')
			.set('x-auth', users[0].tokens[0].token)
			.expect(200)
			.end((err, res) => {
				if(err)
					done(err)

				User.findById(users[0]._id).then((user) => {
					expect(user.tokens.length).toBe(0)
					done()
				}).catch((e) => done(e))
			})
	})
})