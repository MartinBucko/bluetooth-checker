/**
 * Watch bluetoot devices show up again and run some shell script.
 * See docs of package noble to install prerequisites.
 *
 * @docs https://github.com/noble/noble#running-on-linux
 */
const noble = require('noble');
const { exec } = require('child_process');
const { DateTime } = require('luxon');
const _ = require('lodash');
// const explorer = require('./exlorer');

const {
  watchNames,
  watchTimeout,
  watchMinRssi,
  watchCmd,
  serviceUUIDs,
  allowDuplicates,
  filterProps
} = require('./config');

// store of last devices visible time
const devices = [];

const logTime = () =>
  DateTime.local().toLocaleString(DateTime.TIME_24_WITH_SECONDS);

const logger = on => data =>
  console.log(
    logTime(),
    on.toUpperCase(),
    typeof data === 'string'
      ? data
      : _.chain(data)
          .omit(filterProps)
          .omitBy(_.isFunction)
          .value()
  );

const loggerDated = props => console.log(logTime(), JSON.stringify(props));

const startScan = () => noble.startScanning(serviceUUIDs, allowDuplicates);

noble.on('stateChange', state => {
  logger('stateChange')(state);
  if (state === 'poweredOn') {
    // fix: https://github.com/noble/noble#adapter-specific-known-issues
    noble.stopScanning();
    setTimeout(() => {
      startScan();
    }, 1000);
  } else {
    noble.stopScanning();
  }
});

// dev = peripheral
noble.on('discover', dev => {
  const { id } = dev;
  const { localName } = dev.advertisement;
  // const man = manufacturerData ? manufacturerData.toString('hex') : 0;

  let known = _.find(devices, { id });

  if (!known) {
    dev.lastSeen = 0;
    known = dev;
    devices.push(known);
  }

  // try to check more device info, but got errors on connections
  // see ./explorer.js
  // if (known && !known.checked && dev.addressType === 'random') {
  //   known.checked = true;
  //   // logger('checking')(dev);
  //   try {
  //     noble.stopScanning();
  //     explorer(dev);
  //   } catch (err) {
  //     logger('error explorer')(err.message || err);
  //     startScan();
  //   }
  // }

  if (
    localName &&
    watchNames.includes(localName) &&
    // dev.addressType === 'random' &&
    dev.rssi >= watchMinRssi
  ) {
    // logger('discover')(dev);
    const props = {
      id,
      name: localName || 'Unknown',
      rssi: dev.rssi,
      show: known.lastSeen ? Date.now() > known.lastSeen + watchTimeout : false,
      lastSeen: known.lastSeen
      // man: manufacturerData ? manufacturerData.toString('hex') : 0
    };

    loggerDated(props);

    props.show &&
      watchCmd.forEach(cmd =>
        exec(cmd, (error, stdout, stderr) => {
          if (error) {
            loggerDated('Exec error of ${cmd}');
            loggerDated(`${error}`);
            loggerDated(`${stderr}`);
            return;
          }
          loggerDated(`CMD: ${cmd}, OUTPUT: ${stdout}`);
        })
      );
  }

  // debug devices items
  // loggerDated({ itemsCount: devices.length, items: _.map(devices, 'id') });

  if (known) {
    known.checked = true;
    known.lastSeen = Date.now();
    known.rssi = dev.rssi || 0;
  }
});

noble.on('warning', logger('warning'));
noble.on('error', logger('error'));
noble.on('scanStart', logger('scanStart'));

noble.on('scanStop', data => {
  logger('scanStop')(data);
  setTimeout(() => {
    // make loop on new scan
    logger('start new scan');
    noble.startScanning(serviceUUIDs, allowDuplicates);
  }, watchTimeout * 2);
});

process.on('exit', () => {
  console.log(' ---> ');
  noble.stopScanning();
  console.log('Exiting...');
});
