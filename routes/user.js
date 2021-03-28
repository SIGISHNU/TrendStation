const { response } = require('express');
var express = require('express');
const userHelpers = require('../helpers/user-helpers');
const adminHelpers = require('../helpers/admin-helpers');
const { ReplSet } = require('mongodb');
const session = require('express-session');
var router = express.Router();
const config = require('../config/config');
const client = require('twilio')(config.accountSID, config.authToken);
let phone
const verifyLogin = (req, res, next) => {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  let user = req.session.userLoggedIn
  if (user) {
    next()
  } else {
    res.redirect('/login')
  }
}
const verifyBlock = (req, res, next) => {
  console.log(req.session);
  let user = req.session.user
  if (user) {
    userHelpers.getUserDetails(req.session.user._id).then((user) => {
      if (user) {
        console.log(user)
        req.session.destroy()
        res.redirect('/login')
      } else {
        next()
      }
    })
  } else {
    next()
  }
}

/* GET home page. */
router.get('/', verifyBlock, async (req, res) => {
  let user = req.session.user
  console.log(req.session.user + '11111111111111111111111111111111111111111111111111111111111111')
  let userPage = true
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let category = await adminHelpers.getAllCategory(req.params.id)
  adminHelpers.getAllProducts().then((products) => {
    console.log(products)
    res.render('index', { user, products, userPage, category, cartCount })
  })
});

router.get('/login', async (req, res) => {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  let user = req.session.userLoggedIn
  console.log(user)
  let userPage = true
  let category = await adminHelpers.getAllCategory(req.params.id)
  if (user) {
    res.redirect('/')
  } else {
    res.render('user/login', { userPage, category, 'loginErr': req.session.loginErr, 'userBlocked': req.session.userBlocked, "emailExist": req.session.emailExist })
    req.session.loginErr = false
    req.session.userBlocked = false
    req.session.emailExist = false
  }
});

router.post('/signup', (req, res) => {
  console.log(req.body);
  userHelpers.doSignup(req.body).then((response) => {
    console.log(response);
    req.session.userLoggedIn = true
    req.session.user = response
    res.redirect('/')
  }).catch(() => {
    req.session.emailExist = true
    res.redirect('/login')
  })
});

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {

    if (response.status) {
      if (response.Blockuser) {
        req.session.userBlocked = response.Blockuser
        res.redirect('/login')
      } else {
        req.session.userLoggedIn = true
        req.session.user = response.user
        res.redirect('/')
      }
    } else {
      req.session.loginErr = true
      res.redirect('/login')
    }
  });
});

router.get('/logout', (req, res) => {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  req.session.user = false
  req.session.userLoggedIn = false
  req.session.loginErr = false
  res.redirect('/')
});

router.get('/productDetails/:id', verifyBlock, async (req, res) => {
  let user = req.session.user
  let userPage = true
  // if (user) {
  //   cartCount = await userHelpers.getCartCount(req.session.user._id)
  // }
  let product = await adminHelpers.getProductDetails(req.params.id)
  let category = await adminHelpers.getAllCategory(req.params.id)
  res.render('user/product-details', { user, userPage, product, category })
});

router.get('/add-to-cart/:id', (req, res) => {
  console.log('api call');
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })
  })
});

router.get('/cart', verifyBlock, verifyLogin, async (req, res) => {
  let user = req.session.user
  let cart = req.session.cart
  let userPage = true
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let totalValue = 0
  if (products.length > 0) {
    totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  } else {
    res.redirect('/')
  }
  let category = await adminHelpers.getAllCategory(req.params.id)
  console.log(products)
  res.render('user/cart', { userPage, user, products, totalValue, cartCount, category })
});

router.get('/category/:id', async (req, res) => {
  let catId = req.params.id
  console.log(catId)
  let user = req.session.user
  let userPage = true
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let Category = await adminHelpers.getCategoryDetails(req.params.id)
  let category = await adminHelpers.getAllCategory(req.params.id)
  userHelpers.viewCategory(catId).then((product) => {
    res.render('user/category', { userPage, user, product, category, cartCount, Category })
  })
});

router.post('/change-product-quantity', async (req, res, next) => {
  userHelpers.changeProductQuanity(req.body).then(async (response) => {
    if (response.status) {
      response.total = await userHelpers.getTotalAmount(req.body.user, req.body.cart, req.body.product)
      response.subtotal = await userHelpers.getSubTotal(req.body.user, req.body.product, req.body.cart)
      res.json(response)
    } else {
      res.json(response)
    }
  })
});

