import {Router} from 'express';
import { getIndex } from '../controllers/indexController';

const indexRouter = Router();

indexRouter.get('/', getIndex)

export default indexRouter;