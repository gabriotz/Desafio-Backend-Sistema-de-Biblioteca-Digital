const { Router } = require('express');
const healthRouter = require('./health.routes');
const userRouter = require('./user.routes.js');
const authorRouter = require('./author.routes.js');
const materialRouter = require('./material.routes.js')


const router = Router();

router.use('/health', healthRouter);
router.use('/users', userRouter); 
router.use('/materials', materialRouter);
router.use('/authors', authorRouter);


module.exports = router;