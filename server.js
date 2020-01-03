const app = require('./index.js')
const http = require('http')

var port = process.env.PORT;
var host = process.env.YOUR_HOST || '0.0.0.0';

if (process.env.NODE_ENV = 'production') {
  console.log("Detected running in production environment.")
  http.createServer(app).listen(port, '::')
  console.log("HTTP started at port 8081")
} else if (process.env.NODE_ENV = 'development'){
  console.log("Detected running in development environment")
  http.createServer(app).listen(port, '::')
  console.log('Web Server Launched on Port 8081' + host)
}