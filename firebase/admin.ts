// server side setup is the admin setuo where all the information will be retrieved and hence the client side information will
// retrived here 

// import { get } from "http"
import { cert, getApps, initializeApp } from "firebase-admin/app"
// import { initialize } from "next/dist/server/lib/render-server"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

// initializing the admin 
const initFirebaseAdmin = () => {
    const apps = getApps()

    if(apps.length === 0){
        initializeApp({
            credential:cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            })
        })
    }
// using to get the authentication and the firestore database hence exporting it and getting the client side information
    return(
        {
            auth: getAuth(),
            db: getFirestore(),
            // storage: getStorage(),
        }
    )

}