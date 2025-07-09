const express = require('express');
const router = express.Router();
const startDate = new Date()


router.get('/', (req, res) => {

  let curDate = (new Date()).getTime()

  res.json({ 
    success: true, 
    running: Math.ceil((curDate - startDate.getTime())/1000),
    started: startDate.toISOString()
  });

});

module.exports = router
