import { initializeApp } from 'firebase/app';
import { getAuth, getIdToken } from 'firebase/auth';

// Export App Object
export const app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_F_APIKEY,
    authDomain: process.env.NEXT_PUBLIC_F_AUTHDOMAIN,
    projectId: process.env.NEXT_PUBLIC_F_PROJECTID,
    storageBucket: process.env.NEXT_PUBLIC_F_STORAGEBUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_F_MESSAGINGSENDERID,
    appId: process.env.NEXT_PUBLIC_F_APPID,
    measurementId: process.env.NEXT_PUBLIC_F_MEASUREMENTID
});

// Export Auth Object
export const auth = getAuth(app);
// Setup tenant id
// auth.tenantId = process.env.NEXT_PUBLIC_F_TENANTID;

export const fetcher = async (...args) => {
    try {
        
        const currentUser =  getAuth()?.currentUser;
        let token;
        if(currentUser) token = await getIdToken(currentUser, true);
        
        return fetch(...args, {
            method: 'GET',
            headers: { Authorization: token ? `Bearer ${token}` : null }
        }).then(res => res.json())
        .catch(err => console.error('fetcher: ', err));
    } catch(err) {
        console.error('fetcher: ', err);
    }
};