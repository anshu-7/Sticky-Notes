const asyncHandler = (requestHandler) =>{

  return (req,res,next) =>{

     Promise.resolve(requestHandler(req,res,next)).
      catch((err)=>{next(err)})
  }


}


export {asyncHandler}

//alternative syntax using try catch


/*


  const asyncHandler = (fn)=> async (req,res, next)=>{

    try{

      await fn(res,res,next)

    }catch(error){

      res.status(error.code || 500).json({
        success: false,
        message=  error.message
      })
    }

  }

*/

