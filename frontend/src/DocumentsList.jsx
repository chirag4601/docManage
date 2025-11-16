import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchWithAuth } from "./AuthContext";

const DocumentsList = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ next: null, previous: null, count: 0 });
  
  const [filters, setFilters] = useState({
    truckNumber: "",
    startDate: "",
    endDate: "",
    fyFilter: ""
  });

  const getCurrentFY = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    if (month >= 3) {
      return { start: `${year}-04-01`, end: `${year + 1}-03-31`, label: `FY ${year}-${year + 1}` };
    } else {
      return { start: `${year - 1}-04-01`, end: `${year}-03-31`, label: `FY ${year - 1}-${year}` };
    }
  };

  const getLastFY = () => {
    const currentFY = getCurrentFY();
    const startYear = parseInt(currentFY.start.split('-')[0]);
    return { 
      start: `${startYear - 1}-04-01`, 
      end: `${startYear}-03-31`,
      label: `FY ${startYear - 1}-${startYear}`
    };
  };

  useEffect(() => {
    fetchDocuments();
  }, [filters]);

  const fetchDocuments = async (url = null) => {
    setLoading(true);
    try {
      let apiUrl = url || "/documents/";
      
      if (!url) {
        const params = new URLSearchParams();
        
        if (filters.truckNumber) {
          params.append('truck_number', filters.truckNumber);
        }
        if (filters.startDate) {
          params.append('date_from', filters.startDate);
        }
        if (filters.endDate) {
          params.append('date_to', filters.endDate);
        }
        
        const queryString = params.toString();
        if (queryString) {
          apiUrl = `/documents/?${queryString}`;
        }
      }
      
      const response = await fetchWithAuth(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch documents");
      const data = await response.json();
      
      const docArray = Array.isArray(data) ? data : data.results || [];
      setDocuments(docArray);
      setFilteredDocuments(docArray);
      
      if (data.next || data.previous || data.count !== undefined) {
        setPagination({
          next: data.next,
          previous: data.previous,
          count: data.count || docArray.length
        });
      }
    } catch (error) {
      alert("Error fetching documents: " + error.message);
      setDocuments([]);
      setFilteredDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFYFilter = (type) => {
    if (type === "current") {
      const fy = getCurrentFY();
      setFilters({ truckNumber: "", startDate: fy.start, endDate: fy.end, fyFilter: "current" });
    } else if (type === "last") {
      const fy = getLastFY();
      setFilters({ truckNumber: "", startDate: fy.start, endDate: fy.end, fyFilter: "last" });
    }
  };

  const clearFilters = () => {
    setFilters({
      truckNumber: "",
      startDate: "",
      endDate: "",
      fyFilter: ""
    });
  };
  
  const loadNextPage = () => {
    if (pagination.next) {
      const url = pagination.next.replace('http://localhost:8000/api', '');
      fetchDocuments(url);
    }
  };
  
  const loadPreviousPage = () => {
    if (pagination.previous) {
      const url = pagination.previous.replace('http://localhost:8000/api', '');
      fetchDocuments(url);
    }
  };

  const exportToPDF = async () => {
    const doc = new jsPDF();
    let yPosition = 20;
    
    doc.setFontSize(18);
    doc.text("DocManage - Document Report", 14, yPosition);
    yPosition += 10;
    
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, yPosition);
    yPosition += 8;
    
    if (filters.truckNumber) {
      doc.text(`Truck Number: ${filters.truckNumber}`, 14, yPosition);
      yPosition += 6;
    }
    if (filters.startDate || filters.endDate) {
      doc.text(`Date Range: ${filters.startDate || 'Start'} to ${filters.endDate || 'End'}`, 14, yPosition);
      yPosition += 6;
    }
    
    yPosition += 10;
    
    for (const document of filteredDocuments || []) {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text(`Truck: ${document.truck_number}`, 14, yPosition);
      yPosition += 7;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Date: ${new Date(document.date).toLocaleDateString()}`, 14, yPosition);
      yPosition += 5;
      doc.text(`Uploaded: ${new Date(document.created_at).toLocaleDateString()}`, 14, yPosition);
      yPosition += 8;
      
      for (const image of document.images || []) {
        try {
          const response = await fetch(image.image_url);
          const blob = await response.blob();
          
          const reader = new FileReader();
          await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve();
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          
          const imgData = reader.result;
          
          if (yPosition > 200) {
            doc.addPage();
            yPosition = 20;
          }
          
          const imgWidth = 180;
          const imgHeight = 120;
          
          doc.addImage(imgData, 'JPEG', 15, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
          
        } catch (error) {
          console.error('Failed to load image:', error);
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          doc.text(`Image: ${image.image_url}`, 14, yPosition);
          yPosition += 6;
          doc.setTextColor(0, 0, 0);
        }
      }
      
      yPosition += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, yPosition, 196, yPosition);
      yPosition += 10;
    }

    doc.save(`documents-${new Date().getTime()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto p-6 pt-12">
        <div className="text-center mb-10">
          <div className="inline-block">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-slate-700 to-blue-600 bg-clip-text text-transparent mb-2">
              DocManage
            </h1>
            <div className="h-1 bg-gradient-to-r from-slate-400 to-blue-500 rounded-full"></div>
          </div>
          <p className="text-gray-600 mt-4 text-lg">Document List & Reports</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🚛 Truck Number
              </label>
              <input
                type="text"
                value={filters.truckNumber}
                onChange={(e) => setFilters({ ...filters, truckNumber: e.target.value })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
                placeholder="Search truck..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📅 Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value, fyFilter: "" })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📅 End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value, fyFilter: "" })}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📊 Financial Year
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFYFilter("last")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filters.fyFilter === "last"
                      ? "bg-slate-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Last FY
                </button>
                <button
                  onClick={() => handleFYFilter("current")}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filters.fyFilter === "current"
                      ? "bg-slate-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Current FY
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
            >
              Clear Filters
            </button>
            <button
              onClick={async () => {
                try {
                  await exportToPDF();
                } catch (error) {
                  alert('Failed to export PDF: ' + error.message);
                }
              }}
              disabled={!Array.isArray(filteredDocuments) || filteredDocuments.length === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                !Array.isArray(filteredDocuments) || filteredDocuments.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-slate-600 to-blue-600 text-white hover:from-slate-700 hover:to-blue-700"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">
                Documents ({(filteredDocuments || []).length})
              </h3>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <svg className="animate-spin h-10 w-10 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-4 text-gray-600">Loading documents...</p>
            </div>
          ) : !Array.isArray(filteredDocuments) || filteredDocuments.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-4 text-gray-600 text-lg">No documents found</p>
              <p className="text-gray-500 text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Truck Number</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Images</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Uploaded On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(filteredDocuments || []).map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.truck_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(doc.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {doc.images.length} images
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => window.open(doc.images[0]?.image_url, '_blank')}
                          disabled={doc.images.length === 0}
                          className="text-blue-600 hover:text-blue-800 font-medium disabled:text-gray-400"
                        >
                          View Images
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {(pagination.next || pagination.previous) && (
          <div className="mt-6 flex items-center justify-between bg-white rounded-xl shadow-lg p-4">
            <button
              onClick={loadPreviousPage}
              disabled={!pagination.previous}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                pagination.previous
                  ? 'bg-gradient-to-r from-slate-600 to-blue-600 text-white hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            <span className="text-sm text-gray-600">
              Total: {pagination.count} documents
            </span>
            
            <button
              onClick={loadNextPage}
              disabled={!pagination.next}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                pagination.next
                  ? 'bg-gradient-to-r from-slate-600 to-blue-600 text-white hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Powered by DocManage &copy; 2025</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentsList;
