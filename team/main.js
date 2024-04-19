//used to access packages
var express = require("express");
var bodyParser = require("body-parser");
var session = require("express-session");
var { Pool } = require("pg");
var path = require("path");
var app = express();
const multer = require('multer');

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

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    
    app.use(bodyParser.json());

    //Serve the home file
    app.get("/find-friends", authenticateUser, function (req, res) {
        res.sendFile(path.join(__dirname, "find-friends.html"));
    });

    app.get("/", function (req, res) {
        res.sendFile(path.join(__dirname, "home.html"));
    });

    app.get("/my-friends", authenticateUser, function (req, res) {
        res.sendFile(path.join(__dirname, "my-friends.html"));
    });

    app.get("/SignUp", function (req, res) {
        res.sendFile(path.join(__dirname, "SignUp.html"));
      });

    app.get("/login", function (req, res) {
        res.sendFile(path.join(__dirname, "login.html"));
      });

    app.get("/my-profile", authenticateUser, function (req, res) {
        res.sendFile(path.join(__dirname, "my-profile.html"));
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
                `SELECT profilepicture, gender, username, uage, interestname, ulocation, userid, email
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

    app.get("/requests", authenticateUser, async function (req, res) {
        try {
            const client = await pool.connect();
            const result = await client.query(
                `SELECT profilepicture, gender, username, uage, interestname, ulocation, userid  
                FROM userprofile 
                JOIN UserInterest USING (userid) 
                JOIN interest USING (interestid) 
                JOIN userlogin USING (userid) 
                JOIN Friendship ON (userprofile.userid = Friendship.user1id OR userprofile.userid = Friendship.user2id)
                WHERE (Friendship.user1id = userprofile.userid OR Friendship.user2id = userprofile.userid)
                AND Friendship.status = 'Pending' 
                AND (Friendship.user2id = $1)
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

    app.post("/register", async function (req, res) {
        try {
            const { username, email, pwd, age, gender, location } = req.body; // Extract username, email, password, age, gender, and location from the request body
            const client = await pool.connect();
            
            // Check if the username already exists in the database
            const usernameCheck = await client.query(
                "SELECT * FROM userlogin WHERE username = $1",
                [username]
            );
    
            if (usernameCheck.rows.length > 0) {
                // If the username already exists, send a response indicating failure
                res.status(400).json({ success: false, message: "Username already exists. Please choose a different username." });
            } else {
                // If the username is unique, insert user information into the userlogin table
                const result = await client.query(
                    "INSERT INTO userlogin(username, email, pwd) VALUES ($1, $2, $3) RETURNING *",
                    [username, email, pwd]
                );
    
                // Insert additional user information into the userprofile table
                await client.query(
                    "INSERT INTO userprofile(userid, uage, gender, ulocation) VALUES ($1, $2, $3, $4)",
                    [result.rows[0].userid, age, gender, location]
                );
                
                client.release();
                res.status(200).json({ success: true }); // Send success response
            }
        } catch (err) {
            console.error("Error adding new User:", err);
            res.status(500).send("Internal Server Error");
        }
    });
    

    app.post("/register", async function (req, res) {
        try {
            const { username, email, pwd, age, gender, location } = req.body; // Extract username, email, password, age, gender, and location from the request body
            const client = await pool.connect();
            
            // Insert user information into the userlogin table
            const result = await client.query(
                "INSERT INTO userlogin(username, email, pwd) VALUES ($1, $2, $3) RETURNING *",
                [username, email, pwd]
            );
    
            // Insert additional user information into the userprofile table
            await client.query(
                "INSERT INTO userprofile(userid, uage, gender, ulocation) VALUES ($1, $2, $3, $4)",
                [result.rows[0].userid, age, gender, location]
            );
            
            client.release();
            res.json({ success: true }); // Send success response
        } catch (err) {
            console.error("Error adding new User:", err);
            res.status(500).send("Internal Server Error");
        }
    });
    

    const upload = multer({ dest: 'uploads/' }); // Specify the destination directory for uploaded files

// ...

// Update user profile picture route with multer middleware
app.post('/upload-profile-picture', upload.single('profilePicture'), async function (req, res) {
    try {
        // Get the file path of the uploaded image
        const imagePath = req.file.path;

        // Update the profile picture path in the database
        const client = await pool.connect();
        await client.query(
            'UPDATE UserProfile SET ProfilePicture = $1 WHERE UserID = $2',
            [imagePath, req.session.userid]
        );
        client.release();

        // Send a success response back to the client
        res.status(200).json({ success: true, message: 'Profile picture uploaded successfully.', imagePath: imagePath });
    } catch (err) {
        console.error('Error uploading profile picture:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
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
            console.log("Adding friend with ID:", friendId); // Log friendId for debugging
            const client = await pool.connect();
            // Insert a new friendship record
            const result = await client.query(
                "INSERT INTO Friendship (User1ID, User2ID, Status) VALUES ($1, $2, $3)",
                [req.session.userid, friendId, 'Pending']
            );
            client.release();
            console.log("Friend added successfully."); // Log success message
            res.sendStatus(200); // Send success response
        } catch (err) {
            console.error("Error adding friend:", err);
            res.status(500).send("Internal Server Error");
        }
    });

    app.post("/update-friend-status", authenticateUser, async function (req, res) {
        try {
            const { friendId } = req.body;
            console.log("Friend ID:", friendId); // Print friendId for debugging
            console.log("userid", req.session.userid)
    
            // Update the friendship status in the database
            const client = await pool.connect();
            const result = await client.query(
                `UPDATE Friendship 
                 SET Status = 'Accepted'
                 WHERE (User1ID = $1 AND User2ID = $2)`,
                [friendId, req.session.userid]
            );
            client.release();
    
            // Check if any rows were affected by the update
            console.log("Number of rows updated:", result.rowCount); // Print number of rows updated
            if (result.rowCount > 0) {
                res.status(200).json({ success: true, message: "Friend request status updated successfully." });
            } else {
                // Log error to the database if the update didn't affect any rows
                
                res.status(404).json({ success: false, message: "Friend request not found." });
            }
        } catch (err) {
            console.error("Error updating friend request status:", err);
            // Log error to the database
            
            
        }
    });

    app.post("/block-friend-status", authenticateUser, async function (req, res) {
        try {
            const { friendId } = req.body;
            console.log("Friend ID:", friendId); // Print friendId for debugging
            console.log("userid", req.session.userid)
    
            // Update the friendship status in the database
            const client = await pool.connect();
            const result = await client.query(
                `UPDATE Friendship 
                 SET Status = 'Blocked'
                 WHERE (User1ID = $1 AND User2ID = $2) or (User2ID = $1 AND User1ID = $2)`,
                [friendId, req.session.userid]
            );
            client.release();
    
            // Check if any rows were affected by the update
            console.log("Number of rows updated:", result.rowCount); // Print number of rows updated
            if (result.rowCount > 0) {
                res.status(200).json({ success: true, message: "Friend request status updated successfully." });
            } else {
                // Log error to the database if the update didn't affect any rows
                
                res.status(404).json({ success: false, message: "Friend request not found." });
            }
        } catch (err) {
            console.error("Error updating friend request status:", err);
            // Log error to the database
            
            
        }
    });
    
    
    
    

        // Update user profile route
        app.post("/update-profile", authenticateUser, async function (req, res) {
            try {
                const { username, email, password, age, gender, location } = req.body; // Modified line
                const client = await pool.connect();
                
                // Update user profile information in the userlogin table
                await client.query(
                    `UPDATE userlogin 
                    SET username = $1, email = $2, pwd = $3
                    WHERE userid = $4`,
                    [username, email, password, req.session.userid]
                );
        
                // Update additional user information in the userprofile table
                await client.query(
                    `UPDATE userprofile 
                    SET uage = $1, gender = $2, ulocation = $3
                    WHERE userid = $4`,
                    [age, gender, location, req.session.userid]
                );
                
                client.release();
                res.json({ success: true, message: "Profile updated successfully!" });
            } catch (err) {
                console.error("Error updating user profile:", err);
                res.status(500).send("Internal Server Error");
            }
        });
        
        app.get("/user-profile", authenticateUser, async function (req, res) {
            try {
                const client = await pool.connect();
                const result = await client.query(
                    `SELECT profilepicture, gender, username, uage, interestname, ulocation 
                    FROM userprofile 
                    JOIN UserInterest USING (userid) 
                    JOIN interest USING (interestid) 
                    JOIN userlogin USING (userid) 
                    WHERE userprofile.userid = $1;`,
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
        
        app.post("/add-interest", authenticateUser, async function (req, res) {
            try {
              const { interestName } = req.body;
          
              // Query the database to find the interest ID based on the interest name
              const client = await pool.connect();
              const interestResult = await client.query(
                "SELECT interestid FROM interest WHERE interestname = $1",
                [interestName]
              );
          
              if (interestResult.rows.length > 0) {
                const interestID = interestResult.rows[0].interestid;
          
                // Insert the interest into the UserInterest table
                await client.query(
                  "INSERT INTO userinterest (userid, interestid) VALUES ($1, $2)",
                  [req.session.userid, interestID]
                );
          
                client.release();
                res.json({ success: true });
              } else {
                // If the interest does not exist, return failure
                client.release();
                res.json({ success: false, message: "Interest not found." });
              }
            } catch (err) {
              console.error("Error adding interest:", err);
              res.status(500).send("Internal Server Error");
            }
          });
          
          // Define route to handle removing all hobbies/interests
app.post("/remove-all-interests", authenticateUser, async function(req, res) {
    try {
      // Query the database to remove all interests associated with the user
      const client = await pool.connect();
  
      // Delete all entries from the UserInterest table where userid matches the current user's id
      await client.query(
        "DELETE FROM userinterest WHERE userid = $1",
        [req.session.userid]
      );
  
      client.release();
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing interests:", error);
      res.status(500).json({ success: false, error: "Internal Server Error" });
    }
  });
  
          
    
    

    //listen on port 8081 for Express
    app.listen(8081, function () {
        console.log("Server is running on port 8081");
    });

    
}
