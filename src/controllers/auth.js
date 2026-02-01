const express = require('express');
const router = express.Router();
const Users = require('../models/users');
const EmailSender = require('../models/EmailSender');
const config = require('../config');
const EXPOSED = config.exposed || {};
const { randomUUID } = require('crypto');
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = function(jwtLib){
  /**
  curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"type": "login","user":"igea","password":"@igea#"}' \
  http://localhost:4000/backend/auth/authenticate
  */

  const manageUser = function(res, user){
    let token = jwtLib.createToken(user)
      res.cookie('token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      })
      res.json({ 
          success: true, 
          data: user, 
          message: null
      });
  }

  router.get('/exposed_config', (req, res) => {  
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if(EXPOSED.host == "127.0.0.1" || EXPOSED.host == "localhost"){
        if(ip.includes("127.0.0.1"))
          EXPOSED.host = "127.0.0.1"
        else if(ip.includes("localhost"))
          EXPOSED.host = "localhost"
      }
      res.json({ 
          success: true, 
          data: EXPOSED
      });
  });

  router.post('/authenticate', authLimiter, (req, res) => {  
    console.log("here authenticate")
    let body = req.body 
    let type = body.type
    
    if(type.toLowerCase()=="login"){
      let user = body.user
      let password = body.password
      Users.fromAuthentication(user, password)
      .then(response => {
        response["is_anonymous"] = false
        manageUser(res, response)
      }).catch(err => { 
        res.json({ 
            success: false, 
            data: null, 
            message: `${ err }`
        });
      })
    }else{
      manageUser(res, {
        id: -1,
        name: 'anonymous',
        surname: 'anonymous',
        username: 'anonymous',
        email: 'anonymous@igea-soluzioni.it',
        mobile: null,
        role: 3,
        is_active: true,
        is_anonymous: true
      })
    }
  });

  router.get('/echo', (req, res) => {  
      console.log("here ECHO")
      res.json({ 
          success: true, 
          data: "echo", 
          message: null
      });
  });

  router.post('/password_recovery', (req, res) => {  
    let body = req.body 
    let user_or_email = body.user
    Users.fromUserOrEmail(user_or_email)
      .then(async response => {
        let email = response.email
        console.log(`Send email to ${email} with recovery instructions`)
        const token = randomUUID();
        await Users.setPasswordRecoveryToken(response.id, token)
        const activationLink = `${EXPOSED.protocol}://${EXPOSED.host}:${EXPOSED.port}/frontend/v2/users/reset_password/${response.id}/${token}`
        EmailSender.sendPasswordRecoveryEmail(
          email, activationLink
        ).then( () => {
          console.log("Email sent")
          res.json({ 
            success: true
          });
        }).catch( err => {
          console.log("Error sending email", err)
          res.json({ 
              success: false, 
              message: `${ err }`
          });
        })
      }).catch(err => { 
        console.log(err)  
        res.json({ 
            success: false, 
            message: `${ err }`
        });
    })
  })

  return router

}

