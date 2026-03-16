import {Router} from 'express';
import { getIndex } from '../controllers/indexController.js';

const indexRouter = Router();

indexRouter.get('/', getIndex)

export default indexRouter;