var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { response } = require('express')
var objectId = require('mongodb').ObjectID
const moment = require('moment')
module.exports = {
    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },
    addProduct: (product, callback) => {
        console.log(product)
        product.Price = parseInt(product.Price)
        db.get().collection('product').insertOne(product).then((data) => {
            callback(data.ops[0]._id)
        })
    },
    getAllProducts: () => {
        return new Promise((resolve, reject) => {
            let products = db.get().collection(collection.PRODUCT_COLLECTOION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            console.log(prodId)
            db.get().collection(collection.PRODUCT_COLLECTOION).removeOne({ _id: objectId(prodId) }).then((response) => {
                console.log(response);
                resolve(response)
            })
        })
    },
    getProductDetails: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTOION).findOne({ _id: objectId(prodId) }).then((product) => {
                resolve(product)
            })
        });
    },
    updateProduct: (prodId, proDetails) => {
        proDetails.Price = parseInt(proDetails.Price)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTOION)
                .updateOne({ _id: objectId(prodId) }, {
                    $set: {
                        Name: proDetails.Name,
                        Description: proDetails.Description,
                        Price: proDetails.Price,
                        Category: proDetails.Category
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { status: true } }).then((status) => {
                resolve(status)
            })
        });
    },
    unblockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { status: false } }).then((status) => {
                resolve(status)
            })
        });
    },
    addCategory: (category) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(category).then((data) => {
                resolve(data.ops[0]._id)
            })
        })
    },
    getAllCategory: () => {
        return new Promise((resolve, reject) => {
            let category = db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(category)
        })
    },
    getCategoryDetails: (categoryId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(categoryId) }).then((category) => {
                resolve(category)
            })
        });
    },
    deleteCategory: (categoryId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).removeOne({ _id: objectId(categoryId) }).then((response) => {
                resolve(response)
            })
        })
    },
    updateCategory: (categoryId, categoryDetails) => {
        return new Promise((resolve, reject) => {
            console.log(categoryId);
            db.get().collection(collection.CATEGORY_COLLECTION)
                .updateOne({ _id: objectId(categoryId) }, {
                    $set: {
                        Category: categoryDetails.Category
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(orders)
        })
    },
    changeStatus: (order) => {
        console.log("data", order);
        return new Promise(async (resolve, reject) => {
            let result = await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(order.id) },
                {
                    $set: {
                        status: order.status
                    }
                })
            resolve(result)
        })
    },
    getOrderId: (id) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(id) }).then((orderId) => {
                if (orderId) {
                    resolve(orderId)
                } else {
                    reject()
                }
            })
        })
    },
    totalRevenue: () => {
        return new Promise(async (resolve, reject) => {
            let y = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{
                $group: {
                    _id: null,
                    totalAmount: {
                        $sum: "$totalAmount"
                    }
                }
            }]).toArray()
            resolve(y)
        })
    },
    completed_orders: () => {
        return new Promise(async (resolve, reject) => {
            let i = await db.get().collection(collection.ORDER_COLLECTION).find({ status: "Deliver" }).count()
            resolve(i)
        })
    },
    canceled_orders: () => {
        return new Promise(async (resolve, reject) => {
            let cancel = await db.get().collection(collection.ORDER_COLLECTION).find({ status: "Cancel" }).count()
            resolve(cancel)
        })
    },
    totalProducts: () => {
        return new Promise(async (resolve, reject) => {
            let totalpdt = await db.get().collection(collection.PRODUCT_COLLECTOION).find().count()
            resolve(totalpdt)
        })
    },
    usercount: () => {
        return new Promise(async (resolve, reject) => {
            let usercount = await db.get().collection(collection.USER_COLLECTION).count()
            if (usercount) {
                resolve(usercount)
            }
            else {
                reject()
            }
        })
    },
    ordercount: () => {
        return new Promise(async (resolve, reject) => {
            let ordercount = await db.get().collection(collection.ORDER_COLLECTION).count()
            if (ordercount) {
                resolve(ordercount)
            }
        })
    },
    ordersGraph: () => {
        return new Promise(async (resolve, reject) => {
            let graphData = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{
                $match: {
                    status: "Deliver"
                }
            },
            {
                $project: {
                    date: 1,
                    _id: 0,
                    totalAmount: 1
                }
            },
            {
                $group: {
                    _id: { month: "$date" },
                    count: { $sum: 1 },
                    total: { $sum: "$totalAmount" }
                }
            },
            {
                $project: {
                    _id: 1,
                    total: 1
                }
            }
            ]).toArray()
            var response = {
                date: [],
                total: []
            }
            for (i = 0; i < graphData.length; i++) {
                response.date[i] = graphData[i]._id.month
                response.total[i] = graphData[i].total
            }
            resolve(response)
            console.log("ReS IS", response);
        })
    },
    getOrderByDate: (req) => {
        return new Promise(async (resolve, reject) => {
           let from = req.fromDate
           let to = req.toDate
           let dfrom = moment(from).format("MM/DD/YYYY");
           let dto = moment(to).format("MM/DD/YYYY");
           let salesReport = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
              {
                 $match: {
                    date: {
                       $gte: dfrom,
                       $lte: dto
                    }
                 }
              },
              {
                 $project: {
                    totalAmount: 1,
                    paymentMethod: 1,
                    status: 1,
                    date: 1,
                    _id: 1
  
                 }
              }
           ]).toArray()
           resolve(salesReport)
        })
  
     },
  
}