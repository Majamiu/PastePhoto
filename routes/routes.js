const express = require("express");
const app = express.Router();
const multer = require("multer");
const fs = require("fs");
const argon2 = require("argon2");
const path = require("path");
const argonGenerateHash = require("../Argon2GenerateHash");
const mariadb = require("mariadb");
var jwt = require("jsonwebtoken");
const SecretKeyOfJWT = "XC2QeWecNxTj2TfX2mzAB5UaEAbYNgevQ8vuBXyjtrzTfmd3FdkpeTiZrgvtxnk";
const cookieParser = require("cookie-parser");
app.use(cookieParser());
const jwtExpirySeconds = 300;

//------------------------------------------------------------
// Multer's settings
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        var NameOfFile = file.originalname.split(".");
        var LimbOfFile = NameOfFile[NameOfFile.length - 1];
        cb(null, Date.now() + "." + LimbOfFile);
    }
});
// 10485760 bytes = 10 mb
var upload = multer({
    fileFilter: function (req, file, cb) {
        var ext = path.extname(file.originalname);
        if (
            ext !== ".png" &&
            ext !== ".jpg" &&
            ext !== ".apng" &&
            ext !== ".gif" &&
            ext !== ".tiff" &&
            ext !== ".jpeg" &&
            ext !== ".PNG" &&
            ext !== ".JPG" &&
            ext !== ".APNG" &&
            ext !== ".GIF" &&
            ext !== ".TIFF" &&
            ext !== ".JPEG"
        ) {
            return cb(new Error("Only image files are allowed!"));
        }
        cb(null, true);
    },
    storage: storage,
    limits: { fileSize: 10485760 }
}).single("File");

// Multer's settings END..
//------------------------------------------------------------

