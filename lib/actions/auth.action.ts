
import {db} from "@/firebase/admin";

export async function signUp(params:SignUpParams){
    const{uid,email,password,displayName} = params;
    try {
        const userRecord = await db.collection("users").doc(uid).get()
        //fetching a document with the id of UID from the users collection
        if(userRecord.exists){
            return{
                success:false,
                message:"User already exists. Please sign in instead"
            }
        }
        await db.collection('users').doc(uid).set({
            displayName , email
        })

    } catch (error: any) {
        console.error(error);

        if(error.code === "auth/email/already-in-use"){
            return{
                success: false,
                message:"email already in use0"
            }
        }
        return{
            success: false,
            message:"Failed to create an account"
        }
    }

}

export async function signIn(params:SignInParams){
    
}