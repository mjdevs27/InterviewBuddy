"use server";

import {db , auth} from "@/firebase/admin";
// import { Auth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { success } from "zod";
// import { success } from "zod";
const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

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

        return {
            success : true ,
            message:"Account created sucessfully.Please Sign-in"
        }

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
    const {email, idToken} = params;
    try {
        const userRecord = await auth.getUserByEmail(email)

        if(!userRecord){
            return {
                success:false,
                message:"User does not exist. Please Create an Account using Sign-Up"
            }
        }

        await setSessionCookie(idToken)

    } catch (error) {
        console.log(error , "error in sign in function")
    }
}

export async function setSessionCookie(idToken:string){
    const cookieStore = await cookies();

    const sessionCookie = await auth.createSessionCookie(idToken,{
        expiresIn: ONE_WEEK
    });

    cookieStore.set('session' , sessionCookie , {
        httpOnly: true,
        maxAge: ONE_WEEK / 1000,
        secure: process.env.NODE_ENV === 'production',
        path:'/',
        sameSite:'lax'
    })
}

export async function getCurrentUser(): Promise<User | null> {
     const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

    // get user info from db
    const userRecord = await db
      .collection("users")
      .doc(decodedClaims.uid)
      .get();
    if (!userRecord.exists) return null;

    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User;
  } catch (error) {
    console.log(error);

    // Invalid or expired session
  
    return null;
}}

export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}