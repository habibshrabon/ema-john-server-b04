const express = require("express");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const cors = require("cors");
var admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;

//firebase admin initialization

var serviceAccount = require("./ema-john-simple-b-04-firebase-adminsdk-najlc-ff8701531d.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ewzy7.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
// console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// async function verifyToken(req, res, next) {
//   if (req.headers?.authorization?.startsWith("Bearer")) {
//     const idToken = req.headers.authorization.split("Bearer")[1];
//     try {
//       const decodedUser = await admin.auth().verifyIdToken(idToken);
//       console.log("email", decodedUser.email);
//     } catch {}
//   }
//   next();
// }

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split("Bearer ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      req.decodedUserEmail = decodedUser.email;
      // console.log("email", decodedUser.email);
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("online_shop");
    const productCollection = database.collection("products");
    // console.log("database connected successfully");
    const orderCollection = database.collection("orders");

    //GET PRODUCTS API
    app.get("/products", async (req, res) => {
      const cursor = productCollection.find({});
      const page = req.query.page;
      const size = parseInt(req.query.size);
      let products;
      const count = await cursor.count();

      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }

      res.send({
        count,
        products,
      });
    });

    //USE POST TO GET DATA BY KEYS
    app.post("/products/byKeys", async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      const products = await productCollection.find(query).toArray();
      res.json(products);
    });

    //Add orders API
    app.get("/orders", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.decodedUserEmail === email) {
        const query = { email: email };
        const cursor = orderCollection.find(query);
        const orders = await cursor.toArray();
        res.json(orders);
      } else {
        res.status(401).json({ message: "user Not authorized" });
      }
    });

    app.post("/orders", async (req, res) => {
      const order = req.body;
      // console.log(order);
      order.createdAt = new Date();
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Ema jon server is running");
});

app.listen(port, () => {
  console.log("Server Running at port", port);
});
