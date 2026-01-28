const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/component/test-123',
    method: 'HEAD'
};

const req = http.request(options, (res) => {
    console.log('STATUS:', res.statusCode);
    const headers = res.headers;
    console.log('COOP:', headers['cross-origin-opener-policy'] || 'MISSING');
    console.log('COEP:', headers['cross-origin-embedder-policy'] || 'MISSING');
    console.log('ALL HEADERS:', JSON.stringify(headers, null, 2));
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();

