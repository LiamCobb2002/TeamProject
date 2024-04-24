-- Drop tables if they exist
DROP TABLE IF EXISTS UserLogin;
DROP TABLE IF EXISTS UserProfile;
DROP TABLE IF EXISTS Friendship;
DROP TABLE IF EXISTS Interest;
DROP TABLE IF EXISTS UserInterest;

-- Create UserLogin Table
CREATE TABLE UserLogin (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(50) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    Pwd VARCHAR(50) NOT NULL
);

-- Create UserProfile Table
CREATE TABLE UserProfile (
    UserID SERIAL PRIMARY KEY REFERENCES UserLogin,
    UAge INT,
    Gender VARCHAR(10),
    ULocation VARCHAR(100),
    ProfilePicture VARCHAR(255)
);

-- Create Friendship Table
CREATE TABLE Friendship (
    FriendshipID SERIAL PRIMARY KEY,
    User1ID INT REFERENCES UserProfile(UserID),
    User2ID INT REFERENCES UserProfile(UserID),
    Status VARCHAR(20)
);

-- Create Interest Table
CREATE TABLE Interest (
    InterestID SERIAL PRIMARY KEY,
    InterestName VARCHAR(50) NOT NULL,
    InterestIcon VARCHAR(255) NOT NULL
);

-- Create UserInterest Table
CREATE TABLE UserInterest (
    UserInterestID SERIAL PRIMARY KEY,
    UserID INT REFERENCES UserProfile(UserID),
    InterestID INT REFERENCES Interest(InterestID)
);

-- Sample data for UserLogin Table
INSERT INTO UserLogin (Username, Email, Pwd) VALUES
('Alice', 'alice@example.com', 'password123'),
('Bob', 'bob@example.com', 'securepwd'),
('Charlie', 'charlie@example.com', '12345678'),
('David', 'david@example.com', 'davidpass'),
('Eva', 'eva@example.com', 'evapassword');

-- Sample data for UserProfile Table
INSERT INTO UserProfile (UserID, UAge, Gender, ULocation, ProfilePicture) VALUES
(1, 25, 'Female', 'Dublin', 'https://st4.depositphotos.com/13193658/25036/i/450/depositphotos_250363326-stock-photo-smiling-attractive-woman-white-sweater.jpg'),
(2, 30, 'Male', 'Kildare', 'https://t4.ftcdn.net/jpg/02/14/74/61/360_F_214746128_31JkeaP6rU0NzzzdFC4khGkmqc8noe6h.jpg'),
(3, 22, 'Male', 'Wicklow', 'https://images.unsplash.com/photo-1600603405959-6d623e92445c?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDZ8fG1hbnxlbnwwfHwwfHx8MA%3D%3D'),
(4, 28, 'Female', 'Meath', 'https://images.unsplash.com/photo-1541577141970-eebc83ebe30e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTh8fG1hbnxlbnwwfHwwfHx8MA%3D%3D'),
(5, 26, 'Male', 'Belfast', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9z0RFPbu-0jHJ8GOaGG8GkKWGnL0YEo3oqA&usqp=CAU');

-- Sample data for Friendship Table
INSERT INTO Friendship (User1ID, User2ID, Status) VALUES
(1, 2, 'Pending'),
(3, 4, 'Accepted'),
(2, 5, 'Pending'),
(1, 3, 'Accepted'),
(4, 5, 'Pending');

-- Sample data for Interest Table
INSERT INTO Interest (InterestName, InterestIcon) VALUES
('Food', 'sports_icon.png'),
('Basketball', 'music_icon.png'),
('Running', 'reading_icon.png'),
('TV', 'travel_icon.png'),
('Guitar', 'food_icon.png')
('Food', 'food_icon.png')
('Bodhran', 'bodhran_icon.png')
('Taekwondo', 'taek_icon.png')
('Movies', 'mov_icon.png');

-- Sample data for UserInterest Table
INSERT INTO UserInterest (UserID, InterestID) VALUES
(1, 2),
(3, 1),
(2, 3),
(4, 4),
(5, 5);
