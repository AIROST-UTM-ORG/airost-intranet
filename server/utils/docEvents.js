const EventEmitter = require('events');

const docEmitter = new EventEmitter();

// Allow sufficient listeners for testing/monitoring without Node warnings
docEmitter.setMaxListeners(50);

/**
 * Emit an internal documentation event strictly after a successful database write.
 * Wrapped in try/catch and executes listeners individually so a throwing listener
 * NEVER breaks the HTTP request or affects other listeners.
 * 
 * @param {string} type - Event name (e.g. 'space.created', 'document.updated')
 * @param {Object} payload - Standardized payload containing only IDs and title
 */
const emitDocEvent = (type, payload) => {
  try {
    const listeners = docEmitter.rawListeners(type);
    for (const listener of listeners) {
      try {
        const res = listener(payload);
        if (res && typeof res.catch === 'function') {
          res.catch((err) => {
            console.error(
              `[docEvents] Async listener failed for event '${type}':`,
              err?.message || err
            );
          });
        }
      } catch (listenerErr) {
        // Safe logging: listeners must never crash caller
        console.error(
          `[docEvents] Listener failed for event '${type}':`,
          listenerErr && listenerErr.message ? listenerErr.message : listenerErr
        );
      }
    }
  } catch (err) {
    console.error(`[docEvents] Emission failed for event '${type}':`, err && err.message ? err.message : err);
  }
};

/**
 * Subscribe a listener function to a documentation event type.
 * 
 * @param {string} type - Event name
 * @param {Function} listener - Callback function
 */
const onDocEvent = (type, listener) => {
  docEmitter.on(type, listener);
};

/**
 * Unsubscribe a listener function from an event type.
 */
const removeDocEventListener = (type, listener) => {
  docEmitter.removeListener(type, listener);
};

/**
 * Remove all listeners (useful for test resets).
 */
const removeAllDocEventListeners = (type) => {
  if (type) {
    docEmitter.removeAllListeners(type);
  } else {
    docEmitter.removeAllListeners();
  }
};

module.exports = {
  emitDocEvent,
  onDocEvent,
  on: onDocEvent, // Alias per specification
  removeDocEventListener,
  removeAllDocEventListeners,
};
