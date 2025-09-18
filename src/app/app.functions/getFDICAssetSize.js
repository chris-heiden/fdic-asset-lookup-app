const axios = require('axios');

exports.main = async (context = {}, sendResponse) => {
  const { rssdId } = context.parameters;

  if (!rssdId) {
    return sendResponse({
      success: false,
      message: 'RSSD ID is required'
    });
  }

  try {
    // Step 1: Get CERT from RSSD ID using FDIC API
    const institutionResponse = await axios.get(
      `https://banks.data.fdic.gov/api/institutions`,
      {
        params: {
          filters: `RSSD:${rssdId}`,
          fields: 'CERT,NAME',
          format: 'json'
        }
      }
    );

    if (!institutionResponse.data || !institutionResponse.data.data || institutionResponse.data.data.length === 0) {
      return sendResponse({
        success: false,
        message: 'No institution found with the provided RSSD ID'
      });
    }

    const cert = institutionResponse.data.data[0].CERT;
    const institutionName = institutionResponse.data.data[0].NAME;

    // Step 2: Get latest financial data using CERT
    const financialResponse = await axios.get(
      `https://banks.data.fdic.gov/api/financials`,
      {
        params: {
          filters: `CERT:${cert}`,
          fields: 'REPDTE,ASSET',
          sort_by: 'REPDTE',
          sort_order: 'DESC',
          limit: 1,
          format: 'json'
        }
      }
    );

    if (!financialResponse.data || !financialResponse.data.data || financialResponse.data.data.length === 0) {
      return sendResponse({
        success: false,
        message: 'No financial data found for this institution'
      });
    }

    const latestData = financialResponse.data.data[0];
    const assetSize = latestData.ASSET; // Asset size in thousands of dollars
    const reportDate = latestData.REPDTE;

    return sendResponse({
      success: true,
      data: {
        rssdId: rssdId,
        cert: cert,
        institutionName: institutionName,
        assetSize: assetSize * 1000, // Convert from thousands to actual dollars
        reportDate: reportDate,
        queryDate: new Date().toISOString().split('T')[0] // Current date
      }
    });

  } catch (error) {
    console.error('Error fetching FDIC data:', error);
    
    let errorMessage = 'Failed to fetch data from FDIC API';
    if (error.response) {
      errorMessage = `FDIC API Error: ${error.response.status} - ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = 'Network error - unable to reach FDIC API';
    }

    return sendResponse({
      success: false,
      message: errorMessage
    });
  }
};