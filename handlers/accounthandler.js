const MongoClient = require('mongodb').MongoClient
const timehandler = require('./timehandler.js')
const idhandler = require('./idhandler.js')
const ImageHandler = require('./imagehandler.js')

const url = process.env.dbUrl // revoke keys for open sourcing and replace with envvar
const host = process.env.HOST

class AccountHandler {
  constructor() {
  }

	//get asynchronous account by parameters
  static account(params, callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			let result = dbo.collection('accounts').findOne(params).then((doc) => {
				callback(doc)
			})
		})
	}
	
	static accounts(params, callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			let result = dbo.collection('accounts').find(params).toArray().then((docs) => {
				callback(docs)
			})
		})
	}

	//build a base profile
	static build(profile) {
		let uid = idhandler.newID()
//.photos[0].value
		return {
			uid: uid,
			personal: {
				id: profile.id,
				name: profile.displayName,
				email: profile.emails[0].value,
				pfp: "/image/" + uid
			},
			thoxyn: {
				posts: [],
				comments: [],
				followers: [uid],
				following: [uid, "benbeehler"],
				verified: false,
				joined: timehandler.today(),
				description: "I am new to thoxynv2. I have not set a description.",
				communities: [],
				administrator: []
			},
			business: {
				state: profile.business
			}
		}
	}

	static buildFromOld(old) {
		return {
			uid: old.uid,
			personal: {
				id: old.id,
				name: old.name,
				email: old.email,
				pfp: "/image/" + old.uid
			},
			thoxyn: {
				posts: old.posts,
				comments: old.comments,
				followers: old.followers,
				following: old.following,
				verified: old.verified,
				joined: old.date,
				description: old.description,
				communities: [],
				administrator: []
			},
			business: {
				state: old.business
			}
		}
	}

	/*static async likes(uid, callback) {
		await PostHandler.getPostsByAuthors([uid]).then(posts => {
			let likes = 0
			posts.forEach(post => {
				likes += post.external.likers.length
			})
	
			callback(likes)
		})
	}*/

	static modify(uid, newaccount, callback) {
		AccountHandler.account({uid: uid}, (account) => {
			if (account != undefined) { //modifies the post
				MongoClient.connect(url,  { useNewUrlParser: true },  function (err, db) {
					if (err) throw err
					var dbo = db.db('thoxynv2')
	
					var newvalues = { $set: newaccount }
					dbo.collection('accounts').updateOne(account, newvalues, function (err, res) {
						if (err) throw err
						db.close()
						callback()
					})
				})
			} else {
				callback()
			}
		})
	}

	static async getAccountsByUids(uids) {
		let db, client
		try {
			let result = []
	
			client = await MongoClient.connect(url, { useNewUrlParser: true })
			db = client.db("thoxynv2")
	
			for(let uid_index in uids) {
				let uid = uids[uid_index]
				let series = await db.collection("accounts").find({"uid": uid}).toArray()
	
				result = result.concat(series)
			}
	
			return result
		} finally {
			client.close()
		}
	}

	static getAccounts(callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			dbo.collection('accounts').find({}).toArray().then((docs) => {
				callback(docs)
			})
		})
	}

	static addAccount(account, callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
		  if (err) throw err
		  var dbo = db.db('thoxynv2')
	  
		  dbo.collection('accounts').insertOne(account, function (err, res) {
			if (err) throw err
			callback()
			db.close()
		  })
		})
	}

	static uploadNewAccount(profile, callback) {
		let account = AccountHandler.build(profile)

		AccountHandler.addAccount(account, () => {
			ImageHandler.addImage(account.uid, profile.photos[0].value, () => {
				callback(account)
			})
		})
	}

	static query(query, callback) {
		AccountHandler.getAccounts(accounts => {
			let finished = []

			accounts.forEach(account => {
				if(account.personal.name.replace(" ", "").toLowerCase().trim().includes(query.toLowerCase().trim())) {
					finished.push(account)
				}
			})
			
			callback(finished)
		})
	}

	static upload() {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			let result = dbo.collection('accounts').find({}).toArray().then((docs) => {
				docs.forEach(document => {
					console.log(document.pfp)
	
					dbo.collection("images").insertOne({ uid: document.uid, image: document.pfp }, (err, res) => {
						if (err) throw err;
						console.log("1 document inserted");
						db.close();
					});
				})
			})
		})
	}

	static async accountsync(uid) {
		let db, client
		try {
			client = await MongoClient.connect(url, { useNewUrlParser: true })
			db = await client.db("thoxynv2")

			let post = await db.collection("accounts").findOne({uid: uid})

			return post
		} finally {
			client.close()
		}
	}

	static transfer() {
		MongoClient.connect(legacyurl, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxyn')
			dbo.collection('accounts').find({}).toArray().then((docs) => {
				MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
					let dbn = db.db('thoxynv2')
					docs.forEach(account => {
						account = AccountHandler.buildFromOld(account)

						dbn.collection("accounts").insertOne(account, (err, res) => {
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

module.exports = AccountHandler
