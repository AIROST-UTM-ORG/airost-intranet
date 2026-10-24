const VerifiedUser = require('../models/VerifiedUser');
const User = require('../models/User');

const createVerifiedUser = async (req, res) => {
    const newVerifiedUser = new VerifiedUser({
        name : req.body.name,
        email : req.body.email,
        position : [req.body.position],
    })
    try {
        const existingUser = await VerifiedUser.findOne({email : newVerifiedUser.email});

        if (existingUser){
            res.json({createStatus : "exist"})
        }
        else {
            await newVerifiedUser.save();
            res.status(201).json({createStatus : "success"});
            await User.updateOne({email: req.body.email},{
                $set:{
                    position: [req.body.position]
                }
            })
        }
    } 
    catch(err){
        console.log(err)
    }
}

module.exports = {
    createVerifiedUser,
}

