import React, { useEffect } from 'react'
import { useNavigation } from 'react-router-dom';
import { collection,query,where, getDocs } from "firebase/firestore";
import { db } from '../service/firebaseConfig';

function MyTrips() {

    const navigation = useNavigation();

    useEffect(() => {
        GetUserTrips();
    },[])

    const GetUserTrips = async() => {
        const user = JSON.parse(localStorage.getItem('user'));
        console.log(user);
        if(!user) {
            navigation('/');
            return;
        }
        const q=query(collection (db,'AITrips'),where('userEmail','==',user?.email))
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        console.log(doc.id, " => ", doc.data());
});
    }
  return (
    <div>
      
    </div>
  )
}

export default MyTrips
