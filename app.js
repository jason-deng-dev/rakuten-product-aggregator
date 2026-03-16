import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import express from 'express';

const app = express();

const assetsPath = path.join(__dirname, 'public');
app.use(express.static(assetsPath));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));



app.use('/', indexRouter)



app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});