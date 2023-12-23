import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler( async (req,res)=>{

  //get user details from frontend
  //validation - Not empty
  //check if user already exist: username,email
  //check for images , check for avatar
  //upload them to cloudinary
  //create user object- create entry in mongoDB
  //remove password and refresh token from response
  //check for user creation
  //return response
  

  const {fullName, email, userName, password} = req.body
  console.log("email", email)

  /*
  if(fullName === ""){
    throw new ApiError(400,"fullName is required")
  }*/

  //Better approach to check fields emptiness

  if([fullName,email,password,userName].some((field)=> field?.trim() === "")){
    throw new ApiError(400,"All fields are required")
  }
 // can do more validation for email ,username etc --> assignment


//checking if username or email already present in db
  //User is from user model file, this can interact directly with db
 
  const existedUser = User.findOne({

   $or : [{ userName },{ email }]
 })

  if (existedUser) {
    throw new ApiError(409,"User with email or username already exists")
  }


  

  //Taking local paths 
  
  const avatarLocalPath = req.files?.avatar[0]?.pathu;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
  }

  //uploading to cloudinary


  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)


  //Rechecking for avatar as it is required field
  if (!avatar) {
    throw new ApiError(400,"Avatar file is required")
  }


  //Entry to db
  const user = await User.create({
    fullName,
    avatar: avatar.url, // avatar is whole response from cloudinary, we only need url
    coverImage : coverImage.url || "", //optional
    email,
    password,
    userName : userName.toLowerCase()
  })

  //verifying if user is created
  //in select method we will put those fields which we don't want.
  const createdUser = await User.findById(user._id).select(

    "-password -refreshToken"
  )

  if(!createdUser){

    throw new ApiError(500,"Something went wrong while registering the user")

  }


  //return res.status(201).json(createdUser) : We can do like this also,but its not standard approach.

  return res.status(201).json(

    new ApiResponse(200,createdUser,"User registered successfully")
  )

})

export { registerUser }
