const bcrypt = require('bcrypt')

module.exports.hash = (password, callback) => {	
	bcrypt.hash(password, 16, (err, hash) => {
		callback(hash)
	})
}

module.exports.compare = (password, hash, callback) => {
	bcrypt.compare(password, hash, (err, res) => {
    callback(res)
	})
}