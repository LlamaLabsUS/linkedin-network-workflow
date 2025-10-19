import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [user, setUser] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const router = useRouter();

  // LinkedIn OAuth login
  const handleLinkedInLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + '/api/auth/linkedin/callback');
    const scope = encodeURIComponent('r_liteprofile r_emailaddress');
    
    const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = linkedinUrl;
  };

  // Handle CSV file upload
  const handleFileUpload = async (event) => {
    event.preventDefault();
    if (!csvFile || !companyName) {
      setUploadStatus('Please select a file and enter company name');
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', csvFile);
    formData.append('companyName', companyName);
    formData.append('userId', user.id);

    try {
      setUploadStatus('Uploading and processing...');
      const response = await fetch('/api/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setUploadStatus(`Successfully processed ${result.recordsProcessed} connections`);
      } else {
        setUploadStatus('Error: ' + result.error);
      }
    } catch (error) {
      setUploadStatus('Upload failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            LinkedIn Network Workflow
          </h1>
        </div>

        {!user ? (
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <p className="mb-6 text-gray-600">
                Connect your LinkedIn account to get started
              </p>
              <button
                onClick={handleLinkedInLogin}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Login with LinkedIn
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Welcome, {user.name}!
              </h2>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your company name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  LinkedIn Connections CSV
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Export your LinkedIn connections as CSV from LinkedIn
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Upload & Process CSV
              </button>
            </form>

            {uploadStatus && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">{uploadStatus}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}