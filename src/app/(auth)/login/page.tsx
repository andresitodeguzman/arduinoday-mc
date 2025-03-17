'use client';
import { useAuthStore } from '@/utils/auth';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';

export default function Page() {
    const authStore = useAuthStore();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const FormikObj = {
        initialValues: {
            email: '',
            password: ''
        },
        validationSchema: Yup.object().shape({
            email: Yup.string().min(2).required('Email is Required'),
            password: Yup.string().min(2).required('Password is Required')
        }),
        onSubmit: async (values: any) => {
            setIsLoading(true); // ✅ Show loader
            await authStore.loginWithEmailPassword(values.email, values.password);
            
            if (authStore.isLoggedIn) {
                router.push("/"); // ✅ Redirect to home on successful login
            }

            setIsLoading(false); // ✅ Hide loader after login attempt
        }
    };

    useEffect(() => {
        authStore.refresh();
    }, []);

    useEffect(() => {
        if (authStore.isLoggedIn) {
            router.push("/");
        }
    }, [authStore.isLoggedIn, router]);

    return (
        <div className="flex w-full h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
                <h2 className="text-center text-2xl font-bold text-gray-700 mb-6">Welcome Back</h2>

                {isLoading && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-white"></div>
                    </div>
                )}

                <Formik {...FormikObj}>
                    {() => (
                        <Form className="space-y-4">
                            <div>
                                <Field
                                    type="email"
                                    name="email"
                                    className="w-full rounded-full px-6 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm text-center transition"
                                    placeholder="Email Address"
                                />
                                <ErrorMessage name="email">
                                    {(msg) => (
                                        <div className="mt-2 bg-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-semibold">
                                            {msg}
                                        </div>
                                    )}
                                </ErrorMessage>
                            </div>
                            <div>
                                <Field
                                    type="password"
                                    name="password"
                                    className="w-full rounded-full px-6 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm text-center transition"
                                    autoComplete="current-password"
                                    placeholder="Password"
                                />
                                <ErrorMessage name="password">
                                    {(msg) => (
                                        <div className="mt-2 bg-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-semibold">
                                            {msg}
                                        </div>
                                    )}
                                </ErrorMessage>
                            </div>

                            {authStore.error && (
                                <div className="bg-red-500 text-white text-sm px-4 py-2 rounded-lg text-center">
                                    {authStore.error?.code}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full bg-blue-500 text-white font-bold px-6 py-3 rounded-full shadow-md hover:bg-blue-600 transition">
                                Login
                            </button>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
}