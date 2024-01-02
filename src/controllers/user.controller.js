import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user  = await User.findById(userId)
    
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave : false}); //it bypasses the required fields validation by mongoose model checks during saving to db eg password is required etc
    
    return {accessToken, refreshToken}
  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating access and refresh token")
  }
}



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
  // console.log("email", email)

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
 
  const existedUser = await User.findOne({

   $or : [{ userName },{ email }]
 })

  if (existedUser) {
    throw new ApiError(409,"User with email or username already exists")
  }


  

  //Taking local paths 
  
  // const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  // console.log("avatar",avatarLocalPath)
  let avatarLocalPath;
  if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0)
  {
    avatarLocalPath = req.files?.avatar[0]?.path;
  }

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
  {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is required")
  }

  //uploading to cloudinary


  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  // console.log("avatar",avatar)


  //Rechecking for avatar as it is required field
  if (!avatar) {
    throw new ApiError(400,"Avatar file is required")
  }


  //Entry to db
  const user = await User.create({
    fullName,
    avatar: avatar.url, // avatar is whole response from cloudinary, we only need url
    coverImage : coverImage ? coverImage.url : "", //optional
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

const loginUser = asyncHandler(async(req,res)=>{

  const {userName,email,password} = req.body;

  if(!userName && !email)
  {
    throw new ApiError(400,"Username or email is required")
  }

  const user = await User.findOne({
    $or:[{email},{userName}]
  })

  if(!user){
    throw new ApiError(404,"User does not exists")
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if(!isPasswordValid)
  {
    throw new ApiError(401,"Invalid user credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {   // this options is used so that cookie can only be modifieable by servers
    httpOnly : true,
    secure : true
  }

  return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken",refreshToken,options)
        .json(new ApiResponse(
          200,
          {
             user : loggedInUser,
             accessToken,
             refreshToken
          },
          "User logged in successfully"
        ))

})

const logoutUser = asyncHandler(async(req,res)=>{

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken : undefined
      }
    },
    {
      new : true
    }
  )


  const options = {   // this options is used so that cookie can only be modifieable by servers
    httpOnly : true,
    secure : true
  }

  return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"User logged Out"))  
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
  const incomingRefreshToken  = req.cookies.refreshToken || req.body.refreshToken

  if(!incomingRefreshToken){
    throw new ApiError(401,"Unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )
  
    const user = await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401,"Invalid refresh token")
    }
  
    if(incomingRefreshToken !== user?.refreshToken)
    {
      throw new ApiError(401,"Refresh token is expired or used")
    }
  
    //now generate new refresh token
  
    const options = {
      httpOnly : true,
      secure : true
    }
  
    const {accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
  
    return res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",newRefreshToken,options)
            .json(
              new ApiResponse(
                200,
                {accessToken,refreshToken : newRefreshToken},
                "Access token refreshed"
              )
            )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
  }

})

export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken
}
