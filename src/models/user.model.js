import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"

const userSchema = new Schema(
  {
    userName:{
      type : String,
      required : true,
      unique : true,
      lowercase : true,
      trim: true,
      index : true
    },
    
    email:{
      type : String,
      required : true,
      unique : true,
      lowercase : true,
      trim: true
    },
    
    fullName:{
      type : String,
      required : true,
      trim: true,
      index : true
    },
    
    avatar :{
      type : String , //cloudinary URL
      //required: true
    },

    coverImage : {
      type: String // cloudinary URL
      
    },

    password : {
      type: String,
      required : [true, "Password is required"]
    },

    refreshToken: {
      type: String
    }
  
  },
  {
    timestamps : true
  }

);

//this mongoDB hook is used to modify field just before saving , specifically, this function is used to encrypt the password
userSchema.pre("save",async function(next){

  if(!this.isModified("password")) next(); // if password is not modfied than skip encryption

  this.password = await bcrypt.hash(this.password,10)
  next();

}) //we are not using arrow function bcz it will not have "this" access






//We can also create methods in mongodb
userSchema.methods.isPasswordCorrect = async function(password){

  return bcrypt.compare(password,this.password)
}


//For generating Accesee Token (JWT)
userSchema.methods.generateAccessToken = async function(){

  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      userName: this.userName,
      fullName: this.fullName
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn : process.env.ACCESS_TOKEN_EXPIRY
    }
  )
}

userSchema.methods.generateRefreshToken = async function(){

  return jwt.sign(
    {
      _id: this._id,
    
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn : process.env.REFRESH_TOKEN_EXPIRY
    }
  )
}





export const User = mongoose.model("User",userSchema)
