const nodemailer = require('nodemailer')

const user = process.env.EMAIL_USER
const password = process.env.EMAIL_PASSWORD

module.exports.sendEmail = (recipient, subject, html, callback) => {
    var transporter = nodemailer.createTransport({
        host: 'smtp.zoho.com',
        port: 465,
        secure: true, // use SSL
        auth: {
            user: user,
            pass: password
        }
    });

    var mailOptions = {
        from: '"Thoxyn " <' + user + '>',
        to: recipient, 
        subject: subject, 
        html: html
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if(error){
            return console.log(error);
        }

        callback()
    });
}
