#!/usr/bin/env node

const fs = require('fs');
const Nightmare = require('nightmare');

require('nightmare-download-manager')(Nightmare);

if (!process.env.ACCOUNT_LOGIN) {
  console.log("env ACCOUNT_LOGIN not set");
  process.exit(1);
}

if (!process.env.ACCOUNT_PASSWORD) {
  console.log("env ACCOUNT_PASSWORD not set");
  process.exit(1);
}

var downloadDir = '.';

if (process.argv[2]) {
  downloadDir = process.argv[2];
}

try {
  downloadDir = fs.realpathSync(downloadDir);
  fs.accessSync(downloadDir, fs.F_OK);
} catch (e) {
  console.log("directory '" + downloadDir +  "' is not a directory or not writeable. exiting.");
  process.exit(1);
}

console.log('will download invoices to: ' + downloadDir);

nightmare = Nightmare({
  show: !!process.env.DEBUG,
  paths: {
    downloads: downloadDir
  }
});

nightmare.on('download', function(state, downloadItem){
  if (state == 'started') {
    console.log("downloading invoice " +  downloadItem['filename'] );
    nightmare.emit('download', downloadItem);
  }
})

nightmare
  .downloadManager()
  .goto('https://kabel.vodafone.de/customerSSO/UI/Login?goto=https://kabel.vodafone.de/meinkabel/rechnungen/rechnung')
  .type('input#IDToken1', process.env.ACCOUNT_LOGIN)
  .type('input#IDToken2', process.env.ACCOUNT_PASSWORD)
  .click('form[name="Login"] [type=submit]')
  .wait('div.accordion')
  .evaluate(function () {

    var buttons = document.querySelectorAll("a[href^='/meinkabel/rechnungen/rechnung_download']");
    return Array.prototype.map.call(buttons, function(e) {
      return e.getAttribute('href')
    });
  })
  .then((urls) => {
    urls.forEach(function(url) {
      nightmare
        .click("a[href^='" + url.trim() + "']")
        .waitDownloadsComplete()
    });
    nightmare.waitDownloadsComplete();
    return nightmare.end();
  })
  .catch(function (error) {
    console.error('failed:', error);
  });
