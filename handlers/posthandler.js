const MongoClient = require('mongodb').MongoClient
const timehandler = require('./timehandler.js')
const idhandler = require('./idhandler.js')
const aimode = require('./aimode.js')
const striptags = require('striptags')

const ContentHandler = require('./contenthandler.js')
const AccountHandler = require('./accounthandler.js')
const ImageHandler = require('./imagehandler.js')

const url = process.env.dbUrl // revoke keys for open sourcing and replace with envvar
const host = process.env.HOST

class PostHandler {
  constructor() {
  }

	//get asynchronous account by parameters
  static post(params, callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			let result = dbo.collection('posts').findOne(params).then((doc) => {
				callback(doc)
			})
		})
	}
	
	static posts(params, callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			let result = dbo.collection('posts').find(params).toArray().then((docs) => {
				callback(docs)
			})
		})
	}

	static thumbnail(uid, callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			let result = dbo.collection('images').findOne({uid: uid}).then((doc) => {
				callback(doc.image)
			})
		})
	}

	//build a base profile
	static build(title, html, author, authoruid, priv, cd, promoted, topic, cover) {
		let uid = idhandler.newID()

		if(cover) {
			return {
				uid: uid,
				content: {
					title: title,
					html: html,
					topic: topic
				},
				author: {
					authoruid: authoruid
				},
				aesthetic: {
					thumbnail: "/image/" + uid,
					date: timehandler.today(),
					private: priv,
					comments_disabled: cd,
					verified: promoted,
					pinned: false
				},
				external: {
					likers: [],
					comments: [],
					views: 0,
					timeid: timehandler.getTimeID()
				}
			}
		} else {
			return {
				uid: uid,
				content: {
					title: title,
					html: html,
					topic: topic
				},
				author: {
					authoruid: authoruid
				},
				aesthetic: {
					thumbnail: undefined,
					date: timehandler.today(),
					private: priv,
					comments_disabled: cd,
					verified: promoted,
					pinned: false
				},
				external: {
					likers: [],
					comments: [],
					views: 0,
					timeid: timehandler.getTimeID()
				}
			}
		}
	}

	static buildFromOld(old) {
		let verified = true

		if(old.verified.trim() == "") {
			verified = false
		}

		return {
			uid: old.uid,
			content: {
				title: old.title,
				html: old.content,
				topic: old.topic
			},
			author: {
				authoruid: old.authorid
			},
			aesthetic: {
				thumbnail: undefined,
				date: old.date,
				private: old.private,
				comments_disabled: old.comments_disabled,
				verified: verified,
				pinned: false
			},
			external: {
				likers: old.likers,
				comments: old.comments,
				views: old.likers.length,
				timeid: old.timeid
			}
		}
	}

	static modify(uid, newpost, callback) {
		PostHandler.post({uid: uid}, (post) => {
			if (post != undefined) { //modifies the post
				MongoClient.connect(url,  { useNewUrlParser: true },  function (err, db) {
					if (err) throw err
					var dbo = db.db('thoxynv2')
	
					var newvalues = { $set: newpost }
					dbo.collection('posts').updateOne(post, newvalues, function (err, res) {
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

	static delete(params, callback) {
		MongoClient.connect(url, { useNewUrlParser: true },  function (err, db) {
		let dbo = db.db('thoxynv2')
		
		dbo.collection("posts").deleteOne(params, (err, obj) => {
		  if (err) throw err
		  db.close()
		  callback()
		})
	  })
	}

	static transfer() {
		MongoClient.connect(legacyurl, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxyn')
			dbo.collection('posts').find({}).toArray().then((docs) => {
				MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
					let dbn = db.db('thoxynv2')
					docs.forEach(post => {
						post = PostHandler.buildFromOld(post)

						dbn.collection("posts").insertOne(post, (err, res) => {
							if (err) throw err;
							console.log("1 document inserted");
							db.close();
						})
					})
				})
			})
		})
	}

	static addPost(post, callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, function (err, db) {
		  if (err) throw err
		  var dbo = db.db('thoxynv2')
	  
		  dbo.collection('posts').insertOne(post, function (err, res) {
				if (err) throw err
				callback()
				db.close()
		  })
		})
	}

	static async getPostsByAuthors(uids) {
		let db, client
		try {
			let result = []
	
			client = await MongoClient.connect(url, { useNewUrlParser: true })
			db = client.db("thoxynv2")
	
			for(let uid_index in uids) {
				let uid = uids[uid_index]
				let series = await db.collection("posts").find({"author.authoruid": uid}).toArray()
	
				result = result.concat(series)
			}
	
			return result
		} finally {
			client.close()
		}
	}

	static async postify(post) {
		if(ContentHandler.malformed(post.content.topic)) {
			post.content.topic = "Ambiguous"
		}

		if(ContentHandler.malformed(post.aesthetic.thumbnail)) {
			post.aesthetic.thumbnail = ContentHandler.thumbnail()
		}

		if(ContentHandler.malformed(post.content.html)) {
			post.content.html = "There was not content provided."
		}

		let author = await AccountHandler.accountsync(post.author.authoruid)

		post.author.name = author.personal.name

		return post
	}

	static uploadNewPost(title, html, authoruid, priv, cd, imgData, topic, callback) {
		AccountHandler.account({uid: authoruid}, account => {
			let promoted = false

			if(account.thoxyn.verified) {
				promoted = true
			}
			
			let cover = (imgData != undefined)

			let post = PostHandler.build(title, html, account.personal.name, authoruid, priv, cd, promoted, topic, cover)

			if(cover) {
				ImageHandler.addImage(post.uid, imgData, () => {
					PostHandler.addPost(post, () => {
						callback(post)
					})
				})
			} else {
				PostHandler.addPost(post, () => {
					callback(post)
				})
			}
		})
	}

	static getPosts(callback) {
		MongoClient.connect(url, { useNewUrlParser: true }, (err, db) => {
			let dbo = db.db('thoxynv2')
			dbo.collection('posts').find({}).toArray().then((docs) => {
				callback(docs)
			})
		})
	}

	static query(query, callback) {
		PostHandler.getPosts(posts => {
			let finished = []

			posts.forEach(post => {
				if(ContentHandler.malformed(post.content.topic)) {
					post.content.topic = "Ambiguous"
				}

				if(post.content.title.toLowerCase().trim().includes(query.toLowerCase().trim())) {
					finished.push(post)
				} else if(post.content.topic.toLowerCase().trim().includes(query.toLowerCase().trim())) {
					finished.push(post)
				}
			})
			
			callback(finished)
		})
	}

	static async feedify(post, big) {
		let limit = 75
		if(big) {
			limit = 420
		}

		post.content.html = striptags(post.content.html)
		if(ContentHandler.malformed(post.content.topic)) {
			post.content.topic = "Ambiguous"
		}

		post.content.html = ContentHandler.convertHTML(post.content.html)
		post.content.topic = post.content.topic.toUpperCase()

		if(post.content.html.length > limit) {
			post.content.html = post.content.html.substring(0, limit) + "..."
		}

		if(ContentHandler.malformed(post.aesthetic.thumbnail)) {
			post.aesthetic.thumbnail = ContentHandler.thumbnail()
		}

		let author = await AccountHandler.accountsync(post.author.authoruid)

		post.author.name = author.personal.name
		post.content.html = post.content.html.trim()

		return post
	}

	static async feedifyMany(posts, big, amount) {
		let updated = []

		for(let index in posts) {
			let post = posts[index]

			let limit = 75
			if(big) {
				limit = 420
			}
	
			post.content.html = striptags(post.content.html)
			if(ContentHandler.malformed(post.content.topic)) {
				post.content.topic = "Ambiguous"
			}
	
			post.content.html = ContentHandler.convertHTML(post.content.html)
			post.content.topic = post.content.topic.toUpperCase()
	
			if(post.content.html.length > limit) {
				post.content.html = post.content.html.substring(0, limit) + "..."
			}

			if(ContentHandler.malformed(post.content.title)) {
				post.content.title = "No Title Provided"
			}

			if(ContentHandler.malformed(post.content.html)) {
				post.content.html = "There was no content provided."
			}

			if(!big) {
				if(post.content.title.length > 57) {
					post.content.title = post.content.title.substring(0, 54) + "..."
				}
			}
	
			if(ContentHandler.malformed(post.aesthetic.thumbnail)) {
				post.aesthetic.thumbnail = ContentHandler.thumbnail()
			}
	
			let author = await AccountHandler.accountsync(post.author.authoruid)

			post.author.name = author.personal.name
			post.content.html = post.content.html.trim()

			updated.push(post)
		}

		return updated
	}

	static async postsync(uid) {
		let db, client
		try {
			client = await MongoClient.connect(url, { useNewUrlParser: true })
			db = await client.db("thoxynv2")

			let post = await db.collection("posts").findOne({uid: uid})

			return post
		} finally {
			client.close()
		}
	}

	static recommend(callback) {
		PostHandler.getPosts(posts => {
			let filtered = posts.filter(p => p.aesthetic.private == false)
		
			let post = aimode.rate(filtered)
			callback(post)
		})
	}

	static organizePosts(posts, callback) {
		let postIDs = []
	  
		posts.forEach((post) => { //push the timestamp/timeid
		  if(post.external.timeid == undefined) {
			post.external.timeid = ContentHandler.random(Number.MAX_VALUE)
		  }
	  
		  postIDs.push(post.external.timeid)
		})
	  
		let finished = [] // will render out this data
	  
		postIDs = postIDs.sort((a, b) => a - b) 
		// sort the posts based on their timeIDs so they are chronologically correct
		postIDs.forEach((timeid) => {
		  finished.push(posts.filter(post => post.external.timeid == timeid)[0])
		})
	  
		// avoid duplicates, I'll fix the bug later
		callback(Array.from(new Set(finished.reverse())))
	  }
}

module.exports = PostHandler
