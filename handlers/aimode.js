const brain = require('brain.js')
const fs = require('fs')

const contenthandler = require('./contenthandler.js')

const config = {
  binaryThresh: 0.5,     // ¯\_(ツ)_/¯
  hiddenLayers: [10],     // array of ints for the sizes of the hidden layers in the network
  activation: 'sigmoid'  // supported activation types: ['sigmoid', 'relu', 'leaky-relu', 'tanh']
};

// create a simple feed forward neural network with backpropagation
const rate = new brain.NeuralNetwork(config)

rate.train([ //likes, comments, random (between .5 and 1), promoted (1 for yes, 0 for now)
    {input: [0, 0], output: [0]},
    {input: [1, 1], output: [1]},
])

module.exports.rate = (posts) => {
    posts = contenthandler.shuffle(posts)

    let highest = 0
    let hPost = undefined

    posts.forEach(post => {
        let pVal = 0
        if(post.aesthetic.verified == true) {
            pVal = 1
        }

        let tVal = 0
        if(post.content.topic) {
            if(post.content.topic != "Ambiguous") {
			    tVal = 1
		    }
        } 

        let rating = rate.run([pVal, tVal])[0]
        if(rating >= highest) {
            highest = rating
            hPost = post
        }
    })

    return hPost
}

const authors = new brain.NeuralNetwork(config)

authors.train([
    //posts, total views
    {input: [0], output: [0]},
    {input: [1], output: [1]}
])

module.exports.topAuthor = (accounts) => {
    accounts = contenthandler.shuffle(accounts)

    let highest = 0
    let hAcc = undefined

    accounts.forEach(account => {
        let rating = authors.run([account.thoxyn.posts.length])[0]

        if(rating >= highest) {
            highest = rating
            hAcc = account
        }
    })

    return hAcc
}