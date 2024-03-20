//used to access packages
var express = require("express");
var bodyParser = require("body-parser");
var session = require("express-session");
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

//Set up session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
  }));
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
    app.get("/find-friends", authenticateUser, function (req, res) {
        res.sendFile(path.join(__dirname, "find-friends.html"));
    });

    app.get("/my-friends", authenticateUser, function (req, res) {
        res.sendFile(path.join(__dirname, "my-friends.html"));
    });

    app.get("/SignUp", function (req, res) {
        res.sendFile(path.join(__dirname, "SignUp.html"));
      });

      app.get("/", function (req, res) {
        res.sendFile(path.join(__dirname, "login.html"));
      });

      function authenticateUser(req, res, next) {
        // Log session data for debugging
        console.log("Session:", req.session);
    
        // If session is logged in
        if (req.session.userid) {
            // Access next page
            return next();
        } else {
            // If not logged in, redirect to login
            res.sendFile(path.join(__dirname, "login.html"));
        }
    }
      
      
      //Serve the users data
      app.get("/Users", authenticateUser, async function (req, res) {
        try {
            const client = await pool.connect();
            const result = await client.query(
                `SELECT profilepicture, gender, username, uage, interestname, ulocation, userid 
                FROM userprofile 
                JOIN UserInterest USING (userid) 
                JOIN interest USING (interestid) 
                JOIN userlogin USING (userid) 
                WHERE userlogin.userid != $1
                AND NOT EXISTS (
                    SELECT 1 
                    FROM Friendship 
                    WHERE (Friendship.user1id = userprofile.userid AND Friendship.user2id = $1) 
                    OR (Friendship.user2id = userprofile.userid AND Friendship.user1id = $1)
                )`,
                [req.session.userid]
            );
            const users = result.rows;
            client.release();
            res.send(users);
        } catch (err) {
            console.error("Error fetching users data:", err);
            res.status(500).send(err);
        }
    });

    app.get("/Friendships", authenticateUser, async function (req, res) {
        try {
            const client = await pool.connect();
            const result = await client.query(
                `SELECT profilepicture, gender, username, uage, interestname, ulocation 
                FROM userprofile 
                JOIN UserInterest USING (userid) 
                JOIN interest USING (interestid) 
                JOIN userlogin USING (userid) 
                JOIN Friendship ON (userprofile.userid = Friendship.user1id OR userprofile.userid = Friendship.user2id)
                WHERE (Friendship.user1id = userprofile.userid OR Friendship.user2id = userprofile.userid)
                AND Friendship.status = 'Accepted' 
                AND (Friendship.user1id = $1 OR Friendship.user2id = $1)
                AND userprofile.userid != $1;`,
                [req.session.userid]
            );
            const users = result.rows;
            client.release();
            res.send(users);
        } catch (err) {
            console.error("Error fetching users data:", err);
            res.status(500).send(err);
        }
    });


    app.get("/signup", async function (req, res) {
        try {
            const client = await pool.connect();
            const result = await client.query("select userid, username, email, pwd from userlogin");
            const Users = result.rows;
            client.release();
            res.send(Users);
        } catch (err) {
            console.error("Error fetching users data:", err);
            res.status(500).send(err);
        }
    });

    app.post("/register", async function (req, res) {
        try {
            const { username, email, pwd } = req.body;
            const client = await pool.connect();
            const result = await client.query(
                "INSERT INTO userlogin(username, email, pwd) VALUES ($1, $2, $3) RETURNING *",
                [username, email, pwd]
            );
            client.release();
            const newItem = result.rows[0];
            res.json({ success: true }); // Send success response
        } catch (err) {
            console.error("Error adding new User:", err);
            res.status(500).send("Internal Server Error");
        }
    });

    app.post("/login", async function (req, res) {
        try {
            const { username, pwd } = req.body; // Extract username and password from the request body
    
            // Query the database to find the user with the provided username and password
            const client = await pool.connect();
            const result = await client.query(
                "SELECT userid FROM userlogin WHERE username = $1 AND pwd = $2",
                [username, pwd]
            );
    
            if (result.rows.length > 0) {
                // If a user with the provided username and password exists, store the userid in the session
                req.session.userid = result.rows[0].userid;
                client.release();
                console.log("Session ID:", req.sessionID); // Log session ID for debugging
                res.json({ success: true, message: "Login successful!", sessionID: req.sessionID });
            } else {
                // If no user found or incorrect credentials, return failure
                client.release();
                res.json({ success: false, message: "Invalid username or password." });
            }
        } catch (err) {
            console.error("Error during login:", err);
            res.status(500).send("Internal Server Error");
        }
    });

    app.post("/add-friend", authenticateUser, async function (req, res) {
        try {
          const { friendId } = req.body;
          const client = await pool.connect();
          // Insert a new friendship record
          const result = await client.query(
            "INSERT INTO Friendship (User1ID, User2ID, Status) VALUES ($1, $2, $3)",
            [req.session.userid, friendId, 'Pending']
          );
          client.release();
          res.sendStatus(200); // Send success response
        } catch (err) {
          console.error("Error adding friend:", err);
          res.status(500).send("Internal Server Error");
        }
      });
    
    

    //listen on port 8081 for Express
    app.listen(8081, function () {
        console.log("Server is running on port 8081");
    });

    
}
