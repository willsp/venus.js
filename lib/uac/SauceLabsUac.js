/*
 * Venus
 * Copyright 2013 LinkedIn
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing,
 *     software distributed under the License is distributed on an "AS
 *     IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *     express or implied.   See the License for the specific language
 *     governing permissions and limitations under the License.
 **/

var webdriver            = require('selenium-webdriver'),
    sauceConnectLauncher = require('sauce-connect-launcher'),
    log                  = require('../util/logger'),
    deferred             = require('deferred'),
    i18n                 = require('../util/i18n');

/**
 * Controls a webdriver script
 */
function SauceLabsUac(options) {

  this.server = [
    options.host || 'http://localhost',
    // ':',
    // options.port || 4444
  ].join('');

  if (this.server.indexOf('http://') !== 0) {
    this.server = 'http://' + this.server;
  }

  this.browserName = options.browser || 'firefox';
  this.browserVersion = options.version || '';

  this.options = options;

  this.sauceConnectLauncherOptions = {
    username: options.username,
    accessKey: options.accessKey,
    verbose: false,
    log: log.info,
    no_progress: false
  };
}

/**
 * Start the UAC
 */
SauceLabsUac.prototype.start = function () {
  var def     = deferred(),
      options = this.options,
      caps    = {
        browserName: this.browserName,
        version: this.browserVersion,
        username: options.username,
        accessKey: options.accessKey,
        platform: options.platform
      };

  log.info(i18n('Starting Sauce Connect process'));
  sauceConnectLauncher(this.sauceConnectLauncherOptions, function (err, sauceConnectProcess) {
    log.info(i18n('Sauce Connect Complete'));
    this.driver = new webdriver.Builder()
                               .withCapabilities(caps)
                               .usingServer(this.server + '/wd/hub/')
                               .build();

    this.driver.session_.then(
      function (e) {
        if (e.id) {
          log.info('WebDriver Session ID ' + e.id);
        }

        def.resolve(this);
      }.bind(this), function (e) {
          def.reject(e);
      }.bind(this)
    );

    this.driver.manage().timeouts().implicitlyWait(5000);
  }.bind(this));


  return def.promise;
};

/**
 * Stop the UAC
 */
SauceLabsUac.prototype.stop = function () {
  var def = deferred();
  this.driver.quit();
  def.resolve();
  return def.promise;
};

/**
 * Run a test
 * @param {String} url test url
 */
SauceLabsUac.prototype.loadUrl = function (url) {
  var browser = this.driver,
      loadUrl = url,
      def = deferred();

  browser.get(loadUrl).then(
    function () {

    },
    function (e) {
      log.error(loadUrl + ': ' + e.message);
    }
  );

  browser.findElement(webdriver.By.id('test-done-marker'))
      .then(function () {
        def.resolve();
      }, function () {
        log.error(loadUrl + ' test timeout');
        def.reject(loadUrl + ' test timeout');
      });

  return def.promise;
};

module.exports = SauceLabsUac;
Object.seal(module.exports);