router.post('/removeProCart', (req, res) => {
  userHelpers.removeProCart(req.body).then((removeProCart) => {
    console.log(removeProCart)
    res.json(removeProCart)
  })
});

router.get('/place-order', verifyBlock, verifyLogin, async (req, res) => {
  let user = req.session.user
  let userPage = true
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let address = await userHelpers.getAddress(req.session.user._id)
  let category = await adminHelpers.getAllCategory(req.params.id)
  res.render('user/checkout', { user, userPage, total, cartCount, address, category })
});

router.get('/add-address', verifyLogin, verifyBlock, async (req, res) => {
  let user = req.session.user
  let userPage = true
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let category = await adminHelpers.getAllCategory(req.params.id)
  res.render('user/add-address', { user, userPage, cartCount, category })
});

router.post('/add-address', async (req, res) => {
  userHelpers.addAddress(req.body).then((address) => {
    res.redirect('/place-order')
  })
});

router.post('/place-order', async (req, res) => {
  console.log(req.body.userId);
  let products = await userHelpers.getCartProductList(req.body.UserId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.UserId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    console.log(req.body)
    if (req.body['Payment'] === 'COD') {
      res.json({ codSuccess: true })
    } else if (req.body['Payment'] === "PAYPAL") {
      res.json({ paypal: true, total: parseInt(totalPrice / 70), orderId })
    } else {
      userHelpers.genarateRazorpay(orderId, totalPrice).then((response) => {
        res.json(response)
      })
    }
  })
  console.log(req.body);
});

router.get('/order-success', verifyLogin, verifyBlock, async (req, res) => {
  let user = req.session.user
  let userPage = true
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let category = await adminHelpers.getAllCategory(req.params.id)
  res.render('user/order-success', { user, userPage, cartCount, category })
});

router.get('/orders', verifyLogin, verifyBlock, async (req, res) => {
  let user = req.session.user
  let userPage = true
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let category = await adminHelpers.getAllCategory(req.params.id)
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders', { user, userPage, cartCount, category, orders })
});

router.get('/view-order-products/:id', verifyBlock, verifyLogin, async (req, res) => {
  let user = req.session.user
  let userPage = true
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let category = await adminHelpers.getAllCategory(req.params.id)
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products', { user, userPage, cartCount, category, products })
});

router.post('/verify-payment', (req, res) => {
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log('payment successful');
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err)
    res.json({ status: false })
  })
});

router.get('/change-status/:id', (req, res) => {
  console.log(req.params.id)
  let orderId = req.params.id
  userHelpers.changePaymentStatus(orderId).then(() => {
    console.log('payment successful');
    res.redirect('/order-success')
  })
})

router.post('/send-otp', async (req, res) => {
  console.log(req.body.Mobile);
  phone = req.body.Mobile
  console.log(phone);
  let mob = await userHelpers.checkPhone(phone)
  console.log(mob);
  let response = {}
  if (mob) {
    client
      .verify
      .services(config.serviceID)
      .verifications
      .create({
        to: '+91' + phone,
        channel: 'sms'
      })
      .then((data) => {
        console.log(data);

        response.data = data
        response.otp = true
        res.json({ response })
      }).catch((err) => {
        console.log(err)
      })
  } else {
    response.errphone = true
    res.json({ response })
  }
});

router.post('/verify-otp', async (req, res) => {
  console.log(req.body.OTP);
  OTP = req.body.OTP
  console.log(OTP)
  client
    .verify
    .services(config.serviceID)
    .verificationChecks
    .create({
      to: '+91' + phone,
      code: OTP
    }).then(async (data) => {
      console.log(data);
      let user = await userHelpers.OtpLog(phone)
      console.log(user);
      if (user) {
        response.data = data
        response.otp = true
        response.user = user
        req.session.userLoggedIn = true
        console.log(req.session.userLoggedIn)
        req.session.user = response.user
        res.json({ response })
      }
    }).catch((err) => {
      console.log(err)
    })
});

router.get('/user-profile', async (req, res) => {
  let user = req.session.user
  let userPage = true
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  let category = await adminHelpers.getAllCategory(req.params.id)
  let profile = await userHelpers.userProfile(req.session.user._id)
  let address = await userHelpers.getAddress(req.session.user._id)
  res.render('user/user-profile', { user, userPage, cartCount, category, address, profile })
});

module.exports = router;