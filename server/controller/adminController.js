const User = require('../models/User');

const createVerifiedUser = async (req, res) => {
    try {
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const position = typeof req.body.position === 'string' ? req.body.position.trim() : '';
        if (!name || !email || !position) {
            return res.status(400).json({ error: 'Name, email, and position are required.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            existingUser.name = name;
            existingUser.positions = [...new Set([...(existingUser.positions || []), position])];
            existingUser.isActive = true;
            await existingUser.save();
            return res.json({ createStatus: 'success', userId: existingUser._id });
        }

        const user = await User.create({ name, email, positions: [position], isActive: true });
        return res.status(201).json({ createStatus: 'success', userId: user._id });
    } 
    catch(err){
        console.log(err)
        return res.status(500).json({ error: 'Unable to create member.' });
    }
}

module.exports = {
    createVerifiedUser,
}

