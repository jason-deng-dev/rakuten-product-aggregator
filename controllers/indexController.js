import { getProductsByKeyword } from '../config/rakutenAPI.js';

getProductsByKeyword('running', 1)

export const getIndex = async (req, res, next) => {
	try {
		res.render('index');
	} catch (err) {
		next(err);
	}
};
