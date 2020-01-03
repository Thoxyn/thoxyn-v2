const express = require('express')
const bodyParser = require('body-parser')
const exphbs = require('express-handlebars')
const helmet = require('helmet')
const path = require('path')
const cookieParser = require('cookie-parser')
const cookieSession = require('cookie-session')
const passport = require('passport')
const auth = require('./config/google_auth.js')
const hsts = require('hsts')
const uploader = require('express-fileupload')
const xss = require('xss')
const request = require('request')
const redirectToHTTPS = require('express-http-to-https').redirectToHTTPS

const securitymanager = require('./handlers/securitymanager.js')
const idhandler = require('./handlers/idhandler.js')

//const rateLimit = require("express-rate-limit")

const aimode = require('./handlers/aimode.js')

const AccountHandler = require('./handlers/accounthandler.js')
const PostHandler = require('./handlers/posthandler.js')
const ContentHandler = require('./handlers/contenthandler.js')
const ImageHandler = require('./handlers/imagehandler.js')
const TimeHandler = require('./handlers/timehandler.js')
const MailHandler = require('./handlers/mailhandler.js')

const app = module.exports = express()

const host = "http://" + process.env.HOST || "http://thoxyn.com" //should be redirectToHTTPS on external layer

app.use(express.static(path.join(__dirname, 'public')))
app.use(helmet())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(passport.initialize())
app.use(cookieSession({
  name: 'session',
  keys: ['blogshortkey@24032k0315']
}))

app.use(cookieParser())

app.engine('handlebars', exphbs())
app.set('view engine', 'handlebars')

auth(passport)

app.use(uploader({}))

app.get('/auth', passport.authenticate('google', {
  scope: ['profile', 'email']
}))

function authenticated(req) {
  return req.session.uid && req.session.token
}

function render(view, req, res, options) {
  if(req.session.uid) {
    AccountHandler.account({uid: req.session.uid}, (account) => {
      if(!ContentHandler.malformed(account.thoxyn.banned)) {
        if(view != "post") {
          res.render('banned')
        } else {
          if(!ContentHandler.malformed(req.query.app)) {
            options.app = true
          } else {
            options.app = false
          }
        
          if(!ContentHandler.malformed(req.query.google)) {
            options.google = false
          } else {
            options.google = true
          }
        
          if(req.session.uid) {
            options.gid = req.session.id
            options.muid = req.session.uid
        
            res.render(view, options)
          } else {
            options.gid = "null"
            options.muid = "null"
            options.baseUrl = req.get('host');
            res.render(view, options)
          }
        }
      } else {
        if(!ContentHandler.malformed(req.query.app)) {
          options.app = true
        } else {
          options.app = false
        }
      
        if(!ContentHandler.malformed(req.query.google)) {
          options.google = false
        } else {
          options.google = true
        }
      
        if(req.session.uid) {
          options.gid = req.session.id
          options.muid = req.session.uid
      
          res.render(view, options)
        } else {
          options.gid = "null"
          options.muid = "null"
          options.baseUrl = req.get('host');
          res.render(view, options)
        }
      }
    })
  } else {
    if(!ContentHandler.malformed(req.query.app)) {
      options.app = true
    } else {
      options.app = false
    }
  
    if(!ContentHandler.malformed(req.query.google)) {
      options.google = false
    } else {
      options.google = true
    }
  
    if(req.session.uid) {
      options.gid = req.session.id
      options.muid = req.session.uid
  
      res.render(view, options)
    } else {
      options.gid = "null"
      options.muid = "null"
      options.baseUrl = req.get('host');
      res.render(view, options)
    }
  }
}

