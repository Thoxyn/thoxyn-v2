module.exports.today = () => {
  let objDate = new Date(new Date())
  let locale = 'en-us'

  return (objDate.toLocaleString(locale, { month: 'long' }) + ' ' + new Date().getDate() + ', ' + new Date().getFullYear()).toString()
}

module.exports.getTimeID = () => {
  let d = new Date()
  return d.getTime()
}

module.exports.seconds = (seconds) => {
  return seconds * 1000
}