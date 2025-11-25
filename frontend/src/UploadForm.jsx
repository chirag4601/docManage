import { useState } from "react";
import { fetchWithAuth } from "./AuthContext";

const UploadForm = () => {
  const minTruckNumberLength =
    import.meta.env.VITE_TRUCK_NUMBER_MIN_LENGTH || 8;

  const [truckNumber, setTruckNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [fullImageIndex, setFullImageIndex] = useState(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages((prevImages) => [...prevImages, ...files]);
    e.target.value = "";
  };

  const removeImage = (indexToRemove) => {
    setImages((prevImages) =>
      prevImages.filter((_, index) => index !== indexToRemove)
    );
  };

  const getImagePreviewUrl = (file) => {
    return URL.createObjectURL(file);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!truckNumber.trim()) {
      newErrors.truckNumber = "Truck number is required";
    } else if (truckNumber.length < minTruckNumberLength) {
      newErrors.truckNumber = `Truck number must be at least ${minTruckNumberLength} characters`;
    }

    if (!date) {
      newErrors.date = "Date is required";
    }

    if (images.length === 0) {
      newErrors.images = "At least one image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("truck_number", truckNumber);
    formData.append("date", date);

    images.forEach((image, index) => {
      formData.append("images", image);
    });

    try {
      const response = await fetchWithAuth("/documents/upload/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      alert("Documents uploaded successfully!");

      setTruckNumber("");
      setDate(new Date().toISOString().split("T")[0]);
      setImages([]);
      setErrors({});
      e.target.reset();
    } catch (error) {
      alert("Error uploading documents: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              Upload Documents
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="truckNumber"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                🚛 Truck Number *
              </label>
              <input
                type="text"
                id="truckNumber"
                value={truckNumber}
                onChange={(e) => setTruckNumber(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none text-base ${
                  errors.truckNumber
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                placeholder="Enter truck number"
              />
              {errors.truckNumber && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.truckNumber}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="date"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                📅 Date *
              </label>
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all outline-none text-base ${
                  errors.date
                    ? "border-red-300 bg-red-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              />
              {errors.date && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.date}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="images"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                📎 Documents *
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl p-4 md:p-6 transition-all ${
                  errors.images
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 hover:border-blue-300 bg-gray-50 hover:bg-blue-50"
                }`}
              >
                <input
                  type="file"
                  id="images"
                  accept="image/*"
                  multiple
                  capture="environment"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  <svg
                    className="mx-auto h-10 w-10 md:h-12 md:w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-semibold text-blue-600">
                      Tap to upload
                    </span>{" "}
                    or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Images only (camera or gallery)
                  </p>
                </div>
              </div>
              {errors.images && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errors.images}
                </p>
              )}
              {images.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="mt-3 w-full p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="font-medium">
                      {images.length} file(s) selected - Click to preview
                    </span>
                  </p>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 md:py-4 px-6 rounded-xl font-semibold text-white text-base md:text-lg shadow-lg transform transition-all duration-200 ${
                isSubmitting
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-slate-600 to-blue-600 hover:from-slate-700 hover:to-blue-700 hover:shadow-xl active:scale-[0.98]"
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5 md:w-6 md:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Upload Documents
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Selected Images ({images.length})
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="grid grid-cols-1 gap-3">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <button
                      onClick={() => setFullImageIndex(index)}
                      className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-300 hover:border-blue-400 transition-colors"
                    >
                      <img
                        src={getImagePreviewUrl(image)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {image.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(image.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() => removeImage(index)}
                      className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {fullImageIndex !== null && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center p-4"
          onClick={() => setFullImageIndex(null)}
        >
          <button
            onClick={() => setFullImageIndex(null)}
            className="absolute top-4 right-4 p-2 bg-gray-900 bg-opacity-80 hover:bg-opacity-90 rounded-lg transition-colors shadow-lg"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          {fullImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullImageIndex(fullImageIndex - 1);
              }}
              className="absolute left-4 p-3 bg-gray-900 bg-opacity-80 hover:bg-opacity-90 rounded-lg transition-colors shadow-lg"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          {fullImageIndex < images.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullImageIndex(fullImageIndex + 1);
              }}
              className="absolute right-4 p-3 bg-gray-900 bg-opacity-80 hover:bg-opacity-90 rounded-lg transition-colors shadow-lg"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
          <div
            className="max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getImagePreviewUrl(images[fullImageIndex])}
              alt={`Full view ${fullImageIndex + 1}`}
              className="w-full h-full object-contain rounded-lg"
            />
            <p className="text-white text-center mt-4 text-sm">
              {fullImageIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadForm;