app.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/'
  }),
  (req, res) => {
      if(!(req.user.profile.displayName == undefined 
        || req.user.profile.id == undefined 
        || req.user.profile.photos[0].value == undefined
        || req.user.token == undefined
        || req.user == undefined
        || req.user.profile == undefined)) {
      req.session.token = req.user.token
      req.session.id = req.user.profile.id
      req.session.name = req.user.profile.displayName
      req.session.pfp = req.user.profile.photos[0].value

      AccountHandler.account({ "personal.id": req.session.id }, (doc) => {
        if(ContentHandler.malformed(doc)) {
          AccountHandler.uploadNewAccount(req.user.profile, (account) => {
            req.session.uid = account.uid
            res.redirect('/post/welcome')
          })
        } else {
          if(ContentHandler.malformed(doc.personal.email)) {
            doc.personal.email = req.user.profile.emails[0].value

            AccountHandler.modify(doc.uid, doc, () => {
              req.session.uid = doc.uid
              res.redirect('/')
            })
          } else {
            req.session.uid = doc.uid
            res.redirect('/')
          }
        }
      })
    } else {
      res.redirect('/?message=' + encodeURIComponent("ERROR: You must properly configure your google account before you may continue."))
    }
  }
)

app.post('/announce', (req, res) => {
  if((req.session.uid == "benbeehler") 
    || (req.session.uid == "JMj2oRh00QYv43e")) {
    let subject = req.body.title
    let content = req.body.article

    AccountHandler.getAccounts(accounts => {
      accounts.forEach(account => {
        if(account != undefined) {
          if(!ContentHandler.malformed(account.personal.email)) {
            if(account.personal.email.trim() != "") {
              MailHandler.sendEmail(account.personal.email, subject, content, () => {})
            }
          }
        }
      })
    })

    res.json({
      success: true,
      result: "The announcement is being made. Give it a few minutes..."
    })
  }
})

app.get('/admin', (req, res) => {
  if((req.session.uid == "benbeehler")
    || req.session.uid == "JMj2oRh00QYv43e") {
    render('admin', req, res, {})
  } else {
    res.status(404).redirect('/post/404')
  }
})

app.get('/following/:uid', (req, res) => {
  let follower = req.session.uid
  let followed = req.params.uid

  if(follower) {
    AccountHandler.account({uid: follower}, (account) => {
      if(account != undefined) {
        if(account.thoxyn.following.includes(followed)) {
          res.json({following: true})
        } else {
          res.json({following: false})
        }
      } else {
        res.json({following: false})
      }
    })
  } else {
    res.json({
      sucess: false,
      reason: "You must be signed in."
    })
  }
})

app.get('/follow/:uid', (req, res) => {
  let followeruid = req.session.uid
  let followeduid = req.params.uid

  if(followeruid) {
    if(req.cookies.follow == undefined) {
      res.cookie("follow", req.session.uid, {maxAge: TimeHandler.seconds(2)})
      AccountHandler.account({uid: followeruid}, (follower) => {
        AccountHandler.account({uid: followeduid}, (followed) => {
          if (!followed.thoxyn.followers.includes(followeruid)) {
            if (followeruid == followeduid) {
              follower.thoxyn.followers.push(followeruid)
              follower.thoxyn.following.push(followeduid)

              AccountHandler.modify(followeruid, follower, () => {
                res.json({success: true})
              })
            } else {
              // remove duplicates
              let followers = followed.thoxyn.followers
              followers.push(followeruid)
              followers = ContentHandler.unique(followers)

              // remove duplicates (This is a duplicate lol)
              let following = follower.thoxyn.following
              following.push(followeduid)
              following = ContentHandler.unique(following)

              followed.thoxyn.followers = followers
              follower.thoxyn.following = following

              AccountHandler.modify(followeruid, follower, () => {
                AccountHandler.modify(followeduid, followed, () => {
                  res.json({success: true})
                })
              })
            }
          } else {
            // redundancy here is completely necessary unfortunately
            if (followeruid == followeduid) {
              // remove user and disable duplications
              let newfollowers = []

              followed.thoxyn.followers.forEach((uid) => {
                if (uid !== followeruid) {
                  newfollowers.push(uid)
                }
              })

              followed.thoxyn.followers = ContentHandler.unique(newfollowers)

              let newfollowing = []

              followed.thoxyn.following.forEach((uid) => {
                if (uid !== followeduid) {
                  newfollowing.push(uid)
                }
              })

              followed.thoxyn.following = ContentHandler.unique(newfollowing)

              AccountHandler.modify(followeduid, followed, () => {
                res.json({success: false})
              })
            } else {
              // remove user and disable duplications
              let newfollowers = []

              followed.thoxyn.followers.forEach((uid) => {
                if (uid !== followeruid) {
                  newfollowers.push(uid)
                }
              })

              followed.thoxyn.followers = ContentHandler.unique(newfollowers)

              let newfollowing = []

              follower.thoxyn.following.forEach((uid) => {
                if (uid !== followeduid) {
                  newfollowing.push(uid)
                }
              })

              follower.thoxyn.following = ContentHandler.unique(newfollowing)

              AccountHandler.modify(followeduid, followed, () => {
                AccountHandler.modify(followeruid, follower, () => {
                  res.json({success: false})
                })
              })
            }
          }
        })
      })
    }
  }
})

