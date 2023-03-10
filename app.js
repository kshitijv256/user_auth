/* eslint-disable no-undef */
const express = require("express");
const cookieParser = require("cookie-parser");
const passport = require("passport"); // using passport
const LocalStrategy = require("passport-local"); // using passport-local as strategy
const session = require("express-session");
// const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { User } = require("./models");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser("some other secret string"));

app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "secret-key-that-no-one-can-guess",
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
    resave: false,
    saveUninitialized: false,
  })
);

// passport config
app.use(passport.initialize());
app.use(passport.session());

// authentication
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({
        where: {
          email: username,
        },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "User does not exists" });
        });
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

// routes
app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});

app.get("/login", (req, res) => {
  res.render("login", { user: req.user });
});

app.get("/signup", (req, res) => {
  res.render("signup", { user: req.user });
});

app.post("/user", async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, saltRounds);
  await User.create({
    name: req.body.name,
    nobile: req.body.mobile,
    email: req.body.email,
    password: hash,
  })
    .then((user) => {
      res.send(user);
    })
    .catch((err) => {
      res.send(err);
    });
});

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    response.send(request.user);
  }
);

app.post("/newpass", async (req, res) => {
  const user = await User.findOne({
    where: { email: req.body.email },
  });
  const result = await bcrypt.compare(req.body.currPass, user.password);
  if (!result) {
    res.send("Incorrect password");
  }
  const hash = await bcrypt.hash(req.body.password, saltRounds);
  await User.update(
    {
      password: hash,
    },
    {
      where: {
        email: req.body.email,
      },
    }
  )
    .then((user) => {
      res.send(user);
    })
    .catch((err) => {
      res.send(err);
    });
});

app.post("/profile", async (req, res) => {
  await User.update(
    {
      name: req.body.name,
      mobile: req.body.mobile,
    },
    {
      where: {
        email: req.body.email,
      },
    }
  )
    .then((user) => {
      res.send(user);
    })
    .catch((err) => {
      res.send(err);
    });
});

module.exports = app;
