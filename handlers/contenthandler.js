const he = require('he')

module.exports.convertHTML = (str) => {
  var entityPairs = [
      {character: '&', html: '&amp;'},
      {character: '<', html: '&lt;'},
      {character: '>', html: '&gt;'},
      {character: "'", html: '&apos;'},
			{character: '"', html: '&quot;'},
			{character: ' ', html: '\n'}
  ]
  
  entityPairs.forEach((pair) => {
      var reg = new RegExp(pair.html, 'g')
      str = str.replace(reg, pair.character)
  })
  
  return he.decode(str.replace(/[^\x20-\x7E]+/g, ""))
}

module.exports.malformed = (str) => {
	if(str instanceof String) {
		return str == undefined || str == null || str.trim() == ""
	} else {
		return str == undefined || str == null
	}
}

module.exports.shuffle = (a) => {
	for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

module.exports.thumbnail = () => {
	let list = [
		"/img/one.jpg",
		"/img/two.jpg",
		"/img/three.jpg",
		"/img/four.jpg",
		"/img/five.jpg",
		"/img/six.jpg",
		"/img/seven.jpg",
		"/img/eight.jpg",
	]

	return list[this.random(list.length-1)]
}

module.exports.random = (max) => {
  return Math.floor(Math.random() * Math.floor(max))
}

module.exports.randomRange = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return (Math.floor(Math.random() * (max - min + 1)) + min)-1; //The maximum is inclusive and the minimum is inclusive 
}

module.exports.unique = (a) => {
	return Array.from(new Set(a))
}