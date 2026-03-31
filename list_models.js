const https = require('https');

const apiKey = 'AIzaSyD0MGXpYMSCu6qdCyKDjX3fZW1a8DBayqI';
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.error(err);
});
