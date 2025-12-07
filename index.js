// Polyfill for Array.prototype.findLastIndex (ES2023)
// Required for React Navigation 7.x on Android/Hermes
if (!Array.prototype.findLastIndex) {
  Array.prototype.findLastIndex = function(predicate, thisArg) {
    if (this == null) {
      throw new TypeError('"this" is null or not defined');
    }
    const o = Object(this);
    const len = o.length >>> 0;
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    for (let k = len - 1; k >= 0; k--) {
      if (predicate.call(thisArg, o[k], k, o)) {
        return k;
      }
    }
    return -1;
  };
}

import { AppRegistry } from 'react-native';
import App from './App';

// Register the main component
AppRegistry.registerComponent('main', () => App);
