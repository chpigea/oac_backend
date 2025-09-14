const express = require('express');
const router = express.Router();
const Users = require('../models/users');

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

  router.post('/authenticate', (req, res) => {  
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

  return router

}

