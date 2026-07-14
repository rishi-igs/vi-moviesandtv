const http = require("http");
const data = JSON.stringify({ url: "https://moviesandtv.myvi.in" });
const opts = {
  hostname: "127.0.0.1",
  port: 3002,
  path: "/api/audit",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
  },
};
const req = http.request(opts, (res) => {
  let body = "";
  res.on("data", (chunk) => { body += chunk; });
  res.on("end", () => {
    console.log('status', res.statusCode);
    console.log('headers', JSON.stringify(res.headers, null, 2));
    console.log('body', body);
  });
});
req.on('error', (err) => {
  console.error('error', err.message);
});
req.write(data);
req.end();
