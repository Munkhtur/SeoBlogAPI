const User = require('../models/user')
const Blog =require('../models/blog')
const shortId = require('shortid')
const jwt = require('jsonwebtoken')
const expressJwt = require('express-jwt')
const {errorHandler} = require('../helpers/dbErrorHandler')
const sgMail = require('@sendgrid/mail')
const _ = require('lodash')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)

exports.preSignup =(req, res)=>{
    const {email, name, password} = req.body
    User.findOne({email}, (err, user)=>{
        if(user){
            return res.status(400).json({
                error: 'Email is taken'
            })
        }
        const token = jwt.sign({name, email, password}, process.env.JWT_ACTIVATION, {expiresIn: '10m'})

         //email
         const emailData ={
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Activation link',
            html: `
                <p>Please use the following link to activate your password:</p>
                <p>${process.env.CLIENT_URL}/auth/account/activate/${token}</p>
                <hr />
                <p>This email containes sensitive information</p>
                <p>https://seoblog.com</p>
            `
        }

        sgMail.send(emailData).then(sent=>{
            return res.json({
                message: `Email has been sent to ${email}. Follow the link to activate your account` 
            })
        })
    })
}


// exports.signup = (req, res) =>{
//     User.findOne({email: req.body.email}).exec((err, user)=>{
//         if(user){
//             return res.status(400).json({
//                 error: 'Email is taken'
//             })
//         }

//         const {name, email, password} = req.body
//         let username = shortId.generate();
//         let profile = `${process.env.CLIENT_URL}/profile/${username}`;

//         let newUser = new User({name, email, password, username, profile});
//         newUser.save((err, success)=>{
//             if(err){
//                 return res.status(400).json({
//                     error:err
//                 })
//             }
//             res.json({
//                 message: 'Signup successful'
//             })
//         });
//     })

// }

exports.signup = (req, res) =>{
    const token = req.body.token
    if(token){
        jwt.verify(token, process.env.JWT_ACTIVATION, function(err, decoded){
            if(err){
                return res.status(401).json({
                    error: 'Expired link. Try again'
                })
            }

            const {name, email, password} = jwt.decode(token)
            let username = shortId.generate();
            let profile = `${process.env.CLIENT_URL}/profile/${username}`;

            const user = new User({name, email, password, username, profile})
            user.save((err, user)=>{
                if(err){
                    return res.status(401).json({
                        error: errorHandler(err)
                    })
                }
                return res.json({
                    message: 'Signup was successful, please signin'
                })
            })
        })
    }else{
        return res.json({
            message: 'Something went wrong try again'
        })
    }
}

exports.signin = (req, res)=>{
    res.header("Access-Control-Allow-Origin" , "*");
    res.header("Access-Control-Allow-Headers" , "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if(req.method==='OPTIONS'){
        res.header("Access-Control-Allow-Methods",  'GET, POST, OPTIONS, PUT, DELETE, PATCH');
        return res.status(200).json({});
    }
    const {email, password } = req.body
    //check if user exist
    User.findOne({email}).exec((err, user)=>{
        if(err || !user){
            return res.status(400).json({
                error: 'does not exist'
            })
        }

        // authenticate
        if(!user.authenticate(password)){
            return res.status(400).json({
                error: 'does not match'
            })
        }

        //genertate token expiry of session
        const token = jwt.sign({_id:user._id}, process.env.JWT_SECRET, {expiresIn: '1d'})
        res.cookie('token', token, {expiresIn: '1d'})
        const{_id, username, name, email, role} = user

        return res.json({
            token, 
            user: {_id, username, name, email, role}
        })

    })
}

exports.signout = (req, res)=>{
    res.clearCookie('token')
    res.json({
        message: 'signed out'
    })
}

exports.requireSignin= expressJwt({
    secret: process.env.JWT_SECRET
})

exports.authMiddleware = (req, res, next)=>{
    const authUserId = req.user._id
    User.findById({_id: authUserId}).exec((error, user)=>{
        if(error || !user){
            return res.status(400).json({
                error: 'User not found'
            })
        }
        req.profile =user
        next()
    })
}
exports.adminMiddleware = (req, res, next)=>{
    const adminUserId = req.user._id
    User.findById({_id: adminUserId}).exec((error, user)=>{
        if(error || !user){
            return res.status(400).json({
                error: 'User not found'
            })
        }

        if(user.role !== 1){
            return res.status(400).json({
                error: 'Admin resource. Access denied'
            })
        }

        req.profile =user
        next()
    })
}

exports.canUpdateDeleteBlog =(req, res, next)=>{
    const slug = req.params.slug.toLowerCase()
    Blog.findOne({slug}).exec((err, data)=>{
        if(err){
            return res.status(400).json({
                error: errorHandler(err)
            })
        }
        let authorizedUser = data.postedBy._id.toString() === req.profile._id.toString()
        if(!authorizedUser){
            return res.status(400).json({
                error: 'Not authorized'
            })
        }
        next()
    })
}

exports.forgotPassword =(req, res)=>{
    const {email} = req.body

    User.findOne({email}, (err, user)=>{
        if(err || !user){
            return res.status(401).json({
                error: 'User with that email does not exist'
            })
        }
        const token = jwt.sign({_id: user._id}, process.env.JWT_RESET_PASSWORD, {expiresIn: '10m'})

        //email
        const emailData ={
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Password reset link',
            html: `
                <p>Please use the following link to reset your password:</p>
                <a href=${process.env.CLIENT_URL}/auth/password/reset/${token}>${process.env.CLIENT_URL}/auth/password/reset/${token}</a>
                <hr />
                <p>This email containes sensitive information</p>
                <p>https://seoblog.com</p>
            `
        }

        //user db set resetpassword link
        return user.updateOne({resetPasswordLink: token}, (err, succes)=>{
            if(err){
                return res.json({
                    error: errorHandler(err)
                })
            }else{
                sgMail.send(emailData).then(sent=>{
                    return res.json({
                        message: `Email has been sent tp ${email}. Follow the link to reset your password. The link expires in 10 minutes.`
                    })
                })
            }
        })
    })
}

exports.resetPassword =(req, res)=>{
    const {resetPasswordLink, newPassword} = req.body
    if(resetPasswordLink){
        jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function(err, decoded){
            if(err){
                return res.status(401).json({
                    error: 'Expired link'
                })
            }
            User.findOne({resetPasswordLink}, (err, user)=>{
                if(err || !user){
                    return res.status(401).json({
                        error: 'Something went wrong. Try again'
                    })
                }
                const updatedFields = {
                    password: newPassword,
                    resetPasswordLink: ''
                }
                user = _.extend(user, updatedFields)

                user.save((err, result)=>{
                    if(err){
                        return res.status(400).json({
                            error: errorHandler(err)
                        })
                    }
                    res.json({
                        message: 'Password Updated. Signin with your new password'
                    })
                })
            })
        })
    }
}

