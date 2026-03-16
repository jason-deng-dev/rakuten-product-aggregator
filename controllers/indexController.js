export const getIndex = async (req, res, next) => {
	try {
		res.render('index');
	} catch {
		next(err);
	}
};
