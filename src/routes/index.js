const { Router } = require('express');
const userRouter = require('./user.routes.js');
const authorRouter = require('./author.routes.js');
const materialRouter = require('./material.routes.js')


const router = Router();

router.use('/users', userRouter); 
router.use('/materials', materialRouter);
router.use('/authors', authorRouter);


module.exports = router;