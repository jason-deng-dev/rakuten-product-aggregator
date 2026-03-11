const { Pool } = require("pg");

module.exports = new Pool({
  host: "localhost", 
  user: "<role_name>",
  database: "top_users",
  password: "<role_password>",
  port: 5432 
});