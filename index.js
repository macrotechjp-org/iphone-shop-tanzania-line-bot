const fs = require('fs');
const { promisify } = require('util');
const webdriver = require('selenium-webdriver');
const { Builder, By, until } = webdriver;
const cheerio = require('cheerio');
const moment = require('moment');

const capabilities = webdriver.Capabilities.chrome();
capabilities.set('chromeOptions', {
    args: [
        '--headless',
        // '--no-sandbox',
        // '--disable-gpu',
        '--window-size=1200,800'
    ]
});

const line = require('@line/bot-sdk');
const config = {
  channelSecret: '5c5ab2b8132ffa091b99914c319e1745',
  channelAccessToken: 'ZDMD5aTfa53jR4Uz6gpde9ZUGpERfikCyNOqo+b9vw+1tVI/uGqLa2ZJiOxDQUgHx3Pvc9U/SRqlO66ivCVgKe9C2URbP31HYae8WPCOOD/U/aSdN2KYZyzm/jv/aL8oNSEnqmjDd2IZJto/3pDAKQdB04t89/1O/w1cDnyilFU='
};
const client = new line.Client(config);

// awaitを使うので、asyncで囲む
(async () => {

  let jsonData = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
  let lineBotColumns = [];

  const driver = await new Builder().withCapabilities(capabilities).build();
  driver.manage().window().maximize()

  // 1) iPhone6s Plus → メルカリ
  let mercariNum = 0;
  await driver.get('https://jp.mercari.com/search?t3_category_id=859&t2_category_id=100&t1_category_id=7&category_id=859&order=desc&sort=created_time&status=on_sale&keyword=iphone%206s%20plus&price_max=9000');
  while (true){
    await driver.wait(until.elementLocated(By.css('#item-grid > li')), 10000);
    await driver.sleep(3000)

    const pageSource = await driver.wait(until.elementLocated(By.css('body')), 3000).getAttribute('innerHTML');
    const $ = cheerio.load(pageSource);

    // console.log($('#item-grid li').length);
    // console.log($('#item-grid li a').length);
    // console.log($('#item-grid li a mer-item-thumbnail').length);
    // console.log($('#item-grid li a')[0].attribs.href);
    // console.log($('#item-grid li a mer-item-thumbnail')[0].attribs.src);
    // console.log($('#item-grid li a mer-item-thumbnail')[0].attribs.alt);
    // console.log($('#item-grid li a mer-item-thumbnail')[0].attribs.price);

    for (let index = 0; index < $('#item-grid li').length; index++) {
      console.log("mercari : "+(++mercariNum));
      const iphoneData = {
        key: $('#item-grid li a')[index].attribs.href,
        imageUrl: $('#item-grid li a mer-item-thumbnail')[index].attribs.src,
        name: $('#item-grid li a mer-item-thumbnail')[index].attribs.alt,
        price: $('#item-grid li a mer-item-thumbnail')[index].attribs.price
      }
      if (jsonData.mercari.iphoneList[iphoneData.key]) {
        if (jsonData.mercari.iphoneList[iphoneData.key].price != iphoneData.price) {
          // 登録済み商品[値下げ有り]
          jsonData.mercari.iphoneList[iphoneData.key] = iphoneData;
          lineBotColumns.push({
            "imageUrl": iphoneData.imageUrl,
            "action": {
              "type": "uri",
              "label": "⏬ : ¥ "+iphoneData.price,
              "uri": "https://jp.mercari.com"+iphoneData.key
            }
          });
        } else {
          // 登録済み商品[値下げ無し]な為、スキップ
        }
      } else {
        // 未登録商品
        if (iphoneData.name.toLowerCase().includes('iphone')
          && iphoneData.name.toLowerCase().includes('6s')
          && iphoneData.name.toLowerCase().includes('plus'))
        {
          jsonData.mercari.iphoneList[iphoneData.key] = iphoneData;
          lineBotColumns.push({
            "imageUrl": iphoneData.imageUrl,
            "action": {
              "type": "uri",
              "label": "🆕 : ¥ "+iphoneData.price,
              "uri": "https://jp.mercari.com"+iphoneData.key
            }
          });
        }
      }
    }
    // ページネーション
    if ($('mer-button[data-testid^=pagination-next-button]').html()) {
      await driver.findElement(By.css("mer-button[data-testid^=pagination-next-button]")).click();
    } else {
      break;
    }
  }

  // 2) PayPayフリマ
  let paypayhurimaNum = 0;
  let paypayhurimaPage = 1;
  while (true){
    await driver.get('https://paypayfleamarket.yahoo.co.jp/search/iPhone%206s%20Plus?categoryIds=2502%2C38338%2C38340&maxPrice=9000&open=1&page='+paypayhurimaPage);
    const pageSource = await driver.wait(until.elementLocated(By.css('body')), 3000).getAttribute('innerHTML');
    const $ = cheerio.load(pageSource);

    // console.log($('#itm a').length);
    // console.log($('#itm a img').length);
    // console.log($('#itm a .ItemThumbnail__Price-tlgyjt-3').length);
    // console.log($('#itm a')[0].attribs.href);
    // console.log($('#itm a img')[0].attribs.src);
    // console.log($('#itm a img')[0].attribs.alt);
    // console.log($('#itm a .ItemThumbnail__Price-tlgyjt-3')[0].children[0].data);

    if ($('#itm a').length == 0) break;

    for (let index = 0; index < $('#itm a').length; index++) {
      console.log("paypayhurima : "+(++paypayhurimaNum));
      const iphoneData = {
        key: $('#itm a')[index].attribs.href,
        imageUrl: $('#itm a img')[index].attribs.src,
        name: $('#itm a img')[index].attribs.alt,
        price: $('#itm a .ItemThumbnail__Price-tlgyjt-3')[index].children[0].data
      }
      if (jsonData.paypayhurima.iphoneList[iphoneData.key]) {
        if (jsonData.paypayhurima.iphoneList[iphoneData.key].price != iphoneData.price) {
          // 登録済み商品[値下げ有り]
          jsonData.paypayhurima.iphoneList[iphoneData.key] = iphoneData;
          lineBotColumns.push({
            "imageUrl": iphoneData.imageUrl,
            "action": {
              "type": "uri",
              "label": "⏬ : ¥ "+iphoneData.price,
              "uri": "https://paypayfleamarket.yahoo.co.jp"+iphoneData.key
            }
          });
        } else {
          // 登録済み商品[値下げ無し]な為、スキップ
        }
      } else {
        // 未登録商品
        if (iphoneData.name.toLowerCase().includes('iphone')
          && iphoneData.name.toLowerCase().includes('6s')
          && iphoneData.name.toLowerCase().includes('plus'))
        {
          jsonData.paypayhurima.iphoneList[iphoneData.key] = iphoneData;
          lineBotColumns.push({
            "imageUrl": iphoneData.imageUrl,
            "action": {
              "type": "uri",
              "label": "🆕 : ¥ "+iphoneData.price,
              "uri": "https://paypayfleamarket.yahoo.co.jp"+iphoneData.key
            }
          });
        }
      }
    }
    // ページネーション
    paypayhurimaPage++;
  }

  // 3) ラクマ
  let rakumaNum = 0;
  let rakumaPage = 1;
  while (true){
    await driver.get('https://fril.jp/s?category_id=668&max=9000&order=desc&query=iPhone+6s+Plus&sort=created_at&transaction=selling&page='+rakumaPage);
    const pageSource = await driver.wait(until.elementLocated(By.css('body')), 3000).getAttribute('innerHTML');
    const $ = cheerio.load(pageSource);

    // console.log($('.view.view_grid .item').length);
    // console.log($('.view.view_grid .item a.link_search_image').length);
    // console.log($('.view.view_grid .item a.link_search_image img').length);
    // console.log($('.view.view_grid .item p.item-box__item-price').length);
    // console.log($('.view.view_grid .item a.link_search_image')[0].attribs.href);
    // console.log($('.view.view_grid .item a.link_search_image img')[0].attribs.src);
    // console.log($('.view.view_grid .item a.link_search_image img')[0].attribs.alt);
    // console.log($('.view.view_grid .item p.item-box__item-price')[0].children[1].attribs['data-content']);

    if ($('.view.view_grid .item').length == 0) break;

    for (let index = 0; index < $('.view.view_grid .item').length; index++) {
      console.log("rakuma : "+(++rakumaNum));
      const iphoneData = {
        key: $('.view.view_grid .item a.link_search_image')[index].attribs.href,
        imageUrl: $('.view.view_grid .item a.link_search_image img')[index].attribs.src,
        name: $('.view.view_grid .item a.link_search_image img')[index].attribs.alt,
        price: $('.view.view_grid .item p.item-box__item-price')[index].children[1].attribs['data-content']
      }
      if (jsonData.rakuma.iphoneList[iphoneData.key]) {
        if (jsonData.rakuma.iphoneList[iphoneData.key].price != iphoneData.price) {
          // 登録済み商品[値下げ有り]
          jsonData.rakuma.iphoneList[iphoneData.key] = iphoneData;
          lineBotColumns.push({
            "imageUrl": iphoneData.imageUrl,
            "action": {
              "type": "uri",
              "label": "⏬ : ¥ "+iphoneData.price,
              "uri": iphoneData.key
            }
          });
        } else {
          // 登録済み商品[値下げ無し]な為、スキップ
        }
      } else {
        // 未登録商品
        if (iphoneData.name.toLowerCase().includes('iphone')
          && iphoneData.name.toLowerCase().includes('6s')
          && iphoneData.name.toLowerCase().includes('plus'))
        {
          jsonData.rakuma.iphoneList[iphoneData.key] = iphoneData;
          lineBotColumns.push({
            "imageUrl": iphoneData.imageUrl,
            "action": {
              "type": "uri",
              "label": "🆕 : ¥ "+iphoneData.price,
              "uri": iphoneData.key
            }
          });
        }
      }
    }
    // ページネーション
    rakumaPage++;
  }

  // Window Close
  driver.quit();

  // JSONファイル保存
  fs.writeFile('./data.json', JSON.stringify(jsonData, null, '    '), function(err, result) {
    if(err) console.log('error', err);
  });

  // Line Bot 送信
  console.log("送信件数 : "+lineBotColumns.length);
  if (lineBotColumns.length != 0) {
    try {
      const res = await client.broadcast([{
        "type": "text",
        "text": moment(new Date()).format('YYYY年MM月DD日 HH:mm')
      }]);
      console.log(res);
      for (let index = 0; index < lineBotColumns.length; index+=10) {
        const res = await client.broadcast([{
          "type": "template",
          "altText": "This is a iPhone images " + index/10,
          "template": {
            "type": "image_carousel",
            "columns": lineBotColumns.splice(0, 10),
          }
        }]);
        console.log(res);
      }
    } catch (error) {
      console.log(`エラー: ${error.statusMessage}`);
      console.log(error.originalError.response.data);
    }
  }
})();