app.get('/like/:uid', (req, res) => {
  if(req.session.uid) {
    let postid = req.params.uid

    if(req.cookies.like == undefined) {
      res.cookie("like", req.session.uid, {maxAge: TimeHandler.seconds(1)})
      PostHandler.post({uid: postid}, (post) => {
        if(!post.external.likers.includes(req.session.id)) {
          let likers = post.external.likers
          likers.push(req.session.id)

          post.external.likers = ContentHandler.unique(likers)

          PostHandler.modify(postid, post, () => {
            res.json({
              success: true,
              likers: post.external.likers
            })
          })
        } else {
          let likers = post.external.likers
          let newlikers = []

          likers.forEach((id) => {
            if(id != req.session.id) {
              newlikers.push(id)
            }
          })

          post.external.likers = ContentHandler.unique(newlikers)

          PostHandler.modify(postid, post, () => {
            res.json({
              success: true,
              likers: post.external.likers
            })
          })
        }
      })
    }
  } else {
    res.json({
      success: false,
      reason: "You must be signed in to like posts."
    })
  }
})

app.post('/comment', (req, res) => {
  if (req.session.uid) {
    let postuid = req.body.uid

    if(req.cookies.comment == undefined) {
      res.cookie("comment", req.session.uid, {maxAge: TimeHandler.seconds(60)})

      PostHandler.post({uid: postuid}, (post) => {
        if (post.aesthetic.comments_disabled === false) {
          let comment = {
            author: req.session.name,
            content: req.body.content,
            date: TimeHandler.today(),
            authorimg: req.session.pfp,
            uid: req.session.uid,
            success: true
          }
          
          if(req.body.content.toString().trim() == "") {
            res.json({
              success: false,
              reason: "Your comment cannot be empty." 
            })
          } else {
            post.external.comments.push(comment)

            PostHandler.modify(postuid, post, () => {
              AccountHandler.account({uid: req.session.uid}, (account) => {
                account.thoxyn.comments.push(comment)
    
                AccountHandler.modify(req.session.uid, account, () => {
                  res.json({
                    author: req.session.name,
                    content: req.body.content,
                    date: TimeHandler.today(),
                    authorimg: req.session.pfp,
                    success: true
                  })
                })
              })
            })
          }
        } else {
          res.json({
            success: false,
            reason: "The author has disabled comments."
          })
        }
      })
    } else {
      res.json({
        success: false,
        reason: "This is under cooldown. Try again in a few minutes."
      })
    }
  } else {
    res.json({
      success: false,
      reason: "You must be signed in to comment."
    })
  }
})

app.post('/settings/newpic', (req, res) => {
  if(req.session.uid) {
    let cover = "data:image/jpeg;base64," + new Buffer(req.files.cover.data).toString('base64')

    if(req.body.password) {
      AccountHandler.account({uid: req.session.uid}, account  => {
        securitymanager.compare(req.body.password, account.thoxyn.password, (hash) => {
          if(hash) {
            ImageHandler.addImage(req.session.uid, cover, () => {
              res.redirect('/settings')
            })
          } else {
            res.redirect('/settings')
          }
        })
      })
    }
  }
})

