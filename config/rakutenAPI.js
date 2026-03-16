import 'dotenv/config';

export const getProductsByKeyword = async (keyword) => {
	const keywordTranslated = keyword;

	const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?applicationId=${process.env.RAKUTEN_APP_ID}&keyword=${keywordTranslated}&sort=%2BitemPrice`;
	const searchParams = new URLSearchParams(itemSearchEndpoint);

	try {
		const res = await fetch(itemSearchEndpoint, {
			headers: {
				Authorization: `Bearer ${process.env.RAKUTEN_ACCESS_KEY}`,
			},
		});
	} catch (err) {
		console.log(err);
	}
};
