const MongoClient = require('mongodb').MongoClient
const timehandler = require('./timehandler.js')
const idhandler = require('./idhandler.js')

const request = require('request')

const AccountHandler = require('./accounthandler.js')

const url = process.env.imageDbUrl

const host = process.env.HOST

const IMAGE_SERVER = process.env.imageServerUrl //images.thoxyn.com
const IMAGE_KEY = process.env.imageServerKey
class ImageHandler {
  constructor() {
  }

  static addImage(uid, value, callback) {
    let base = "/api/get/" + uid

    if(value != undefined) {
      if(value.startsWith('http')) {
        let image = {
          uid: uid,
          image: value
        }

        MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
          if (err) throw err
          var dbo = db.db('thoxynv2')
        
          dbo.collection('images').insertOne(image, function (err, res) {
            if (err) throw err
            callback()
            db.close()
          })
        })
      } else {
        let image = {
          uid: uid,
          image: base
        }

        MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
          if (err) throw err
          var dbo = db.db('thoxynv2')
        
          dbo.collection('images').insertOne(image, function (err, res) {
            if (err) throw err
            ImageHandler.imageToServer(uid, value, () => {
              callback()
            })
            db.close()
          })
        })
      }
    } else {
      callback()
    }
  }
//yiaBIu6ieatDOUC
  static base() {
    return IMAGE_SERVER
  }

	static image(uid, callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			let result = dbo.collection('images').findOne({uid: uid}).then((doc) => {
				callback(doc.image)
			})
		})
	}

  static imageFromServer(uid, callback) {
    request(IMAGE_SERVER + '/api/get/' + uid, function(error, response, body) {
      callback()
    });
  }

  static imageToServer(uid, image, callback) {
    request.post(
        IMAGE_SERVER + '/api/new/image',
        { json: 
          { 
            uid: uid,
            image: image,
            key: IMAGE_KEY
          } 
        },
        function (error, response, body) {
          callback()
        }
    )
  }

  static transfer() {
    MongoClient.connect(legacyurl, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxyn')
			dbo.collection('images').find({}).toArray().then((docs) => {
				MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
					let dbn = db.db('thoxynv2')
					docs.forEach(img => {
						dbn.collection("images").insertOne(img, (err, res) => {
							if (err) throw err;
							console.log("1 document inserted");
							db.close();
						})
					})
				})
			})
		})
  }

}

module.exports = ImageHandler
