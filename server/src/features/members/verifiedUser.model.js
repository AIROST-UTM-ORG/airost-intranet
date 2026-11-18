const mongoose = require('mongoose'); 

const verifiedUserSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
     },
    name:{
        type:String,
        required:true,
     },
    position:{
        type:Array,
        required:true,
    },
});

module.exports = mongoose.model('VerifiedUser', verifiedUserSchema);