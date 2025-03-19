'use client';

import { useState, useRef, useEffect, useCallback } from "react"; // ✅ Import useCallback
import { useAuthStore } from '../utils/auth';
import Image from "next/image";
import { getFirestore, collection, getDocs, query, orderBy, limit, writeBatch, doc} from "firebase/firestore";
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community'; 
import { AgGridReact } from 'ag-grid-react';
import { useRouter } from "next/navigation"; // ✅ Import Next.js Router

ModuleRegistry.registerModules([AllCommunityModule]); // ✅ Removed SetFilterModule

export default function Home() {
    const authStore = useAuthStore();
    const db = getFirestore();
    const gridRef = useRef<any>(null); // Create reference for Ag-Grid
    const router = useRouter(); // ✅ Initialize router

    const [items, setItems] = useState<Record<string, any>[]>([]); // ✅ More specific type
    const [editedItems, setEditedItems] = useState<Record<string, any>>({});
    const [selectedRows, setSelectedRows] = useState<any[]>([]);
    const [newStatus, setNewStatus] = useState(""); // Holds new status from dropdown
    const [isColumnToggleOpen, setIsColumnToggleOpen] = useState(false); // Track toggle state
    const [isLoading, setIsLoading] = useState(false); // Add loading state
    const [showSaveMessage, setShowSaveMessage] = useState(false); // ✅ Added save message state
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false); // Added User Actions Dropdown
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({}); // Track status counts

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

    const getItems = useCallback(async () => { // ✅ Wrapped in useCallback
        setIsLoading(true); // Show loader
        const colRef = collection(db, "_arduinoday");

        const snap = await getDocs(
            query(colRef, orderBy('dateCreated', 'desc'), limit(5000)) 
        );

        const ar: any = [];
        snap.docs.forEach(item => {
            const data = item.data();
            if (!data.status) data.status = "PENDING"; // ✅ Ensure status is always present
            ar.push({ id: item.id, ...data });
        });

        setItems(ar);

        // Update status counts
        const counts = statusList.reduce((acc, status) => {
            acc[status] = ar.filter((item: any) => item.status === status).length;
            return acc;
        }, {} as Record<string, number>);
        setStatusCounts(counts);

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
    }, [db]); // ✅ Dependencies now properly handled

    useEffect(() => {
        if (!authStore?.user) {
            router.push("/login"); // ✅ Redirect to login page if not authenticated
        }
    }, [authStore, router]);

    useEffect(() => {
        getItems(); // ✅ Now stable inside useEffect
    }, [getItems]); // ✅ Dependency array fixed

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

    const exportApprovedToCSV = () => {
        const approvedUsers = items.filter(item => item.status === "APPROVED");

        if (approvedUsers.length === 0) {
            alert("No approved users to export.");
            return;
        }

        const csvHeader = ["ID", "First Name", "Last Name", "Email", "Status"];
        const csvRows = approvedUsers.map(user => [
            user.id,
            user.firstName || "",
            user.lastName || "",
            user.email || "",
            user.status
        ]);

        const csvContent = [csvHeader, ...csvRows].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "approved_users.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const toggleColumnVisibility: any = (field: string) => {
        setColDefs((prevColDefs) =>
            prevColDefs.map((col) =>
                col.field === field ? { ...col, hide: !col.hide } : col
            )
        );
    };

    const onColumnMoved = (params: any) => {
        if (!params.columnApi) return; // ✅ Ensure columnApi exists before calling

        const newColumnOrder = params.columnApi.getAllGridColumns().map((col: any) => ({
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
                    <div className="flex flex-col gap-4 p-4 bg-gray-100 shadow-md rounded-lg mb-6">
                        {/* Status Counters */}
                        <div className="flex flex-wrap gap-4">
                            {statusList.map((status) => (
                                <div key={status} className="bg-white p-3 rounded-lg shadow-md flex items-center">
                                    <span className="text-gray-700 font-semibold">{status}:</span>
                                    <span className="ml-2 text-blue-600 font-bold">{statusCounts[status] || 0}</span>
                                </div>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={commitChanges} 
                                    disabled={Object.keys(editedItems).length === 0 || isLoading} 
                                    className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md disabled:bg-gray-300 hover:bg-blue-700 transition">
                                    Commit Changes
                                </button>

                                <select 
                                    title="any"
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
                                <button 
                                    onClick={exportApprovedToCSV}
                                    className="bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-purple-700 transition"
                                >
                                    Export Approved Users (CSV)
                                </button>
                            </div>

                            <div>
                                {/* Toggle Columns Button */}
                                <button 
                                    onClick={() => setIsColumnToggleOpen(!isColumnToggleOpen)}
                                    className="bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-gray-800 transition"
                                    disabled={isLoading} 
                                >
                                    {isColumnToggleOpen ? "Hide Column Toggles ▲" : "Show Column Toggles ▼"}
                                </button>
                            </div>

                            {/* ✅ Restored User Menu */}
                            <div>
                                {authStore?.user && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                            className="flex items-center space-x-3 bg-gray-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-gray-800 transition">
                                            <Image 
                                                src={authStore?.user?.photoURL || "https://picsum.photos/200"} 
                                                alt="User Profile"
                                                width={40} 
                                                height={40} 
                                                className="w-8 h-8 rounded-full"
                                            />
                                            <span>{authStore?.user?.displayName || "User"}</span>
                                        </button>

                                        {isUserMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg">
                                                <button 
                                                    onClick={() => router.push("/logout")} 
                                                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-t-lg">
                                                    Logout
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                        </div>

                        
                    </div>

                    {isColumnToggleOpen && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 bg-gray-100 p-3 rounded-lg">
                            {colDefs.map((col) => (
                                <div key={col.field} className="flex items-center space-x-2">
                                    <input
                                        title="any"
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
