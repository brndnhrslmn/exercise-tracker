
import "dotenv/config.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import express from 'express';
const app = express();
import cors from 'cors';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uri = process.env['MONGO_URI'];

mongoose.connect(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
	username: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
	uid: String,
	username: String,
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: String,
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors({ optionsSuccessStatus: 200 }));  // some legacy browsers choke on 204
app.use(express.static('public'));
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/', async (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
	await User.syncIndexes();
	await Exercise.syncIndexes();
});

// Get all users
app.get('/api/users', async (req, res) => {
	User.find({}, (err, users) => {
		if (err) {
			console.error(err);
		};

		if (users.length === 0) {
			res.json([]);
		};

		res.json(users);
	});
});

// Create new users
app.post('/api/users', async (req, res) => {
	var username = req.body.username
	if (!username) {
		console.log("Please provide a valid username!");
	} else {
		let user = { username: username };
		let newUser = new User(user);
		newUser.save((err, user) => {
			if (err) {
				console.error(err);
			};

			var response = { username: user.username, _id: user._id };
			res.json(response);
		});
	};
});

// Add new exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
	try {
		const uid = req.params._id;
		const description = req.body.description;
		const duration = req.body.duration;
		const date = req.body.date || new Date(Date.now()).toISOString().substring(0, 10);

		if (!uid) {
			console.log("Please provide a valid user id!");
			return res.json({ error: "Please provide a valid user id!" });
		} else if (!description) {
			console.log("Please provide a valid description!");
			return res.json({ error: "Please provide a valid description!" });
		} else if (!duration) {
			console.log("Please provide a valid duration!");
			return res.json({ error: "Please provide a valid duration!" });
		}

		User.findById(uid, (err, user) => {
			if (err) {
				console.error(err);
			};

			var exercise = { uid: user._id, username: user.username, description: description, duration: parseInt(duration), date: date };
			var newExercise = new Exercise(exercise);
			newExercise.save((err, exercise) => {
				if (err) {
					console.error(err);
				};

				var response = {
					_id: user._id,
					username: user.username,
					duration: exercise.duration,
					description: exercise.description,
					date: new Date(exercise.date).toDateString()
				}
				res.json(response);
			});
		});
	} catch (err) {
		console.log(err.message);
		return res.json([]);
	}
});

// Get user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
	try {
		const uid = req.params._id;
		const from = req.query.from || new Date(0).toISOString().substring(0, 10);
		const to = req.query.to || new Date(Date.now()).toISOString().substring(0, 10);
		const limit = Number(req.query.limit) || 0;

		var query = { uid: uid, date: { $gte: from, $lte: to } };
		const selection = 'description duration date';
		const options = { limit: limit };

		User.findById(uid, (err, user) => {
			if (err) {
				console.error(err);
			};

			Exercise.find(query, selection, options, (err, exercises) => {
				if (err) {
					console.error(err);
				};

				var response = {
					_id: user._id,
					username: user.username,
					count: exercises.length,
					log: exercises.map((exercise) => {
						return {
							description: exercise.description,
							duration: exercise.duration,
							date: new Date(exercise.date).toDateString()
						}
					})
				}
				res.json(response);
			});
		});
	} catch (err) {
		console.log(err.message);
		return res.json([]);
	}
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + (typeof listener.address() === 'string' ? listener.address() : listener.address().port));
});