app.post('/settings/newdesc', (req, res) => {
  if(req.session.uid) {
    let description = req.body.description

    if(req.body.password) {
      AccountHandler.account({uid: req.session.uid}, account  => {
        securitymanager.compare(req.body.password, account.thoxyn.password, (hash) => {
          
          if(hash) {
            account.thoxyn.description = description

            AccountHandler.modify(req.session.uid, account, () => {
              res.redirect('/settings')
            })
          } else {
            res.redirect('/settings')
          }
        })
      })
    }
  }
})

app.post('/submitedit', (req, res) => {
  if(req.session.uid) {
    let uid = req.body.uid
    let title = req.body.title
    let article = req.body.content
    let topic = req.body.topic

    PostHandler.post({uid: uid}, post => {
      if(post.author.authoruid == req.session.uid) {
        post.content.title = title
        post.content.html = article
        post.content.topic = topic

        PostHandler.modify(uid, post, () => {
          res.json({
            redirect: host + "/post/" + uid
          })
        })
      }
    })
  }
})

app.get('/delete/:uid', (req, res) => {
  let postuid = req.params.uid
  let uid = req.session.uid

  PostHandler.post({uid: postuid}, post => {
    if(post.author.authoruid == uid) {
      PostHandler.delete({uid: postuid}, () => {
        res.redirect('/settings')
      })
    } else {
      res.status(404).redirect('/post/404')
    }
  })
})

app.post('/upload', function(req, res) {
  if(req.session.uid) {
    if(req.cookies.submit == undefined) {
      res.cookie("submit", req.session.uid, {maxAge: TimeHandler.seconds(10)})
      let cover = undefined

      if(req.files.cover != undefined) {
        cover = "data:image/jpeg;base64," + new Buffer(req.files.cover.data).toString('base64')
      }

      let title = req.body.title
      let article = req.body.article
      let privat = req.body.private
      let dcomments = req.body.dcomments
      let topic = req.body.topic
    
      if(ContentHandler.malformed(dcomments)) {
        dcomments = false
      }
    
      if(ContentHandler.malformed(privat)) {
        privat = false
      }
    
      PostHandler.uploadNewPost(title, article, req.session.uid, privat, dcomments, cover, topic, (post) => {
        res.redirect("/post/" + post.uid)
      })
    } else {
      res.json({
        success: false,
        reason: "You must be signed in."
      })
    }
  }
})

app.get('/image/:uid', (req, res) => {
  let uid = req.params.uid

  ImageHandler.image(uid, (image) => {
    if(image == undefined) {
      res.json({
        success: false,
        reason: "That account does not exist."
      })
    }

    let split = image.split(",")

    if(split.length == 1) {
      if(image.startsWith('/api')) {
        image = ImageHandler.base() + image
      }

      res.redirect(image)
    } else {
      var im = split[1]

      var img = new Buffer(im, 'base64')
      
      res.writeHead(200, {
         'Content-Type': 'image/png',
         'Content-Length': img.length
      })
      
      res.end(img)
    }
  })
})

app.get('/', (req, res) => {
  let uid = req.session.uid

  if(uid) {
    render('home', req, res, {})
  } else {
    PostHandler.recommend(async post => {
      let result = await PostHandler.feedify(post, true)
      post = result

      AccountHandler.account({
        uid: post.author.authoruid  
      }, (account) => {
        render('index', req, res, {
          rtitle: post.content.title,
          rcontent: post.content.html,
          rlikes: post.external.likers.length,
          rcomments: post.external.comments.length,
          rtopic: post.content.topic,
          rauthor: account.personal.name,
          rdate: post.aesthetic.date,
          rauid: post.author.authoruid,
          rpuid: post.uid,
          rthumb: post.aesthetic.thumbnail,
          rviews: post.external.views,
          rbaseUrl: req.get('host')
        })
      })
    })
  }
})

app.get('/signin', (req, res) => {
  render('signin', req, res, {})
})

app.get('/home', (req, res) => {
  let uid = req.session.uid

  if(uid) {
    render('home', req, res, {})
  } else {
    res.redirect('/auth')
  }
})

