const express = require('express')
const morgan =require('morgan')
const bodyParser=require('body-parser')
const cookieParser=require('cookie-parser')
const mongoose = require("mongoose");
const cors = require('cors')
require('dotenv').config()
const blogRoutes = require('./routes/blog')
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const categoryRoutes = require('./routes/category')
const tagRoutes = require('./routes/tag')
const formRoutes = require('./routes/form')
//app
const app = express()

mongoose.connect(process.env.DATABASE, { useNewUrlParser: true,  useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
    .then(() => console.log('You are now connected to Mongo!'))
    .catch(err => console.error('Something went wrong', err))

//middlewares
app.use(morgan('dev'))
app.use(bodyParser.json())
app.use((req, res, next)=>{
    res.header("Access-Control-Allow-Origin" , "*");
    res.header("Access-Control-Allow-Headers" , "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if(req.method==='OPTIONS'){
        res.header("Access-Control-Allow-Methods",  'GET, POST, OPTIONS, PUT, DELETE, HEAD, PATCH');
        return res.status(200).json({});
    }
    next();
})
app.use(cookieParser())
//routes middleware
app.use('/api', blogRoutes)
app.use('/api', authRoutes)
app.use('/api', userRoutes)
app.use('/api', categoryRoutes)
app.use('/api', tagRoutes)
app.use('/api', formRoutes)


// //cors
// if(process.env.NODE_ENV === 'development'){
//     app.use(cors({origin: `${process.env.CLIENT_URL }`}))
// }


//port
const port = process.env.PORT || 8000

app.listen(port, ()=> {
    console.log(`Server is running on ${port}`)
})