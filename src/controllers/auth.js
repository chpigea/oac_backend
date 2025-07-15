const express = require('express');
const router = express.Router();
const Users = require('../models/users');

/**
curl -X POST \
-H "Content-Type: application/json" \
-d '{"type": "login","user":"igea","password":"@igea#"}' \
http://localhost:4000/backend/auth/authenticate
 */
router.post('/authenticate', (req, res) => {  
  console.log("here authenticate")
  let body = req.body 
  //let type = body.type
  let user = body.user
  let password = body.password
  Users.fromAuthentication(user, password)
  .then(response =>{
    res.json({ 
        success: true, 
        data: response, 
        message: null
    });
  }).catch(err => { 
    res.json({ 
        success: false, 
        data: null, 
        message: `${ err }`
    });
  })
});

router.get('/echo', (req, res) => {  
    console.log("here ECHO")
    res.json({ 
        success: true, 
        data: "echo", 
        message: null
    });
});

module.exports = router