app.get('/serve/feed/global', (req, res) => {
  PostHandler.getPosts(posts => {
    PostHandler.feedifyMany(posts, false).then(updated => {
      let finished = []

      updated.forEach(up => {
        if(JSON.parse(up.aesthetic.private) == false) {
          finished.push(up)
        }
      })

      PostHandler.organizePosts(finished, final => {
        res.json(final)
      })
    })
  })
})

app.get('/serve/feed/profile/:uid', async(req, res) => {
  let uid = req.params.uid

  let posts = await PostHandler.getPostsByAuthors([uid])

  let op = []

  posts.forEach((post) => {
    if(JSON.parse(post.aesthetic.private) == false) {
      op.push(post) 
    }
  })

  PostHandler.organizePosts(op, (updated) => {
    PostHandler.feedifyMany(updated).then(finished => {
      res.json(finished)
    })
  })
})

app.get('/profile/:uid', (req, res) => {
  let uid = req.params.uid

  AccountHandler.account({uid: uid}, (account) => {
    if(!ContentHandler.malformed(account)) {
      let verified = ""

      if(account.thoxyn.verified == true) {
        verified = "✔"
      }
  
      render('account', req, res, {
        uid: uid,
        following: account.thoxyn.following.length,
        followers: account.thoxyn.followers.length,
        posts: account.thoxyn.posts.length,
        comments: account.thoxyn.comments.length,
        name: account.personal.name,
        description: account.thoxyn.description,
        image: account.personal.pfp,
        verified: verified
      })
    }
  })
})

app.get('/serve/feed/me', (req, res) => {
  if(req.session.token) {
    let uid = req.session.uid

    AccountHandler.account({uid: uid}, async(account) => {
      let following = account.thoxyn.following

      let posts = await PostHandler.getPostsByAuthors(following)

      let op = []

      posts.forEach((post) => {
        if(JSON.parse(post.aesthetic.private) == false) {
          op.push(post) 
        }
      })
  
      PostHandler.organizePosts(op, (updated) => {
        PostHandler.feedifyMany(updated).then(finished => {
          res.json(finished)
        })
      })
    })
  } else {
    res.json({
      success: false,
      reason: "You must be signed in."
    })
  }
})

app.get('/discover', (req, res) => {
  let uid = req.session.uid

  PostHandler.recommend(async post => {
    let result = await PostHandler.feedify(post, true)
    post = result

    AccountHandler.account({
      uid: post.author.authoruid  
    }, (account) => {
      render('index', req, res, {
        rtitle: post.content.title,
        rcontent: post.content.html,
        rlikes: post.external.likers.length,
        rcomments: post.external.comments.length,
        rtopic: post.content.topic,
        rauthor: account.personal.name,
        rdate: post.aesthetic.date,
        rauid: post.author.authoruid,
        rpuid: post.uid,
        rthumb: post.aesthetic.thumbnail,
        rviews: post.external.views
      })
    })
  })
})

app.get('/serve/feed/me/all', (req, res) => {
  if(req.session.token) {
    let uid = req.session.uid
  
    AccountHandler.account({uid: uid}, async(account) => {
      let posts = await PostHandler.getPostsByAuthors([uid])
    
      PostHandler.organizePosts(posts, (updated) => {
        PostHandler.feedifyMany(updated).then(finished => {
          res.json(finished)
        })
      })
    })
  } else {
    res.json({
      success: false,
      reason: "You must be signed in."
    })
  }
})

app.post('/auth/custom', (req, res) => {
  let email = req.body.email
  let password = req.body.pass

  if(!(ContentHandler.malformed(email) || ContentHandler.malformed(password))) {
    AccountHandler.account({"personal.email": email}, account => {
      if(!ContentHandler.malformed(account)) {
        securitymanager.compare(password, account.thoxyn.password, success => {
          if(success === true) {
            req.session.token = idhandler.newID()
            req.session.id = account.personal.id
            req.session.name = account.personal.name
            req.session.pfp = account.personal.pfp

            req.session.uid = account.uid
            res.redirect('/')
          } else {
            render('signin', req, res, {
              message: "Invalid email or password"
            })
          }
        })
      } else {
        render('signin', req, res, {
          message: "Invalid email or password"
        })
      }
    })
  } else {
    render('signin', req, res, {
      message: "Invalid email or password"
    })
  }
})

