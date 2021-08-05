const express = require("express");
const path = require("path");
const app = express();
const port = 3000;
const routes = require("./routes/routes");
const mariadb = require("mariadb");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.use(express.static(path.join(__dirname, "uploads")));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const startApp = async function () {

    let conn = await mariadb.createConnection({
        host: "localhost",
        database: "pastephoto",
        user: "root",
        password: "tomas",
        port: 3306
    });

    app.use("/", routes(conn));

    app.listen(port, () => {
        console.log(`Listening to requests on http://localhost:${port}`);
    });
};
startApp();

