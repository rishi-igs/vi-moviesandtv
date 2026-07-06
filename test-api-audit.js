const http = require("http");
const run = (path) => {
  const data = JSON.stringify({ url: "https://www.kirloskarpumps.com" });
  const opts = { hostname: "127.0.0.1", port: 3002, path, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } };
  const req = http.request(opts, res => {
    let body = "";
    res.on("data", chunk => body += chunk);
    res.on("end", () => {
      console.log(path, 'status', res.statusCode);
      console.log(path, 'headers', JSON.stringify(res.headers,null,2));
      console.log(path, 'body', body.slice(0,200));
      console.log('---');
    });
  });
  req.on("error", err => console.error(path, 'error', err.message));
  req.write(data);
  req.end();
};
run('/api/audit');
<<<<<<< HEAD
run('/api/websites');
=======
run('/api/websites');
>>>>>>> 7eb55d6a7a8c7ea0f65727a603648df4e4fca5b9
