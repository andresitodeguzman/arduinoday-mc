import { create } from "zustand";
import { persist } from "zustand/middleware";
import { auth } from './firebase';
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";

export const useAuthStore = create(persist((set, get) => ({
    isLoggedIn: false,
    isLoading: false,
    user: null,
    error: null,

    refresh: () => {
        set({
            error: null,
            isLoading: false
        })
    },

    loginWithEmailPassword: async (email, password) => {
        set({ isLoading: true, isLoggedIn: false, user: null, error: null });

        try {
            await setPersistence(auth, browserLocalPersistence);
            const result = await signInWithEmailAndPassword(auth, email, password);

            if (result?.user) {
                set({
                    user: result.user.toJSON(),
                    isLoggedIn: true,
                    error: null
                });
            }
        } catch (err) {
            console.error("Login error:", err);
            set({ error: err, isLoading: false });
        }

        set({ isLoading: false });
    },

    logout: async () => {
        set({ isLoading: true }); // ✅ Set loading state

        try {
            await signOut(auth); // ✅ Properly sign out user
            set({
                isLoading: false,
                isLoggedIn: false, // ✅ Ensure user is marked as logged out
                user: null, // ✅ Clear user data
                error: null
            });
            localStorage.removeItem('arduinoday-mc'); // ✅ Ensure local storage is cleared
        } catch (err) {
            console.error("Logout error:", err);
            set({ isLoading: false });
        }
    }
}), { name: 'arduinoday-mc' }));