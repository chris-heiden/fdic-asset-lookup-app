// Import the axios library for HTTP requests
const axios = require('axios');

exports.main = async (context = {}, sendResponse) => {
  console.log('getFDICAssetSize function called with context:', context);
  
  const { rssdId } = context.parameters || {};

  if (!rssdId) {
    console.error('RSSD ID is missing from parameters');
    return sendResponse({
      success: false,
      message: 'RSSD ID is required'
    });
  }

  try {
    console.log(`Looking up institution with RSSD ID: ${rssdId}`);
    
    // Step 1: Get CERT from RSSD ID using FDIC API
    const institutionResponse = await axios.get(
      'https://banks.data.fdic.gov/api/institutions',
      {
        params: {
          filters: `RSSD:${rssdId}`,
          fields: 'CERT,NAME',
          format: 'json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log('Institution API response:', institutionResponse.data);

    if (!institutionResponse.data?.data || institutionResponse.data.data.length === 0) {
      console.log('No institution found for RSSD ID:', rssdId);
      return sendResponse({
        success: false,
        message: `No institution found with RSSD ID: ${rssdId}`
      });
    }

    const cert = institutionResponse.data.data[0].CERT;
    const institutionName = institutionResponse.data.data[0].NAME;
    
    console.log(`Found institution: ${institutionName} with CERT: ${cert}`);

    // Step 2: Get latest financial data using CERT
    const financialResponse = await axios.get(
      'https://banks.data.fdic.gov/api/financials',
      {
        params: {
          filters: `CERT:${cert}`,
          fields: 'REPDTE,ASSET',
          sort_by: 'REPDTE',
          sort_order: 'DESC',
          limit: 1,
          format: 'json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    console.log('Financial API response:', financialResponse.data);

    if (!financialResponse.data?.data || financialResponse.data.data.length === 0) {
      console.log('No financial data found for CERT:', cert);
      return sendResponse({
        success: false,
        message: `No financial data found for institution with CERT: ${cert}`
      });
    }

    const latestData = financialResponse.data.data[0];
    const assetSize = latestData.ASSET; // Asset size in thousands of dollars
    const reportDate = latestData.REPDTE;

    console.log(`Asset size found: ${assetSize} (thousands), Report date: ${reportDate}`);

    const responseData = {
      rssdId: rssdId,
      cert: cert,
      institutionName: institutionName,
      assetSize: assetSize * 1000, // Convert from thousands to actual dollars
      reportDate: reportDate,
      queryDate: new Date().toISOString().split('T')[0] // Current date in YYYY-MM-DD format
    };

    console.log('Sending successful response:', responseData);

    return sendResponse({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error in getFDICAssetSize function:', error);
    
    let errorMessage = 'Failed to fetch data from FDIC API';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout - FDIC API took too long to respond';
    } else if (error.response) {
      errorMessage = `FDIC API Error: ${error.response.status} - ${error.response.statusText}`;
      console.error('API Error Response:', error.response.data);
    } else if (error.request) {
      errorMessage = 'Network error - unable to reach FDIC API';
      console.error('Network Error:', error.request);
    } else {
      console.error('General Error:', error.message);
    }

    return sendResponse({
      success: false,
      message: errorMessage
    });
  }
};