app.post('/settings/newpass', (req, res) => {
  if(req.session.uid) {
    if(req.body.password) {
      securitymanager.hash(req.body.pass, (hash) => {
        AccountHandler.account({uid: req.session.uid}, (account) => {
          securitymanager.compare(req.body.password, account.thoxyn.password, (comp) => {
            if(comp) {
              account.thoxyn.password = hash

              AccountHandler.modify(req.session.uid, account, () => {
                res.redirect('/settings')
              })
            } else {
              res.redirect('/settings')
            }
          })
        })
      })
    }
  }
})

app.get('/settings', (req, res) => {
  if(req.session.uid) {
    let uid = req.session.uid

    AccountHandler.account({uid: uid}, (account) => {
      if(!ContentHandler.malformed(account)) {
        let verified = ""
  
        if(account.thoxyn.verified == true) {
          verified = "✔"
        }

        render('settings', req, res, {
          uid: uid,
          following: account.thoxyn.following.length,
          followers: account.thoxyn.followers.length,
          posts: account.thoxyn.posts.length,
          comments: account.thoxyn.comments.length,
          name: account.personal.name,
          description: account.thoxyn.description,
          image: account.personal.pfp,
          verified: verified
        })
      }
    })
  } else {
    res.redirect('/auth')
  }
})

app.get('/search', (req, res) => {
  render('search', req, res, {})
})

app.get('/logout', (req, res) => {
  req.logout()
  req.session = null
  res.redirect('/')
})

app.get('/edit/:uid', (req, res) => {
  let postuid = req.params.uid
  let uid = req.session.uid

  if(uid) {
    PostHandler.post({uid: postuid}, post => {
      if(!ContentHandler.malformed(post)) {
        if(post.author.authoruid == uid) {
          render('edit', req, res, {
            uid: postuid,
            title: post.content.title,
            date: post.aesthetic.date
          })
        } else {
          res.redirect('/404')
        }
      } else {
        res.redirect('/404')
      }
    })
  } else {
    res.redirect('/auth')
  }
})

app.get('/write', (req, res) => {
  if(req.session.uid) {
    render('write', req, res, {})
  } else {
    res.redirect('/auth')
  }
})

app.get('/serve/post/:uid', (req, res) => {
  let postuid = req.params.uid

  PostHandler.post({uid: postuid}, post => {
    post.content.html = xss(post.content.html)
    
    if(post == undefined) {
      res.json({})
    } else {
      PostHandler.postify(post).then(result => {
        res.json(result)
      })
    }
  })
})

//AI recommandations
app.get('/recommend', (req, res) => {
  PostHandler.recommend(post => {
    res.send(post.content.title)
  })
})

app.get('/download/me', (req, res) => {
  if(req.session.uid) {
    AccountHandler.account({uid: req.session.uid}, (account) => {
      res.json(account)
    })
  }
})

app.get('/serve/feed/followers/:uid', async(req, res) => {
  let uid = req.params.uid

  AccountHandler.account({uid: uid}, async(account) => {
    let accounts = await AccountHandler.getAccountsByUids(account.thoxyn.followers)
    res.json(accounts)
  })
})

app.get('/serve/feed/following/:uid', async(req, res) => {
  let uid = req.params.uid

  AccountHandler.account({uid: uid}, async(account) => {
    let accounts = await AccountHandler.getAccountsByUids(account.thoxyn.following)
    res.json(accounts)
  })
})

app.get('/feed/followers/:uid', (req, res) => {
  let uid = req.params.uid

  render('accountfeed', req, res, {
    uid: uid,
    type: "followers"
  })
})

app.get('/feed/following/:uid', (req, res) => {
  let uid = req.params.uid

  render('accountfeed', req, res, {
    uid: uid,
    type: "following"
  })
})

