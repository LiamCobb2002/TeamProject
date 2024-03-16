//used to access packages
var express = require("express");
var bodyParser = require("body-parser");
var { Pool } = require("pg");
var path = require("path");
var app = express();

//PostgreSQL connection pool
var pool = new Pool({
    user: "BUILDER",
    host: "localhost",
    database: "postgres",
    password: "password",
    port: 54321,
});

//Connect to the database

app.use('/public', express.static(path.join(__dirname, 'public')));

pool.connect()
    .then(() => {
        console.log('Connected to the database');
        //Start Express server if connection is successful
        startServer();
    })
    .catch((err) => {
        console.error('Error connecting to the database:', err);
    });

//Start the Express server
function startServer() {
    //Parse JSON bodies for POST requests
    app.use(bodyParser.json());

    //Serve the home file
    app.get("/", function (req, res) {
        res.sendFile(path.join(__dirname, "find-friends.html"));
    });

    //Serve the users data
    app.get("/Users", async function (req, res) {
        try {
            const client = await pool.connect();
            const result = await client.query("select profilepicture, gender, username, uage, interestname, ulocation from userprofile join UserInterest using(userid) join interest using (interestid) join userlogin using (userid);");
            const Users = result.rows;
            client.release();
            res.send(Users);
        } catch (err) {
            console.error("Error fetching users data:", err);
            res.status(500).send(err);
        }
    });

    //listen on port 8081 for Express
    app.listen(8081, function () {
        console.log("Server is running on port 8081");
    });
}
