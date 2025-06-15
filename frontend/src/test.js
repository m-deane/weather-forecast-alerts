console.log('[TEST] JavaScript file loaded successfully!');

// Test if React is available
if (typeof React !== 'undefined') {
  console.log('[TEST] React is available:', React.version);
} else {
  console.error('[TEST] React is NOT available');
}

// Test if ReactDOM is available
if (typeof ReactDOM !== 'undefined') {
  console.log('[TEST] ReactDOM is available');
} else {
  console.error('[TEST] ReactDOM is NOT available');
}

// Test if we can find the root element
const root = document.getElementById('root');
if (root) {
  console.log('[TEST] Root element found:', root);
  root.innerHTML = '<h1>JavaScript is working! But React is not rendering.</h1>';
} else {
  console.error('[TEST] Root element NOT found');
}