module.exports = function (conn) {
    var today = new Date().toLocaleString();

    // Periods of file's validity.
    var Periods = [1, 7, 15, 30];

    // This function is generating url for file to download.
    function uuidv4() {
        return "xxxxxxxx-xxxxxxx".replace(/[xy]/g, function (c) {
            var r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    conn.query(
        "CREATE TABLE IF NOT EXISTS `Photos` (`Id` varchar(255) NOT NULL, `File_Name` varchar(255) NOT NULL, `Title` varchar(255) NOT NULL, `Description` varchar(255) NOT NULL, `If_Password` boolean NOT NULL, `Password` varchar(255) NOT NULL, `Stored_date` timestamp NOT NULL, `Period_of_validity` int(11) NOT NULL, `URL` varchar(255) NOT NULL)"
    );

    async function DeleteOldImages() {
        // This function will delete all old images from the database in every 2 days.
        // The server automatically checks if the image isn't expired when the user opens the image. So we need to runthis interval only in every 2 days.
        let data = await conn.query("SELECT * FROM photos");
        var TimeNow = new Date();
        var timeDiff;
        for (var i = 0; i < data.length; i++) {
            timeDiff = Math.floor((new Date(TimeNow).getTime() - new Date(data[i].Stored_date).getTime()) / 1000);
            if (data[i].Period_of_validity < timeDiff / 86400) {
                fs.unlinkSync("uploads/" + data[i].File_Name);
                await conn.query("Delete from Files WHERE URL = ?", [data[i].URL]);
            }
        }
    }

    setInterval(DeleteOldImages, 172800000); // 172800000 millseconds = 2 days.

    app.post("/ConfirmPassword", async function (req, res) { // Do this function when the user did submit his password to open the image.
        let data = await conn.query("SELECT * FROM photos WHERE Id = ?", [req.body.FileID]);
        argon2.verify(data[0].Password, req.body.FilePassword).then((match) => {
            if (match) { // If the hash from the database matches with the user’s submitted password, create JWT cookie.
                var id = req.body.FileID;
                const token = jwt.sign({ id }, SecretKeyOfJWT, { expiresIn: 360000 });
                res.cookie("token", token, { maxAge: jwtExpirySeconds * 1000 });
                res.json({ Correct: true });
                return;
            } else { // If user's password is incorrect, send response to client.s
                res.json({ Correct: false });
                return;
            }
        });
    });

    app.get("/TermsPolicy", async function (req, res) {
        res.render("TermsPolicy");
    });

    app.get("/file/:url", async function (req, res) {

        let data = await conn.query("SELECT * FROM photos WHERE URL = ?", [req.params.url]);
        if (data.length === 0) { // Checks if the image exists.
            res.render("error");
            return;
        }

        var TimeNow = new Date();
        const timeDiff = Math.floor((new Date(TimeNow).getTime() - new Date(data[0].Stored_date).getTime()) / 1000); // TimeDiff in seconds.

        // If file's period of validity is expired, delete it.
        if (data[0].Period_of_validity < (timeDiff / 86400)) { // Converting timediff to days to compere. And if file is expired, delete it from database and ,,Uplaods'' folder.
            fs.unlinkSync("uploads/" + data[0].New_file_name);
            await conn.query("Delete from Files WHERE URL = ?", [req.params.url]);
            res.render("error"); // Then give a response to the user that the file is expired.
            return;
        }

        if (data[0].If_Password) {
            const session = parsePayload(req.cookies.token); // Gets JWT cookie
            if (session.data) { // If JWT cookie exists.
                if (session.data.id == data[0].Id) { // If JWT cookie exits, compare it with a file ID to check if the user is the photo's owner.
                    // And If the user is the owner of the photo, don't ask him to write the password.
                    res.render("file", {
                        Password: false,
                        PhotoId: data[0].File_Name,
                        id: data[0].Id,
                        tittle: data[0].Title,
                        description: data[0].Description,
                        ReviewLink: req.protocol + "://" + req.get("host") + "/file/" + data[0].URL,
                        DirectLink: req.protocol + "://" + req.get("host") + "/uploads/" + data[0].File_Name
                    });
                } else {
                    // If not, ask user to write password.
                    res.render("file", { Password: true, PhotoId: null, id: data[0].Id, tittle: 0, description: 0 });
                }
            } else {
                //If JWT is not created at all, and the picture has a password, ask the user to write the password.
                res.render("file", { Password: true, PhotoId: null, id: data[0].Id, tittle: 0, description: 0 });
            }
        } else {
            res.render("file", {
                Password: false,
                PhotoId: data[0].File_Name,
                id: data[0].Id,
                tittle: data[0].Title,
                description: data[0].Description,
                ReviewLink: req.protocol + "://" + req.get("host") + "/file/" + data[0].URL,
                DirectLink: req.protocol + "://" + req.get("host") + "/" + data[0].File_Name
            });
        }
    });

    app.get("/", function (req, res) {
        res.render("index");
    });

    app.post("/uploadfile", async function (req, res) {
        if (req.body.Title < 41) {
            // Check If the tittle isn't too long.
            res.json({ Error: true, Message: "Your tittle is too long!" });
            return;
        }

        if (req.body.Title < 91) {
            // Check if the description isn't too long.
            res.json({ Error: true, Message: "Your description is too long!" });
            return;
        }
        upload(req, res, async function (err) {
            if (err instanceof multer.MulterError) {
                res.json({ Error: true, Message: "Unpexpected error. Try again to upload again!" });
                return;
            } else if (err) {
                res.json({ Error: true, Message: "Unpexpected error. Try again to upload again!" });
                return;
            }
            let id = uuidv4();
            let url = uuidv4();
            if (Periods[req.body.PeriodsOfValidity]) { // Checking if a period of photo validity, which the client gave, exists.
                conn.query("INSERT INTO photos VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                    id,
                    req.file.filename,
                    req.body.Title != "" ? req.body.Title : 0,
                    req.body.Description != "" ? req.body.Description : 0,
                    req.body.Password != "" ? true : false,
                    req.body.Password != "" ? await argonGenerateHash.saltHashPassword(req.body.Password) : 0,
                    today,
                    Periods[req.body.PeriodsOfValidity],
                    url
                ]);
                const token = jwt.sign({ id }, SecretKeyOfJWT, { expiresIn: 360000 }); // Create JWT token when the user uploads a file.
                res.cookie("token", token, { maxAge: jwtExpirySeconds * 1000 });
                res.json({ url: req.protocol + "://" + req.get("host") + "/file/" + url, uploaded: true });
            } else {
                res.json({ Error: true, message: "Unexpected error! Try to refresh site." });
                return;
            }
        });
    });

    function parsePayload(token) {
        // if the cookie is not set, return an unauthorized error
        if (!token) {
            return {
                authenticated: false,
                error: 401
            };
        }
        let payload = null;
        try {
            // Parse the JWT string and store the result in payload
            payload = jwt.verify(token, SecretKeyOfJWT);
        } catch (e) {
            if (e instanceof jwt.JsonWebTokenError) {
                // if the error thrown is because the JWT is unauthorized, return a 401 error
                return {
                    authenticated: false,
                    error: 401
                };
            }
            // otherwise, return a bad request error
            return {
                authenticated: false,
                error: 400
            };
        }
        return {
            authenticated: true,
            data: payload
        };
    }

    return app;
};
