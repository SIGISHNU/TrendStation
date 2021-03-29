var express = require('express');
const { response } = require('../app');
const adminHelpers = require('../helpers/admin-helpers');
const { ReplSet } = require('mongodb');
const session = require('express-session');
var router = express.Router();
const verifyLogin = (req, res, next) => {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  let admin = req.session.adminloggedIn
  if (admin) {
    next()
  } else {
    res.redirect('/admin-login')
  }
}

/* GET users listing. */
router.get('/admin', verifyLogin, async (req, res) => {
  req.session.admin =true
  let Revenue = await adminHelpers.totalRevenue()
  let monthsales = await adminHelpers.ordersGraph()
  let completed_orders = await adminHelpers.completed_orders()
  let canceled_orders=await adminHelpers.canceled_orders()
  let totalProducts = await adminHelpers.totalProducts()
  let ordercount = await adminHelpers.ordercount()
  let usercount = await adminHelpers.usercount()
  res.render('admin/index', { admin: true, Revenue, monthsales,completed_orders,canceled_orders, ordercount, totalProducts, usercount })
});

router.get('/admin-login', (req, res) => {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  let Admin = req.session.admin
  if (Admin) {
    res.redirect('/admin')
  } else {
    res.render('admin/login', { admin: true, rahul: true, "adminloginErr": req.session.adminloginErr, "adminemailErr": req.session.adminemailErr, "adminpassErr": req.session.adminpassErr })
    req.session.adminemailErr = false
    req.session.adminpassErr = false
  }
})

router.post('/admin-login', (req, res) => {
  admin = {
    name: 'Admin',
    email: 'admin@gmail.com',
    password: 1234
  }
  if (admin.email != req.body.Email) {
    req.session.adminemailErr = true
    res.redirect('/admin-login');
    req.session.adminemailErr = false
  }
  else if (admin.password != req.body.Password) {
    req.session.adminpassErr = true
    res.redirect('/admin-login');
    req.session.adminpassErr = false
  }
  else if (admin.email == req.body.Email && admin.password == req.body.Password) {
    req.session.adminloggedIn = true
    res.redirect('/admin');
    // req.session.adminloggedIn = false
  } else {
    req.session.adminloginErr = true
    res.redirect('/admin');
    req.session.adminloginErr = false
  }
});

router.get('/admin-logout', (req, res) => {
  res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
  req.session.admin = false
  req.session.adminloggedIn = false
  req.session.adminpassErr = false
  req.session.adminemailErr = false
  res.redirect('/admin');
});

router.get('/viewUsers', verifyLogin, (req, res) => {
  req.session.admin = true
  adminHelpers.getAllUsers().then((users) => {
    res.render('admin/view-users', { admin: true, users })
  })
});

router.get('/viewProduct', verifyLogin, (req, res) => {
  req.session.admin = true
  adminHelpers.getAllProducts().then((products) => {
    console.log('products')
    res.render('admin/view-products', { admin: true, products })
  })
});

router.get('/addProduct', verifyLogin, (req, res) => {
  req.session.admin = true
  adminHelpers.getAllCategory().then((category) => {
    console.log(category);
    res.render('admin/add-product', { admin: true, category })
  })
});

router.post('/addProduct', (req, res) => {
  adminHelpers.addProduct(req.body, (id) => {
    let image1 = req.files.Image1
    let image2 = req.files.Image2
    let image3 = req.files.Image3
    image1.mv('./public/product-images/' + id + '1.jpg', (err, done) => {
      image2.mv('./public/product-images/' + id + '2.jpg', (err, done) => {
        image3.mv('./public/product-images/' + id + '3.jpg', (err, done) => {
          if (!err) {
            res.redirect('/viewProduct')
          } else {
            console.log(err)
            res.redirect('/viewProduct')
          }
        })
      })
    })
  })
});

router.get('/deleteProduct/:id', (req, res) => {
  let proId = req.params.id
  console.log(proId)
  adminHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/viewProduct')
  })
});

router.get('/editProduct/:id', verifyLogin, async (req, res) => {
  req.session.admin = true
  let product = await adminHelpers.getProductDetails(req.params.id)
  let category = await adminHelpers.getAllCategory(req.params.id)
  console.log(product);
  console.log(category);
  res.render('admin/edit-product', { admin: true, product, category })
});

router.post('/editProduct/:id', (req, res) => {
  console.log(req.params.id)
  let id = req.params.id
  adminHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/viewProduct')
    let Image1 = req.files.Image1
    let Image2 = req.files.Image2
    let Image3 = req.files.Image3
    Image1.mv('./public/product-images/' + id + '1.jpg')
    Image2.mv('./public/product-images/' + id + '2.jpg')
    Image3.mv('./public/product-images/' + id + '3.jpg')

  })
});

router.get('/blockUser/:id', (req, res) => {
  let userId = req.params.id
  adminHelpers.blockUser(userId).then((response) => {
    res.redirect('/viewUsers')
  })
});

router.get('/unblockUser/:id', (req, res) => {
  let userId = req.params.id
  adminHelpers.unblockUser(userId).then((response) => {
    res.redirect('/viewUsers')
  })
});

router.get('/addCategory', verifyLogin, (req, res) => {
  req.session.admin = true
  res.render('admin/add-category', { admin: true })
});

router.post('/addCategory', (req, res) => {
  adminHelpers.addCategory(req.body).then((response) => {
    res.redirect('/viewCategory')
  })
});

router.get('/viewCategory', verifyLogin, (req, res) => {
  req.session.admin = true
  adminHelpers.getAllCategory(req.body).then((category) => {
    console.log('category')
    res.render('admin/view-category', { admin: true, category })
  })
});

router.get('/deleteCategory/:id', (req, res) => {
  let categoryId = req.params.id
  console.log(categoryId)
  adminHelpers.deleteCategory(categoryId).then((response) => {
    res.redirect('/viewCategory')
  })
});

router.get('/editCategory/:id', verifyLogin, async (req, res) => {
  req.session.admin = true
  let category = await adminHelpers.getCategoryDetails(req.params.id)
  console.log(category);
  res.render('admin/edit-category', { admin: true, category })
});

router.post('/editCategory/:id', (req, res) => {
  console.log(req.params.id)
  let categoryId = req.params.id
  adminHelpers.updateCategory(categoryId, req.body).then(() => {
    res.redirect('/viewCategory')
  })
});

router.get('/view-orders', verifyLogin, async (req, res) => {
  req.session.admin = true
  let orders = await adminHelpers.getAllOrders()
  res.render('admin/view-orders', { admin: true, orders })
});

router.post("/changeStatus", (req, res) => {
  adminHelpers.changeStatus(req.body).then((response) => {
    adminHelpers.getOrderId(req.body.id).then((order) => {
      res.json({ order });
    })
      .catch(() => {
        console.log("err");
      });
  });
});

router.get('/viewReport',verifyLogin, async(req, res) => {
 admin = req.session.admin
 let monthsales = await adminHelpers.ordersGraph()
  res.render('admin/viewReport', { admin: true ,monthsales})
});

router.post('/findReportbyDate', verifyLogin, (req, res) => {
  adminHelpers.getOrderByDate(req.body).then((response) => {
    console.log("yeah its wrking", response);
    res.render('admin/viewSalesByDate', { admin: true, response })
  })

})


module.exports = router;