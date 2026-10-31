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
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const position = typeof req.body.position === 'string' ? req.body.position.trim() : '';

    if (!name || !email || !position) {
        return res.status(400).json({ error: 'Name, email, and position are required.' });
    }

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            await User.updateOne({ _id: existingUser._id }, { $addToSet: { positions: position } });
            return res.status(200).json({ createStatus: 'success' });
        }

        await User.create({ name, email, positions: [position] });
        return res.status(201).json({ createStatus: 'success' });
    } catch (error) {
        console.error('Unable to create verified user:', error);
        return res.status(500).json({ error: 'Unable to create verified user.' });
    }
}

module.exports = {
    createVerifiedUser,
    getUsers
}
