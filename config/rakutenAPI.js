import 'dotenv/config';

export const getProductsByKeyword = async (keyword) => {
	const keywordTranslated = keyword;

	const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&keyword=running&hits=1&availability=1&applicationId=${process.env.RAKUTEN_APP_ID}`;
	try {
		const res = await fetch(itemSearchEndpoint, {
			headers: {
				Referer: process.env.RAKUTEN_REFERRER,
				Origin: process.env.RAKUTEN_REFERRER,
                accessKey: process.env.RAKUTEN_ACCESS_KEY
			},
		});
		const resJson = await res.json();

		console.log(resJson);
	} catch (err) {
		console.log(err);
	}
};
