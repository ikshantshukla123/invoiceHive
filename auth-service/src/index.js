import express from 'express';
import bodyParser from 'body-parser';
import {PORT} from './config/env.js';
import {connectDB} from './config/db.js';
const app = express();
app.use(bodyParser.json());

connectDB();

app.get('/', (req, res) => {
  res.send('Auth service is up and running!');
});

app.listen(PORT, () => {
  console.log(`Auth service is running on port ${PORT}`);
});