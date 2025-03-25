const http = require('http');

const handler = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Node.js on Azure!');
};

// Ensure the app listens on port 8080 (Azure sets PORT automatically)
const port = process.env.PORT || 8080;

const server = http.createServer(handler);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
