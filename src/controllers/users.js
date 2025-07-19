const express = require('express');
const router = express.Router();
const Users = require('../models/users');


// Get all users
router.get('/', async (req, res) => {
    Users.get().then(users => {
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
  Users.get({
    id: req.params.id
  }).then(user => {
      if(user){
        res.json({
          success: true,
          data: users,
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
  
    const user = req.body;
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
    res.status(500).json({
      success: false,
      data: null,
      message: `Error: ${err}`
    });
  })
});

module.exports = router;