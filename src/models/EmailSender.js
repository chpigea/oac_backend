const nodemailer = require('nodemailer');
const config = require('../config');
const SMTP = config.smtp || {};

class EmailSender {

  static sendPasswordRecoveryEmail(userEmail, recoveryLink) {
    // Logic to send email
    console.log(`Sending password recovery email to ${userEmail} with link: ${recoveryLink}`);
    return this.sendEmail(userEmail, {
      subject: 'Password Recovery Instructions',
      text: `Please use the following link to recover your password: ${recoveryLink}`,
      html: `<p>Please use the following link to recover your password:</p><a href="${recoveryLink}">${recoveryLink}</a>`
    });     
  } 

  static sendEmail(email, message) {
    return new Promise(async (resolve, reject) => {
      try {
        const smtpOptions = {
          host: SMTP.host,
          port: SMTP.port,
          secure: SMTP.secure, // true for 465, false for other ports
          auth: {
            user: SMTP.auth.user,
            pass: SMTP.auth.pass,
          }
        }
        console.log(smtpOptions)
        let transporter = nodemailer.createTransport(smtpOptions);
        
        let mailOptions = {
          from: `"OAC" <${SMTP.auth.user}>`, // sender address
          to: email, // list of receivers
          subject: message.subject, // Subject line
          text: message.text, // plain text body
          html: message.html, // html body
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        resolve(info);
      } catch (error) {
        console.error('Error sending email:', error);
        reject(error);
      }
    });
  } 

}

module.exports = EmailSender;
