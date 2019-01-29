module.exports = {
  // devices to watch (used with device local names)
  watchNames: ['Amazfit Bip Watch'],

  // how long minimum should be device not visible
  watchTimeout: 1000 * 10,

  // react on minimum RSSI (signal level, should be negative value)
  watchMinRssi: -55,

  // run shell cmd if devices is visible again
  watchCmd: [
    'loginctl unlock-session', // unlock pc
    'gnome-screensaver-command -d', // stop screensaver
    'paplay /usr/share/sounds/KDE-Im-User-Auth.ogg' // play sound to know we are done
  ],

  // default: [] => all - We are watching to localNames. Let it blank.
  serviceUUIDs: [],

  // default: false - We need to watch changes, let it true.
  allowDuplicates: true,

  // filter out device vars for debugging
  filterProps: ['_noble']
};
