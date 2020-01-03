$('#general').hide()
$('#personal').hide()

if(app == false || app == undefined || app == null) {
  if(muid.trim() != "null") {
    $('#personal').show()
  } else {
    $('#general').show()
  } 
}

$("img").on("error", function() {
  $(this).hide()
})

console.log("docker")
//change navbars based on whether user is signed in or not