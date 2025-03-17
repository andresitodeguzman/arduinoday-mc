# 🚀 Arduinoday MC Dashboard

## 📖 Overview
This project is a **dashboard application** built using:
- **Next.js** (React Framework)
- **Firebase Firestore** (Database)
- **Ag-Grid** (Table Data Management)
- **Tailwind CSS** (UI Styling)

The dashboard allows **authenticated users** to:
✅ View and manage records from Firestore  
✅ Edit and update statuses directly in the grid  
✅ Commit bulk updates to Firestore  
✅ Toggle column visibility  
✅ Handle authentication (login/logout)

---

## 📂 Folder Structure
```
/src
 ├── app/
 │    ├── page.tsx          # Main Dashboard Page (This File)
 │    ├── (auth)/           # Authentication Pages
 │    │    ├── login/page.tsx    # Login Page
 │    │    ├── logout/page.tsx   # Logout Page
 │    ├── utils/
 │    │    ├── auth.ts        # Firebase Authentication Logic
 │    ├── components/
 │    │    ├── ProcessingView.tsx  # UI Loader Component
 │    ├── styles/
 │    ├── public/
 │
 ├── firebase.json
 ├── package.json
 ├── next.config.js
```

---

## 🛠️ Technologies Used
| Tech | Purpose |
|------|---------|
| **Next.js** | React framework for SSR & routing |
| **Firebase Firestore** | Cloud NoSQL database |
| **Firebase Auth** | User authentication |
| **Ag-Grid** | Advanced table management |
| **Tailwind CSS** | Modern styling |

---

## 🚀 Features
### 🔹 Authentication System
- Uses Firebase Authentication.
- Redirects unauthenticated users to `/login`.
- Provides a user profile menu with a logout option.

### 🔹 Data Fetching & Display
- Fetches records from Firestore `_arduinoday` collection.
- Displays records in an **Ag-Grid table**.
- Ensures **status** column is always present.

### 🔹 Data Editing & Updates
- Allows users to **edit the status field** using a dropdown.
- Stores **pending edits locally** before committing them.
- Updates Firestore when "Commit Changes" is clicked.

### 🔹 Column Customization
- Users can **toggle column visibility** dynamically.
- Allows **column reordering** with drag-and-drop.

### 🔹 UI Enhancements
- **Loading indicator** when fetching data.
- **Save confirmation message** after committing changes.
- **Dropdown menu** for user actions.

---

## 📜 Code Documentation

### 🔑 Authentication Handling
```tsx
useEffect(() => {
    if (!authStore?.user) {
        router.push("/login"); // ✅ Redirect to login if not authenticated
    }
}, [authStore, router]);
```

### 🔑 Firestore Data Fetching
```tsx
const getItems = async () => {
    setIsLoading(true);
    const colRef = collection(db, "_arduinoday");

    const snap = await getDocs(
        query(colRef, orderBy('dateCreated', 'desc'), limit(5000))
    );

    const ar: any = snap.docs.map(item => {
        const data = item.data();
        if (!data.status) data.status = "PENDING";
        return { id: item.id, ...data };
    });

    setItems(ar);
    setIsLoading(false);
};
```

### 🔑 Updating Firestore (Bulk Commit)
```tsx
const commitChanges = async () => {
    setIsLoading(true);
    const db = getFirestore();
    const batch = writeBatch(db); 

    Object.values(editedItems).forEach((item: any) => {
        const docRef = doc(db, "_arduinoday", item.id);
        batch.update(docRef, { status: item.status }); 
    });

    try {
        await batch.commit(); 
        console.log("Changes successfully saved to Firestore");
        setEditedItems({}); 

        setShowSaveMessage(true);
        setTimeout(() => setShowSaveMessage(false), 3000);
    } catch (error) {
        console.error("Error committing changes:", error);
    }
    setIsLoading(false);
};
```

---

## 🔧 Installation
### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourrepo/arduinoday-mc.git
cd arduinoday-mc
npm install
```

### 2️⃣ Firebase Configuration
Set up Firebase **Firestore and Authentication** in your `.env.local` file:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

### 3️⃣ Run the Development Server
```bash
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

---

## ⚠️ Security Considerations
- Ensure **Firestore rules** are correctly set to **prevent unauthorized access**.
- **Sanitize user input** before sending it to Firestore.
- Use **Firebase Authentication** to restrict access to admin-only actions.

---

## 💡 Future Enhancements
✅ Add **role-based permissions** (Admin vs. User views).  
✅ Implement **pagination** for large datasets.  
✅ Improve **UI/UX with animations & themes**.  
✅ Add **real-time updates** instead of reloading data manually.  

---

## 📬 Need Help?
For any issues or contributions, feel free to open a GitHub issue or reach out. 🚀🎯
