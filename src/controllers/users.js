const express = require('express');
const router = express.Router();
const Users = require('../models/users');
const { randomUUID } = require('crypto');

// Get all users
router.get('/', async (req, res) => {
    Users.find(null).then(users => {
      res.json({
        success: true,
        data: users,
        message: null
      });
    }).catch(err => {
      res.status(500).json({
        success: false,
        data: null,
        message: `Error: ${err}`
      });
    })
});

// Get user by ID
router.get('/:id', async (req, res) => {
  Users.find(req.params.id).then(user => {
      if(user){
        res.json({
          success: true,
          data: user,
          message: null
        });
      }else{
        res.status(404).json({
          success: false,
          data: null,
          message: 'User not found'
        });
      }
    }).catch(err => {
      res.status(500).json({
        success: false,
        data: null,
        message: `Error: ${err}`
      });
    })
});

// Create new user
router.post('/', async (req, res) => {
  console.log("POST new user");
  const user = req.body;
  Users.add(user).then(id => {
    res.status(201).json({
      success: true,
      data: id,
      message: null
    });
  }).catch(err => {
    res.status(500).json({
      success: false,
      data: null,
      message: `Error: ${err}`
    });
  })
});

// Update existing user
router.put('/:id', async (req, res) => {
    console.log("PUT update user");
    const user = req.body;
    console.log(user);
    Users.update(user).then(count=>{
      if (count === 0) {
        res.status(404).json({
            success: false,
            data: null,
            message: 'User not found'
        });
      }else{
        res.json({
          success: true,
          data: null,
          message: 'User updated successfully'
        });
      }
    }).catch(err=>{
      res.status(500).json({
        success: false,
        data: null,
        message: `Error: ${err}`
      });
    })    
})

router.delete('/:id', async (req, res) => {
  console.log("DELETE user");
  Users.delete(req.params.id).then(deletedCount=>{
    if (deletedCount === 0) {
      res.status(404).json({
          success: false,
          data: null,
          message: 'User not found'
      });
    }else{
      res.json({
        success: true,
        data: null,
        message: 'User deleted successfully'
      });
    }
  }).catch(err=>{
    console.log(err)
    res.status(500).json({
      success: false,
      data: null,
      message: `Error: ${err}`
    });
  })
});

router.get('/forget-password/:user_or_email', async (req, res) => {
  const user_or_email = req.params.user_or_email;
  const resetToken = randomUUID();
  const resetLink = req.protocol + '://' + req.get('host') + '/frontend/reset-password?token=' + resetToken;
  Users.sendResetPassword(user_or_email, resetToken, resetLink).then(() => {
    res.json({
      success: true,
      message: ''
    });
  }).catch(err => {
    res.status(500).json({
      success: false,
      message: `${err}`
    });
  });
});

router.post('/reset-password', async (req, res) => {
  const body = req.body || {};
  const _user = body.user || {}
  const user_id = _user.id || 0;
  const resetToken = _user.token || null;
  const resetPassword = _user.password || null;
  const currentTs = Math.ceil((new Date().getTime())/1000);
  console.log("HERE: " + user_id)
  Users.find(user_id).then(user => {
    console.log(user)
    console.log(currentTs)
    if(user && user.reset_token === resetToken && (currentTs <= parseInt(user.reset_token_expiration))){
      console.log("To update...")
      Users.update({
        id: user.id,
        password: resetPassword,
        reset_token: '',
        reset_token_expiration: 0
      }).then(() => {
        console.log("Reset ok...")
        res.json({
          success: true,
          message: 'Password reset successfully'
        });
      }).catch(err => {
        console.log("Reset ERROR...")
        res.status(500).json({
          success: false,
          message: `${err}`
        });
      });
    }else{
      console.log("Invalid token...")
      res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }
  }).catch(err => {
    console.log("Other error...")
    res.status(500).json({
      success: false,
      message: `${err}`
    });
  });
});

module.exports = router;
