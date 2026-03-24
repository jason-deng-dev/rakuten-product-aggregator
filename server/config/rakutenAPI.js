import 'dotenv/config';
import { sportsApparelGenres } from './genres.js';

export const getProductsByKeyword = async (
	keyword,
	count,
	sortMode,
) => {

	const translatedKeyword = keyword;
	const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&keyword=${translatedKeyword}&hits=${count}&availability=1&applicationId=${process.env.RAKUTEN_APP_ID}&sort=${sortMode}`;
	try {
		const res = await fetch(itemSearchEndpoint, {
			headers: {
				Referer: process.env.RAKUTEN_REFERRER,
				Origin: process.env.RAKUTEN_REFERRER,
				accessKey: process.env.RAKUTEN_ACCESS_KEY,
			},
		});
		const resJson = await res.json();
		const items = resJson.Items;
		// const items = mockAPICall();
		const normalizedItem = normalizeItems(items)
		return normalizedItem;

	} catch (err) {
		console.log(err);
	}
};

export const getProductsByGenresId = async (
	genreId,
	count,
	sortMode,
) => {
	const itemSearchEndpoint = `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&genreId=${genreId}&availability=1&hits=${count}&sort=${sortMode}&applicationId=${process.env.RAKUTEN_APP_ID}`;

	try {
		const res = await fetch(itemSearchEndpoint, {
			headers: {
				Referer: process.env.RAKUTEN_REFERRER,
				Origin: process.env.RAKUTEN_REFERRER,
				accessKey: process.env.RAKUTEN_ACCESS_KEY,
			},
		});
		const resJson = await res.json();
		const items = resJson.Items;
		const normalizedItem = normalizeItems(items)
		console.log(normalizedItem)
		return normalizedItem;
	} catch (err) {
		console.log(err)
	}
};

// getProductsByGenresId(568476, 1, 'standard')


function normalizeItems(items) {
	return items.map(
		({
			Item: {
				itemName,
				itemPrice,
				itemCaption,
				itemUrl,
				smallImageUrls,
				mediumImageUrls,
				reviewCount,
				reviewAverage,
				shopName,
				shopCode,
				genreId,
				tagIds,
			},
		}) => ({
			itemName,
			itemPrice,
			itemCaption,
			itemUrl,
			smallImageUrls,
			mediumImageUrls,
			reviewCount,
			reviewAverage,
			shopName,
			shopCode,
			genreId,
			tagIds,
		}),
	);
}

function mockAPICall() {
	return [
		{
			Item: {
				itemName:
					'ナイキ AIR WINFLO 11 エア ウィンフロー 11 FJ9509-001 メンズ 陸上/ランニング ランニングシューズ : ブラック×ホワイト NIKE imbkk',
				catchcopy: '',
				itemCode: 'alpen:10467589',
				itemPrice: 6587,
				itemPriceBaseField: 'item_price_min3',
				itemPriceMax1: 6587,
				itemPriceMax2: 6587,
				itemPriceMax3: 6587,
				itemPriceMin1: 6587,
				itemPriceMin2: 6587,
				itemPriceMin3: 6587,
				itemCaption:
					'◇バランスの良い履き心地でランを後押し。ウィンフロー 11は、ランニングのペースアップをサポートします。フルレングスのNike Airクッショニングを搭載。ウィンフロー 10よりも、前足部はゆったり、かかとは幅広のデザインで、通気性が格段に向上。毎日でも走りたくなる履き心地が絶好調の状態につながり、翌日ランニングに戻ってもさらにコンディションがアップします。■カラー(メーカー表記):ブラック×ホワイト(001:ブラック/ホワイト/アンスラサイト/クールグレー)■甲材(アッパー):合成繊維■底材(ソール):ゴム底■生産国:ベトナム■2024年モデル※ブランドやシリーズによっては甲高や幅等小さめに作られていることがあります。あくまで目安としてご判断ください。※こちらの商品は店頭と在庫を共有しているためパッケージの一部破損や試着による若干の汚損がある場合がございます。初期不良以外、上記の理由による返品交換は致しかねます。予めご了承いただけますようよろしくお願いします。アルペン alpen スポーツデポ SPORTSDEPO スポーツシューズ ランニングシューズ ランニング シューズ ジョギングシューズ マラソンシューズ エアウィンフロー11 220713runout 1222RUN43online 43RUNCL',
				itemUrl:
					'https://item.rakuten.co.jp/alpen/4303565814/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053',
				shopUrl:
					'https://www.rakuten.co.jp/alpen/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053',
				smallImageUrls: [
					{
						imageUrl:
							'https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_8.jpg?_ex=64x64',
					},
					{
						imageUrl:
							'https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_1.jpg?_ex=64x64',
					},
					{
						imageUrl:
							'https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_2.jpg?_ex=64x64',
					},
				],
				mediumImageUrls: [
					{
						imageUrl:
							'https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_8.jpg?_ex=128x128',
					},
					{
						imageUrl:
							'https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_1.jpg?_ex=128x128',
					},
					{
						imageUrl:
							'https://thumbnail.image.rakuten.co.jp/@0_mall/alpen/cabinet/img/757/4303565814_2.jpg?_ex=128x128',
					},
				],
				affiliateUrl: '',
				shopAffiliateUrl: '',
				imageFlag: 1,
				availability: 1,
				taxFlag: 0,
				postageFlag: 1,
				creditCardFlag: 1,
				shopOfTheYearFlag: 0,
				shipOverseasFlag: 0,
				shipOverseasArea: '',
				asurakuFlag: 0,
				asurakuClosingTime: '',
				asurakuArea: '',
				affiliateRate: 4,
				startTime: '',
				endTime: '',
				reviewCount: 62,
				reviewAverage: 4.85,
				pointRate: 5,
				pointRateStartTime: '2026-03-13 19:00',
				pointRateEndTime: '2026-03-19 13:59',
				giftFlag: 0,
				shopName: 'アルペン楽天市場店',
				shopCode: 'alpen',
				genreId: '509058',
				tagIds: [Array],
			},
		},
		{
			Item: {
				itemName:
					'【セール】サッカニー Saucony SPECIAL PRICE メンズ KINVARA 15 キンバラ15 ランニング マラソン ジョギング トレーニング ジム フィットネス スポーツ 運動靴 日常ラン 負担軽減 サポート S20967',
				catchcopy:
					'1898年創業 100年以上にわたりランニングに携わってきた私たちは、ボストン郊外の地元の工場からグローバルブランドへと成長し、世界中でランニングの楽しさを発信しています',
				itemCode: 'saucony:10000049',
				itemPrice: 8800,
				itemPriceBaseField: 'item_price_min3',
				itemPriceMax1: 8800,
				itemPriceMax2: 8800,
				itemPriceMax3: 8800,
				itemPriceMin1: 8800,
				itemPriceMin2: 8800,
				itemPriceMin3: 8800,
				itemCaption:
					'商品情報 ITEM DETAILS まるで羽のように軽い履き心地。KINVARA 15は、柔軟性とクッション性を兼ね備えた、デイリーランに最適なランニングシューズです。軽量で無駄のないデザインに、PWRRUNクッションとSRSソックライナーを搭載し、長距離でも快適に走れるサポート力を発揮します。',
				itemUrl:
					'https://item.rakuten.co.jp/saucony/mens-kin-15/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053',
				shopUrl:
					'https://www.rakuten.co.jp/saucony/?rafcid=wsc_i_is_a59b19a1-7865-4250-ba83-cfced1d12053',
				smallImageUrls: [Array],
				mediumImageUrls: [Array],
				affiliateUrl: '',
				shopAffiliateUrl: '',
				imageFlag: 1,
				availability: 1,
				taxFlag: 0,
				postageFlag: 1,
				creditCardFlag: 1,
				shopOfTheYearFlag: 0,
				shipOverseasFlag: 0,
				shipOverseasArea: '',
				asurakuFlag: 0,
				asurakuClosingTime: '',
				asurakuArea: '',
				affiliateRate: 4,
				startTime: '',
				endTime: '',
				reviewCount: 0,
				reviewAverage: 0,
				pointRate: 1,
				pointRateStartTime: '',
				pointRateEndTime: '',
				giftFlag: 0,
				shopName: 'Sauconyサッカニー公式楽天市場店',
				shopCode: 'saucony',
				genreId: '509058',
				tagIds: [Array],
			},
		},
	];
}


// ===== 演示用代码 =====

// 从 genres.js 获取运动太阳镜的乐天类别ID
const sunglassId = sportsApparelGenres['Sports Sunglasses']

// 演示1：按关键词搜索商品（实时调用乐天API）
console.log(await getProductsByKeyword('running shoes', 1, 'standard'))

// 演示2：按类别ID从乐天API实时抓取商品数据
console.log(await getProductsByGenresId(sunglassId, 1, 'standard'))