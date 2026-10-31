const VerifiedUser = require('../models/VerifiedUser');
const User = require('../models/User');

const getUsers = async (req, res) => {
    var verifiedUsers = await VerifiedUser.find();

    var loggedInUsers = await User.find();

    let allUsers = [];

    for (let loggedInUser of loggedInUsers){
        let verified = false;

        if (verifiedUsers.find(verUser => verUser.email == loggedInUser.email)){
            verified = true;
        }
        allUsers.push({
            email: loggedInUser.email,
            name: loggedInUser.name,
            photo: loggedInUser.photo,
            position: loggedInUser.position,
            loggedIn: true,
            verified: verified
        })
    }

    for (let verUser of verifiedUsers){
        if (allUsers.find(user => user.email == verUser.email)) continue;
        allUsers.push(
            {
                email: verUser.email,
                name: verUser.name,
                photo: '',
                position: verUser.position,
                loggedIn: false,
                verified: true,
            }
        )
    }
    res.json(allUsers)
}

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
    getUsers
}