app.get('/post/:post', (req, res) => {
  let postuid = req.params.post
  let url = req.url

  PostHandler.post({uid: postuid}, async post => {
    if(!ContentHandler.malformed(post)) {
      if(req.cookies.postview == undefined) {
        res.cookie("postview", req.session.uid, {maxAge: TimeHandler.seconds(20)})
  
        //limit view updates to every 20 seconds for every viewers using cookies
        post.external.views += 1
          
          //cookie has expired, update views by +1
          PostHandler.modify(postuid, post, async() => {
            post = await PostHandler.feedify(post, false)

            PostHandler.recommend(async recommended => {
              let result = await PostHandler.feedify(recommended, false)
              recommended = result
          
              AccountHandler.account({
                uid: recommended.author.authoruid  
              }, (account) => {
                render('post', req, res, {
                  title: post.content.title,
                  description: post.content.html,
                  image: post.aesthetic.thumbnail,
                  url: "/post/" + post.uid,

                  rtitle: recommended.content.title,
                  rcontent: recommended.content.html,
                  rlikes: recommended.external.likers.length,
                  rcomments: recommended.external.comments.length,
                  rtopic: recommended.content.topic,
                  rauthor: account.personal.name,
                  rdate: recommended.aesthetic.date,
                  rauid: recommended.author.authoruid,
                  rpuid: recommended.uid,
                  rthumb: recommended.aesthetic.thumbnail,
                  rviews: recommended.external.views,
                  uid: postuid
                })
              })
            })
        })
      } else {
        post = await PostHandler.feedify(post, false)

        PostHandler.recommend(async recommended => {
          let result = await PostHandler.feedify(recommended, false)
          recommended = result
      
          AccountHandler.account({
            uid: recommended.author.authoruid  
          }, (account) => {
            render('post', req, res, {
              title: post.content.title,
              description: post.content.html,
              image: post.aesthetic.thumbnail,
              url: "/post/" + post.uid,

              rtitle: recommended.content.title,
              rcontent: recommended.content.html,
              rlikes: recommended.external.likers.length,
              rcomments: recommended.external.comments.length,
              rtopic: recommended.content.topic,
              rauthor: account.personal.name,
              rdate: recommended.aesthetic.date,
              rauid: recommended.author.authoruid,
              rpuid: recommended.uid,
              rthumb: recommended.aesthetic.thumbnail,
              rviews: recommended.external.views,
              uid: postuid
            })
          })
        })
      }
    } else {
      res.redirect('/post/404')
    }
  })
})

app.post('/postquery', (req, res) => {
  //search for posts that match
  PostHandler.query(req.body.query, (posts) => {
    PostHandler.feedifyMany(posts).then(finished => {
      let publicposts = []

      finished.forEach(fin => {
        if(JSON.parse(fin.aesthetic.private) == false) {
          publicposts.push(fin)
        }
      })

      res.json(publicposts)
    })
  })
})

app.post('/accountquery', (req, res) => {
  //search for accounts that match
  AccountHandler.query(req.body.query, accounts => {
    res.json(accounts)
  })
})

app.get('/serve/recommended/authors', (req, res) => {
  AccountHandler.accounts({"thoxyn.verified": true}, accounts => {
    accounts = ContentHandler.shuffle(accounts)

    let service = []
    service.push(aimode.topAuthor(accounts))
    service = service.concat(accounts.splice(0, 2))

    service = ContentHandler.unique(service)

    res.json(service)
  })
})

app.get('/serve/topic/random', (req, res) => {
  let topics = [
    "Technology",
    "Politics",
    "Tutorials",
    "Awareness",
    "Science",
    "Math",
    "Philosophy",
    "History",
    "Sports",
    "Health",
    "Nutrition"
  ]

  let index = ContentHandler.random(topics.length-1)
  if(index < 0) {
    index = 0
  }

  let query = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=" + topics[index]

  request(query, (error, response, body) => {
    let data = JSON.parse(body).query.pages

    let ind = 0

    for(let d in data) {
      ind = d
    }

    if(ContentHandler.malformed(data[ind].extract)) {
      res.json({
        title: topics[index],
        content: data[ind].content.extract
      })
    } else {
      res.json({
        title: topics[index],
        content: data[ind].extract
      })
    }
  })
})
