const port = 4000;
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer'); //image storage system
const path = require('path'); //get access to backend directory in express app
const cors = require('cors'); //provide access to React project
const { log } = require('console');
const { ppid } = require('process');
const { type } = require('os');

app.use(express.json());
app.use(cors()); //reactjs will connect to express app in port 4000

// Database Connection with MongoDB
mongoose.connect('mongodb+srv://kaitokien:kien2003@cluster0.dlmsasv.mongodb.net/e-commerce');

// API creation
app.get("/", (req, res) => {
  res.send("Express App is running");
})

// Image Storage Engine
const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
  }
});

const upload = multer({storage: storage});

// Creating Upload Endpoint for images
app.use('/images', express.static('upload/images'))

app.post("/upload", upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`
  })
}) //Upload images

// Schema for creating products
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  }
})

app.post('/addproduct', async (req, res) => {
  let products = await Product.find({});
  let id;
  if(products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price
  });
  console.log(product);
  await product.save();
  console.log('Saved');
  res.json({
    success: true,
    name: req.body.name
  });
})

// Creating API for deleting products
app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({id: req.body.id});
  console.log("Removed");
  res.json({
    success: true,
    name: req.body.name
  });
})

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
  let products = await Product.find({});
  console.log("All Products fetched");
  res.send(products);
})

// Schema creating for User model

const Users = mongoose.model('Users', {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String
  },
  cartData: {
    type: Object
  },
  date: {
    type: Date,
    default: Date.now
  }
});

// Creating Endpoint for registering the user
app.post('/signup', async (req, res) => {

  let check = await Users.findOne({email: req.body.email});
  if(check) {
    return res.status(400).json({success: false, error: "Existing user found with same email address"});
    // User email account existed
  }

  let cart = {};
  for(let i = 0; i < 300; i++) {
    cart[i] = 0;
  } //Create empty cart data

  const user = new Users({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    cartData: cart
  }) // Create new user

  await user.save(); // save user in db

  const data = {
    user: {
      id: user.id
    }
  } // create a token

  const token = jwt.sign(data, 'sercret_ecom');
  res.json({success: true, token});
})

// creating endpoint for user logins

app.post('/login', async (req, res) => {
  let user = await Users.findOne({email: req.body.email});
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id
        }
      }
      const token = jwt.sign(data, 'secret_ecom');
      res.json({success: true, token});
    } else {
      res.json({success: false, error: "Incorrect password"});
    }
  } else {
    res.json({success: false, error: 'Wrong email ID'});
  }
})

// Creating endpoint for new collection data
app.get('/newcollection', async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8); //Get recently added 8 products
  console.log("New Collection Fetched");
  res.send(newcollection);
})

// creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    res.status(401).send({errors: "Please authenticate using valid token"});
  }
  else {
    try {
      const data = jwt.verify(token, 'secret_ecom');
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({errors: "Please authenticate using valid token"});
    }
  }
}

// creating endpoint for popular section
app.post('/addtocart', fetchUser, async (req, res) => {
  console.log("Added", req.body.itemId);
  let userData = await Users.findOne({_id: req.user.id});
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
  res.send("Added");
})

app.get('/popularinvietnam', async (req, res) => {
  let products = await Product.find({category: "vietnam"});
  let popular_in_vietnam = products.slice(0, 4);
  console.log("Popular in Vietnam fetched");
  res.send(popular_in_vietnam);
})

// creating endpoint to remove product from cartdata
app.post('/removefromcart', fetchUser, async (req, res) => {
  console.log("removed", req.body.itemId);
  let userData = await Users.findOne({_id: req.user.id});
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findOneAndUpdate({_id: req.user.id}, {cartData: userData.cartData});
  res.send("Removed");
})

// Creating endpoint to get cart data
app.post('/getcart', fetchUser, async (req, res) => {
  console.log("Get Cart");
  let userData = await Users.findOne({_id: req.user.id});
  res.json(userData.cartData);
})

app.listen(port, (error) => {
  if (!error) {
    console.log(`Server is running on port ${port}`)
  }
  else {
    console.log(`Error: ` + error);
  }
})