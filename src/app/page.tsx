'use client';

import { useState, useRef, useEffect } from "react"; // ✅ Import useEffect
import { useAuthStore } from '../utils/auth';
import Link from 'next/link';
import Image from "next/image";
import { getFirestore, collection, getDocs, query, orderBy, limit, startAfter, writeBatch, doc} from "firebase/firestore";
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community'; 
import { AgGridReact } from 'ag-grid-react';
import { useRouter } from "next/navigation"; // ✅ Import Next.js Router

ModuleRegistry.registerModules([AllCommunityModule]); // ✅ Removed SetFilterModule

export default function Home() {
    const authStore = useAuthStore();
    const db = getFirestore();
    const gridRef = useRef<any>(null); // Create reference for Ag-Grid
    const router = useRouter(); // ✅ Initialize router

    const [items, setItems] = useState(null);
    const [editedItems, setEditedItems] = useState<Record<string, any>>({});
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [newStatus, setNewStatus] = useState(""); // Holds new status from dropdown
    const [isColumnToggleOpen, setIsColumnToggleOpen] = useState(false); // Track toggle state
    const [isLoading, setIsLoading] = useState(false); // Add loading state
    const [showSaveMessage, setShowSaveMessage] = useState(false); // ✅ Added save message state
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // Added User Actions Dropdown

    const statusList = [
        'PENDING', 'APPROVED', 'REJECTED', 'WAITLIST'
    ];
    
    // Column Definitions: Defines the columns to be displayed.
    const [colDefs, setColDefs] = useState<ColDef[]>([
        { field: "id", checkboxSelection: true }, // ✅ Checkbox only in the first column
        { field: "status", editable: true, cellEditor: "agSelectCellEditor", cellEditorParams: { values: statusList }, filter: "agTextColumnFilter" },
        { field: "firstName" },
        { field: "lastName" },
        { field: "email" }
    ]);

    const getItems = async () => {
        setIsLoading(true); // Show loader
        const colRef = collection(db, "_arduinoday");

        const snap = await getDocs(
            query(colRef, orderBy('dateCreated', 'desc'), limit(5000)) 
        );

        const ar: any = [];
        snap.docs.map(item => {
            const data = item.data();
            if (!data.status) data.status = "PENDING"; // ✅ Ensure status is always present
            ar.push({ id: item.id, ...data });
        });

        setItems(ar);

        if (ar.length !== 0) {
            const predefinedOrder = ["id", "status", "firstName", "lastName", "email"];
            const remainingFields = Object.keys(ar[0]).filter(key => !predefinedOrder.includes(key));

            setColDefs([
                ...predefinedOrder.map(field => ({
                    field,
            ...(field === "status"
                        ? { 
                            editable: true,
                            cellEditor: "agSelectCellEditor",
                            cellEditorParams: { values: statusList },
                            filter: "agTextColumnFilter"
                          }
                        : {}
                    )
                })),
                ...remainingFields.map(field => ({ field }))
            ]);
        }
        setIsLoading(false); // Hide loader
    };

    useEffect(() => {
        if (!authStore?.user) {
            router.push("/login"); // ✅ Redirect to login page if not authenticated
        }
    }, [authStore, router]);

    useEffect(() => {
        getItems(); // ✅ Fetch data when component loads
    }, []); // ✅ Runs only once when the component mounts

    const onCellValueChanged = (params: any) => {
        const { id } = params.data;
        const newValue = params.data;
    
        setEditedItems(prev => ({
            ...prev,
            [id]: newValue // Store the modified row data
        }));
    
        // Apply the change to Ag-Grid for instant feedback
        params.api.applyTransaction({
            update: [newValue]
        });
    
        console.log("Pending changes:", editedItems);
    };

    const commitChanges = async () => {
        setIsLoading(true); // Show loader
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

            // ✅ Show feedback message
            setShowSaveMessage(true);
            setTimeout(() => setShowSaveMessage(false), 3000); // Hide after 3s
        } catch (error) {
            console.error("Error committing changes:", error);
        }
        setIsLoading(false); // Hide loader
    };

    const updateSelectedStatuses = () => {
        if (!newStatus || !gridRef.current?.api) return;
    
        const updatedRows = selectedRows.map(row => ({
            ...row,
            status: newStatus
        }));
    
        setEditedItems(prev => ({
            ...prev,
            ...Object.fromEntries(updatedRows.map(row => [row.id, row]))
        }));
    
        gridRef.current.api.applyTransaction({
            update: updatedRows
        });
    
        console.log("Updated statuses:", updatedRows);
    };

    const toggleColumnVisibility = (field: string) => {
        setColDefs((prevColDefs) =>
            prevColDefs.map((col) =>
                col.field === field ? { ...col, hide: !col.hide } : col
            )
        );
    };

    const onColumnMoved = (params: any) => {
        const newColumnOrder = params.columnApi.getAllGridColumns().map(col => ({
            field: col.getColId()
        }));
        setColDefs(newColumnOrder);
    };
    
    return (
        <>
            {isLoading && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-white"></div>
                </div>
            )}
            {
                !authStore?.user ?
                null :
                <>
                    <div className="flex flex-wrap items-center justify-between p-4 bg-gray-100 shadow-md rounded-lg mb-6">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className="flex items-center space-x-3 bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-gray-800 transition w-auto">
                                <Image 
                                    src={authStore?.user?.photoURL || "https://picsum.photos/200"} 
                                    alt="User Profile"
                                    width={40}
                                    height={40}
                                    className="w-10 h-10 rounded-full object-cover bg-gray-300"
                                />
                                {/* <span className="truncate max-w-[100px]">{authStore?.user?.displayName || "User"}</span> */}
                            </button>

                                {isUserMenuOpen && (
                                <div className="absolute top-full left-2 mt-2 min-w-[150px] bg-white border rounded-lg shadow-lg z-50">
                                        <button 
                                            onClick={() => router.push("/logout")}  // ✅ Redirect to logout page
                                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-t-lg">
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={commitChanges} 
                                disabled={Object.keys(editedItems).length === 0 || isLoading} 
                                className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md disabled:bg-gray-300 hover:bg-blue-700 transition">
                                Commit Changes
                            </button>

                            <select 
                                className="border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-400 transition"
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                disabled={isLoading} 
                            >
                                <option value="">Select New Status</option>
                                {statusList.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>

                            <button 
                                onClick={updateSelectedStatuses} 
                                disabled={selectedRows.length === 0 || !newStatus || isLoading} 
                                className="bg-green-500 text-white font-semibold px-6 py-3 rounded-lg shadow-md disabled:bg-gray-300 hover:bg-green-600 transition">
                                Update Status
                            </button>
                        </div>

                        <button 
                            onClick={() => setIsColumnToggleOpen(!isColumnToggleOpen)}
                            className="bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-gray-800 transition"
                            disabled={isLoading} 
                        >
                            {isColumnToggleOpen ? "Hide Column Toggles ▲" : "Show Column Toggles ▼"}
                        </button>
                    </div>

                    {isColumnToggleOpen && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 bg-gray-100 p-3 rounded-lg">
                            {colDefs.map((col) => (
                                <div key={col.field} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={!col.hide} 
                                        onChange={() => toggleColumnVisibility(col.field)}
                                        className="w-5 h-5 accent-blue-500"
                                        disabled={isLoading} 
                                    />
                                    <span className="text-gray-700 font-medium">{col.field}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {showSaveMessage && ( // ✅ Added save confirmation message
                        <div className="fixed top-5 right-5 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
                            Changes successfully saved!
                        </div>
                    )}

                    <div className="h-[90vh] p-4 bg-white shadow-md rounded-lg"> {/* ✅ Added padding and styling */}
                        <AgGridReact
                            ref={gridRef}
                            onGridReady={(params) => {
                            gridRef.current = params.api ? { api: params.api } : null;
                            }}
                            onColumnMoved={onColumnMoved} // ✅ Track column movement
                            onCellValueChanged={onCellValueChanged}
                            getRowId={(item) => item.data?.id}
                            rowData={items}
                            columnDefs={colDefs} // ✅ Uses updated colDefs
                            rowSelection="multiple" // ✅ Allow multi-select
                            defaultColDef={{
                                sortable: true,
                                filter: true,
                                editable: true,
                                resizable: true,
                                suppressMovable: false, // ✅ Allow column movement
                            }}
                            onSelectionChanged={(event) =>
                                setSelectedRows(event.api.getSelectedNodes().map(node => node.data))
                            }
                        />
                    </div>
                </>
            }
        </>
    );
}
